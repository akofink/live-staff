import { toDisplayPitch } from "./displayPitch";
import type { InstrumentDefinition } from "./instruments";

/** Both views start from the same concert MIDI, never from the other written pitch. */
export function coachPitches(
  concertMidi: number,
  player: InstrumentDefinition,
  target: InstrumentDefinition,
) {
  return {
    player: toDisplayPitch(concertMidi, player.writtenToConcertSemitones === 0 ? "concert" : "written", player),
    target: toDisplayPitch(concertMidi, "written", target),
  };
}
