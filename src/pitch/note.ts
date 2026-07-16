const sharpNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

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
  const octave = Math.floor(midi / 12) - 1;

  return {
    midi,
    name: `${sharpNames[midi % 12]}${octave}`,
    frequencyHz,
    cents,
  };
}
