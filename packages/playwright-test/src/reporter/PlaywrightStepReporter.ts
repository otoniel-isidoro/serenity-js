import { TestError, TestInfo } from '@playwright/test';
import { Stage, StageCrewMember } from '@serenity-js/core';
import {
    ActivityRelatedArtifactGenerated,
    AsyncOperationAborted,
    AsyncOperationAttempted,
    AsyncOperationCompleted,
    AsyncOperationFailed,
    DomainEvent,
    InteractionFinished,
    InteractionStarts,
    TaskFinished,
    TaskStarts,
} from '@serenity-js/core/lib/events';
import { FileSystemLocation, Path } from '@serenity-js/core/lib/io';
import { ActivityDetails, CorrelationId, Description, Name, Photo, ProblemIndication } from '@serenity-js/core/lib/model';
import { Photographer } from '@serenity-js/web';
import { SceneTagged } from '@serenity-js/core/src/events';

const genericPathToPhotographer = Path.from(require.resolve('@serenity-js/web'))

// https://github.com/microsoft/playwright/blob/04f77f231981780704a3a5e2cea93e3c420809a0/packages/playwright-test/types/testReporter.d.ts#L524
interface Location {
    /**
     * Path to the source file.
     */
    file: string;

    /**
     * Line number in the source file.
     */
    line: number;

    /**
     * Column number in the source file.
     */
    column: number;
}

// https://github.com/microsoft/playwright/blob/04f77f231981780704a3a5e2cea93e3c420809a0/packages/playwright-test/src/types.ts#L30
interface TestStepInternal {
    complete(result: { error?: Error | TestError }): void;

    title: string;
    category: string;
    canHaveChildren: boolean;
    forceNoParent: boolean;
    location?: Location;
    refinedTitle?: string;
}

export class PlaywrightStepReporter implements StageCrewMember {

    private readonly steps: Map<string, TestStepInternal> = new Map();

    constructor(
        private readonly testInfo: TestInfo,
        private stage?: Stage,
    ) {
    }

    assignedTo(stage: Stage): StageCrewMember {
        this.stage = stage;

        return this;
    }

    notifyOf(event: DomainEvent): void {

        if (event instanceof TaskStarts) {
            this.steps.set(event.activityId.value, this.createStep(event.details, 'task'));
        }

        if (event instanceof InteractionStarts) {
            this.steps.set(event.activityId.value, this.createStep(event.details, 'interaction'));
        }

        if (event instanceof AsyncOperationAttempted && event.name.value.startsWith(Photographer.name)) {
            this.steps.set(event.correlationId.value, this.createStep(new ActivityDetails(
                new Name(`${ Photographer.name }: ${ event.description.value }`),
                new FileSystemLocation(genericPathToPhotographer)
            ), 'crew'));
        }

        if (
            (event instanceof AsyncOperationCompleted || event instanceof AsyncOperationAborted)
            && this.steps.has(event.correlationId.value)
        ) {
            this.steps.get(event.correlationId.value).complete({ });
        }

        if (event instanceof AsyncOperationFailed && this.steps.has(event.correlationId.value)) {
            this.steps.get(event.correlationId.value).complete({ error: event.error });
        }

        if (event instanceof InteractionFinished || event instanceof TaskFinished) {
            if (event.outcome instanceof ProblemIndication) {
                this.steps.get(event.activityId.value).complete({ error: event.outcome.error });
            } else {
                this.steps.get(event.activityId.value).complete({});
            }
        }

        if (event instanceof ActivityRelatedArtifactGenerated && event.artifact instanceof Photo) {

            const id = CorrelationId.create();

            this.stage.announce(new AsyncOperationAttempted(
                new Name(this.constructor.name),
                new Description(`Attaching screenshot of '${ event.name.value }'...`),
                id,
                this.stage.currentTime(),
            ));

            this.testInfo.attach(event.name.value, { body: Buffer.from(event.artifact.base64EncodedValue, 'base64'), contentType: 'image/png' })
                .then(() => {
                    this.stage.announce(new AsyncOperationCompleted(
                        id,
                        this.stage.currentTime()
                    ));
                });
        }

        if (event instanceof SceneTagged) {
            this.testInfo.annotations.push({ type: event.tag.type, description: event.tag.name });
        }
    }

    private createStep(activityDetails: ActivityDetails, type: 'task' | 'interaction' | 'crew'): TestStepInternal {
        // https://github.com/microsoft/playwright/blob/04f77f231981780704a3a5e2cea93e3c420809a0/packages/playwright-test/src/expect.ts#L200-L206
        return (this.testInfo as any)._addStep({
            location: activityDetails.location
                ? { file: activityDetails.location.path.value, line: activityDetails.location.line, column: activityDetails.location.column }
                : undefined,
            category: `serenity-js:${ type }`,
            title: activityDetails.name.value,
            canHaveChildren: true,
            forceNoParent: false,
        }) as TestStepInternal;
    }
}
