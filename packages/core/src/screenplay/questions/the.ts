import { asyncMap, ValueInspector } from '../../io';
import type { UsesAbilities } from '../abilities';
import type { QuestionAdapter } from '../Question';
import { Question } from '../Question';
import type { AnswersQuestions } from './AnswersQuestions';
import { Describable } from './Describable';
import type { DescriptionFormattingOptions } from './DescriptionFormattingOptions';

/**
 * Creates a single-line description of an {@apilink Activity} by transforming
 * a [template literal](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates),
 * parameterised with [primitive data types](https://developer.mozilla.org/en-US/docs/Glossary/Primitive),
 * [complex data structures](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#objects),
 * or any other {@apilink Answerable|Answerables}, into a {@link QuestionAdapter|`QuestionAdapter<string>`}
 * that can be used with {@apilink Task.where} and {@apilink Interaction.where} methods.
 *
 * ```ts
 * const dial = (phoneNumber: Answerable<string>) =>
 *  Task.where(the `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial('(555) 123-4567'),
 *   // reported as: Alice dials "(555) 123-4567"
 * )
 * ```
 *
 * ## Trimming the output
 *
 * Use {@apilink DescriptionFormattingOptions} to trim the descriptions of template parameters.
 * By default, the output is displayed in full.
 *
 * ```ts
 * import { actorCalled, Task, the } from '@serenity-js/core'
 *
 * const dial = (phoneNumber: Answerable<string>) =>
 *  Task.where(dial({ maxLength: 10 }) `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial('(555) 123-4567'),
 *   // reported as: Alice dials "(555) 123-...'
 * )
 * ```
 *
 * ## Using with Questions
 *
 * When `the` is parameterised with {@apilink Question|Questions},
 * it retrieves their description by calling {@apilink Question.describedBy}
 * in the context of the {@apilink Actor} performing the {@apilink Activity}.
 * 
 * ```ts
 * import { actorCalled, Question, Task, the } from '@serenity-js/core'
 *
 * const phoneNumber = (areaCode: string, centralOfficeCode: string, lineNumber: string) =>
 *  Question.about('phone number', actor => {
 *     return `(${ this.areaCode }) ${ this.centralOfficeCode }-${ this.lineNumber }`
 *   })
 * 
 * const dial = (phoneNumber: Answerable<string>) =>
 *  Task.where(dial({ maxLength: 10 }) `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial(phoneNumber('555', '123', '4567'),
 *   // reported as: Alice dials phone number
 * )
 * ```
 * 
 * If you'd like the question to be described using its formatted value instead of its description, use {@apilink Question.formattedValue}.
 *
 * ```ts
 * import { actorCalled, Question, Task, the } from '@serenity-js/core'
 *
 * const phoneNumber = (areaCode: string, centralOfficeCode: string, lineNumber: string) =>
 *   Question.about('phone number', actor => {
 *     return `(${ this.areaCode }) ${ this.centralOfficeCode }-${ this.lineNumber }`
 *   }).describedAs(Question.formattedValue())
 *
 * const dial = (phoneNumber: Answerable<string>) =>
 *  Task.where(dial({ maxLength: 10 }) `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial(phoneNumber('555', '123', '4567'),
 *   // reported as: Alice dials "(555) 123-4567"
 * )
 * ```
 *
 * ## Using with objects with a custom `toString` method
 *
 * When `the` is parameterised with objects that have
 * a custom [`toString()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/toString) method,
 * or {@link Answerable|Answerables} resolving to such objects, the `toString()` method is called to produce the resulting description.
 *
 * ```ts
 * import { actorCalled, description, Task } from '@serenity-js/core'
 *
 * class PhoneNumber {
 *   constructor(
 *     private readonly areaCode: string,
 *     private readonly centralOfficeCode: string,
 *     private readonly lineNumber: string,
 *   ) {}
 *
 *   toString() {
 *     return `(${ this.areaCode }) ${ this.centralOfficeCode }-${ this.lineNumber }`
 *   }
 * }
 *
 * const dial = (phoneNumber: Answerable<PhoneNumber>) =>
 *  Task.where(description `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial(new PhoneNumber('555', '123', '4567')),
 *   // reported as: Alice dials (555) 123-4567
 * )
 * ```
 *
 * ## Using with objects without a custom `toString` method
 *
 * When `the` is parameterised with complex objects that don't have a custom `toString()` method,
 * or {@link Answerable}s resolving to such objects,
 * the resulting description will contain a JSON-like string representation of the object.
 *
 * ```ts
 * import { actorCalled, description, Task } from '@serenity-js/core'
 *
 * interface PhoneNumber {
 *   areaCode: string;
 *   centralOfficeCode: string;
 *   lineNumber: string;
 * }
 *
 * const dial = (phoneNumber: Answerable<PhoneNumber>) =>
 *  Task.where(the `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial({ areaCode: '555', centralOfficeCode: '123', lineNumber: '4567' }),
 *   // reported as: Alice dials { areaCode: "555", centralOfficeCode: "123", lineNumber: "4567" }
 * )
 * ```
 *
 * ## Using with masked values
 *
 * When `the` is parameterised with {@apilink Masked} values,
 * the resulting description will contain a masked representation of the values.
 *
 * ```ts
 * import { actorCalled, description, Task } from '@serenity-js/core'
 *
 * const dial = (phoneNumber: Answerable<string>) =>
 *  Task.where(description `#actor dials ${ phoneNumber }`, /* *\/)
 *
 * await actorCalled('Alice').attemptsTo(
 *   dial(Masked.valueOf('(555) 123-4567')),
 *   // reported as: Alice dials [a masked value]
 * )
 * ```
 *
 * ## Learn more
 *
 * - {@apilink Answerable}
 * - {@apilink Question}
 * - {@apilink Question.describedAs}
 * - {@apilink QuestionAdapter}
 * - {@apilink Masked}
 *
 * @group Questions
 */
export function the(options: DescriptionFormattingOptions): (templates: TemplateStringsArray, ...placeholders: Array<any>) => QuestionAdapter<string>
export function the(templates: TemplateStringsArray, ...parameters: Array<any>): QuestionAdapter<string>
export function the(...args: any[]): any {
    return ValueInspector.isPlainObject(args[0])
        ? (templates: TemplateStringsArray, ...parameters: Array<any>) =>
            templateToQuestion(templates, parameters, args[0])
        : templateToQuestion(args[0], args.slice(1));
}

function templateToQuestion(templates: TemplateStringsArray, parameters: Array<any>, options?: DescriptionFormattingOptions): QuestionAdapter<string> {
    const description = interpolate(templates, parameters.map(parameter => Question.formattedValue(options).of(parameter)));

    return Question.about<string>(description, async (actor: AnswersQuestions & UsesAbilities & { name: string }) => {
        const descriptions = await asyncMap(parameters, parameter => {
            return parameter instanceof Describable
                ? parameter.describedBy(actor)
                : actor.answer(Question.formattedValue(options).of(parameter))
        });

        return interpolate(templates, descriptions);
    });
}

function interpolate(templates: TemplateStringsArray, parameters: Array<any>): string {
    return templates.flatMap((template, i) =>
        i < parameters.length
            ? [ template, parameters[i] ]
            : [ template ],
    ).join('');
}
