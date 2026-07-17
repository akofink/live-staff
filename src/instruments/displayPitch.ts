import { midiToNoteName } from "../pitch/note";
import type { InstrumentDefinition } from "./instruments";
import { concertToWrittenMidi } from "./transposition";

export type PitchRepresentation = "concert" | "written";

export interface DisplayPitch {
  readonly midi: number;
  readonly name: string;
}

/** Derives one rendered pitch from canonical concert MIDI without changing detector data. */
export function toDisplayPitch(
  concertMidi: number,
  pitchDisplay: PitchRepresentation,
  instrument: InstrumentDefinition,
): DisplayPitch {
  const midi = pitchDisplay === "written"
    ? concertToWrittenMidi(concertMidi, instrument)
    : concertMidi;

  return {
    midi,
    name: midiToNoteName(midi, pitchDisplay === "written" ? instrument.accidentalPreference : "sharp"),
  };
}
