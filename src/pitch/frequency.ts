/** Converts a frequency to fractional MIDI using the configured A4 reference. */
export function frequencyToMidi(frequencyHz: number, a4Hz = 440): number {
  if (frequencyHz <= 0 || a4Hz <= 0) {
    throw new RangeError("Frequency and A4 reference must be positive.");
  }

  return 69 + 12 * Math.log2(frequencyHz / a4Hz);
}

/** Converts MIDI to equal-tempered frequency using the configured A4 reference. */
export function midiToFrequency(midi: number, a4Hz = 440): number {
  if (!Number.isFinite(midi) || a4Hz <= 0) {
    throw new RangeError("MIDI must be finite and A4 reference must be positive.");
  }

  return a4Hz * 2 ** ((midi - 69) / 12);
}
