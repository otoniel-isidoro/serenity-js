import { PerformsTasks, Task } from '../../../../../core/src/screenplay';
import { PlayAChord } from '../interactions';
import { MusicSheet } from '../MusicSheet';

export class PlayASong extends Task {
    static from(musicSheet: MusicSheet) {
        return new PlayASong(musicSheet);
    }

    constructor(private readonly musicSheet: MusicSheet) {
        super();
    }

    performAs(actor: PerformsTasks): PromiseLike<void> {
        return actor.attemptsTo(
            ...this.musicSheet.chords.map(chord => PlayAChord.of(chord)),
        );
    }
}
