interface PitchClass {
  readonly letter: string;
  readonly accidental?: "#";
}

const pitchClasses: readonly PitchClass[] = [
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

export interface TrebleNote {
  readonly key: string;
  readonly accidental?: "#";
}

/** Converts canonical concert MIDI into the pitch representation used by a treble staff renderer. */
export function concertMidiToTrebleNote(midi: number): TrebleNote {
  if (!Number.isInteger(midi)) {
    throw new RangeError("MIDI pitch must be an integer.");
  }

  const pitchClass = pitchClasses[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;

  return {
    key: `${pitchClass.letter}/${octave}`,
    ...(pitchClass.accidental ? { accidental: pitchClass.accidental } : {}),
  };
}
