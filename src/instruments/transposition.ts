import type { InstrumentDefinition } from "./instruments";

/** Converts canonical concert MIDI directly to the selected instrument's written MIDI. */
export function concertToWrittenMidi(
  concertMidi: number,
  instrument: InstrumentDefinition,
): number {
  return concertMidi - instrument.writtenToConcertSemitones;
}
