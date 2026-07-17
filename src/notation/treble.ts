import type { AccidentalPreference } from "../instruments/instruments";

interface PitchClass {
  readonly letter: string;
  readonly accidental?: "#" | "b";
}

const sharpPitchClasses: readonly PitchClass[] = [
  { letter: "c" },
  { letter: "c", accidental: "#" },
  { letter: "d" },
  { letter: "d", accidental: "#" },
  { letter: "e" },
  { letter: "f" },
  { letter: "f", accidental: "#" },
  { letter: "g" },
  { letter: "g", accidental: "#" },
  { letter: "a" },
  { letter: "a", accidental: "#" },
  { letter: "b" },
] as const;

const flatPitchClasses: readonly PitchClass[] = [
  { letter: "c" },
  { letter: "d", accidental: "b" },
  { letter: "d" },
  { letter: "e", accidental: "b" },
  { letter: "e" },
  { letter: "f" },
  { letter: "g", accidental: "b" },
  { letter: "g" },
  { letter: "a", accidental: "b" },
  { letter: "a" },
  { letter: "b", accidental: "b" },
  { letter: "b" },
] as const;

export interface TrebleNote {
  readonly key: string;
  readonly accidental?: "#" | "b";
}

/** Converts display MIDI into the pitch representation used by a treble staff renderer. */
export function midiToTrebleNote(midi: number, accidentalPreference: AccidentalPreference = "sharp"): TrebleNote {
  if (!Number.isInteger(midi)) {
    throw new RangeError("MIDI pitch must be an integer.");
  }

  const pitchClasses = accidentalPreference === "flat" ? flatPitchClasses : sharpPitchClasses;
  const pitchClass = pitchClasses[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;

  return {
    key: `${pitchClass.letter}/${octave}`,
    ...(pitchClass.accidental ? { accidental: pitchClass.accidental } : {}),
  };
}
