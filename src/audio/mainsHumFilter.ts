export type MainsFrequencyHz = 50 | 60;

/** Removes a narrow, user-selected power-line frequency from successive PCM frames. */
export class MainsHumFilter {
  #frequencyHz: MainsFrequencyHz | undefined;
  #x1 = 0;
  #x2 = 0;
  #y1 = 0;
  #y2 = 0;

  setFrequency(frequencyHz: MainsFrequencyHz | undefined): void {
    if (frequencyHz === this.#frequencyHz) return;

    this.#frequencyHz = frequencyHz;
    this.reset();
  }

  process(frame: Float32Array, sampleRate: number): Float32Array {
    if (this.#frequencyHz === undefined) return frame;

    const omega = (2 * Math.PI * this.#frequencyHz) / sampleRate;
    const alpha = Math.sin(omega) / 60;
    const normalization = 1 + alpha;
    const b0 = 1 / normalization;
    const b1 = (-2 * Math.cos(omega)) / normalization;
    const b2 = b0;
    const a1 = b1;
    const a2 = (1 - alpha) / normalization;
    const filtered = new Float32Array(frame.length);

    for (let index = 0; index < frame.length; index += 1) {
      const input = frame[index];
      const output = b0 * input + b1 * this.#x1 + b2 * this.#x2 - a1 * this.#y1 - a2 * this.#y2;
      filtered[index] = output;
      this.#x2 = this.#x1;
      this.#x1 = input;
      this.#y2 = this.#y1;
      this.#y1 = output;
    }

    return filtered;
  }

  reset(): void {
    this.#x1 = 0;
    this.#x2 = 0;
    this.#y1 = 0;
    this.#y2 = 0;
  }
}
