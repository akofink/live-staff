import type { AccidentalPreference } from "../instruments/instruments";

const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const flatNames = ["C", "D-flat", "D", "E-flat", "E", "F", "G-flat", "G", "A-flat", "A", "B-flat", "B"];

export interface DetectedNote {
  readonly midi: number;
  readonly name: string;
  readonly frequencyHz: number;
  readonly cents: number;
}

export function frequencyToNote(frequencyHz: number, a4Hz = 440): DetectedNote {
  const fractionalMidi = 69 + 12 * Math.log2(frequencyHz / a4Hz);
  const midi = Math.round(fractionalMidi);
  const cents = Math.round((fractionalMidi - midi) * 100);

  return {
    midi,
    name: midiToNoteName(midi),
    frequencyHz,
    cents,
  };
}

/** Spells an integer MIDI pitch for display using the requested accidental preference. */
export function midiToNoteName(midi: number, accidentalPreference: AccidentalPreference = "sharp"): string {
  if (!Number.isInteger(midi)) {
    throw new RangeError("MIDI pitch must be an integer.");
  }

  const names = accidentalPreference === "flat" ? flatNames : sharpNames;
  const octave = Math.floor(midi / 12) - 1;
  return `${names[((midi % 12) + 12) % 12]}${octave}`;
}
