export type InputFilterBand =
  | { readonly id: string; readonly type: "highpass"; readonly enabled: boolean; readonly frequencyHz: number }
  | { readonly id: string; readonly type: "lowpass"; readonly enabled: boolean; readonly frequencyHz: number }
  | { readonly id: string; readonly type: "notch"; readonly enabled: boolean; readonly frequencyHz: number; readonly q: number; readonly attenuationDb: number };

export const maximumFilterBands = 4;
export const defaultNotch = { type: "notch", enabled: true, frequencyHz: 60, q: 20, attenuationDb: 18 } as const;

export interface BiquadCoefficients {
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly a1: number;
  readonly a2: number;
  readonly dry: number;
  readonly wet: number;
}

interface SectionState {
  id: string;
  signature: string;
  coefficients: BiquadCoefficients;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

export function isInputFilterBand(value: unknown): value is InputFilterBand {
  if (typeof value !== "object" || value === null) return false;
  const band = value as Record<string, unknown>;
  if (typeof band.id !== "string" || band.id.length > 40 || typeof band.enabled !== "boolean" || typeof band.frequencyHz !== "number") return false;
  if (band.type === "highpass") return band.frequencyHz >= 20 && band.frequencyHz <= 80;
  if (band.type === "lowpass") return band.frequencyHz >= 8_000 && band.frequencyHz <= 18_000;
  return band.type === "notch" && band.frequencyHz >= 40 && band.frequencyHz <= 4_000 &&
    typeof band.q === "number" && band.q >= 8 && band.q <= 30 &&
    typeof band.attenuationDb === "number" && band.attenuationDb >= 3 && band.attenuationDb <= 24;
}

export function coefficientsForBand(band: InputFilterBand, sampleRate: number): BiquadCoefficients {
  const q = band.type === "notch" ? band.q : Math.SQRT1_2;
  const omega = 2 * Math.PI * band.frequencyHz / sampleRate;
  const cosine = Math.cos(omega);
  const alpha = Math.sin(omega) / (2 * q);
  const a0 = 1 + alpha;
  let b0: number;
  let b1: number;
  let b2: number;
  if (band.type === "lowpass") {
    b0 = (1 - cosine) / 2;
    b1 = 1 - cosine;
    b2 = b0;
  } else if (band.type === "highpass") {
    b0 = (1 + cosine) / 2;
    b1 = -(1 + cosine);
    b2 = b0;
  } else {
    b0 = 1;
    b1 = -2 * cosine;
    b2 = 1;
  }
  const dry = band.type === "notch" ? 10 ** (-band.attenuationDb / 20) : 0;
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cosine) / a0, a2: (1 - alpha) / a0, dry, wet: 1 - dry };
}

export function filterResponseDb(bands: readonly InputFilterBand[], frequencyHz: number, sampleRate: number, bypassed = false): number {
  if (bypassed) return 0;
  let real = 1;
  let imaginary = 0;
  const omega = 2 * Math.PI * frequencyHz / sampleRate;
  const z1r = Math.cos(omega);
  const z1i = -Math.sin(omega);
  const z2r = Math.cos(2 * omega);
  const z2i = -Math.sin(2 * omega);
  for (const band of bands) {
    if (!band.enabled) continue;
    const c = coefficientsForBand(band, sampleRate);
    const numeratorReal = c.b0 + c.b1 * z1r + c.b2 * z2r;
    const numeratorImaginary = c.b1 * z1i + c.b2 * z2i;
    const denominatorReal = 1 + c.a1 * z1r + c.a2 * z2r;
    const denominatorImaginary = c.a1 * z1i + c.a2 * z2i;
    const divisor = denominatorReal ** 2 + denominatorImaginary ** 2;
    const sectionReal = c.dry + c.wet * ((numeratorReal * denominatorReal + numeratorImaginary * denominatorImaginary) / divisor);
    const sectionImaginary = c.wet * ((numeratorImaginary * denominatorReal - numeratorReal * denominatorImaginary) / divisor);
    [real, imaginary] = [real * sectionReal - imaginary * sectionImaginary, real * sectionImaginary + imaginary * sectionReal];
  }
  return 20 * Math.log10(Math.max(1e-12, Math.hypot(real, imaginary)));
}

export class InputFilterChain {
  #bands: readonly InputFilterBand[] = [];
  #states: SectionState[] = [];
  #output = new Float32Array(0);
  #sampleRate = 0;
  #bypassed = false;

  configure(bands: readonly InputFilterBand[], bypassed: boolean): void {
    const changed = JSON.stringify(bands) !== JSON.stringify(this.#bands) || bypassed !== this.#bypassed;
    this.#bands = bands;
    this.#bypassed = bypassed;
    if (changed) this.reset();
  }

  process(frame: Float32Array, sampleRate: number): Float32Array {
    if (this.#bypassed || !this.#bands.some((band) => band.enabled)) return frame;
    if (sampleRate !== this.#sampleRate) {
      this.#states = [];
      this.#sampleRate = sampleRate;
    }
    if (this.#output.length !== frame.length) this.#output = new Float32Array(frame.length);
    let source = frame;
    let sectionIndex = 0;
    for (const band of this.#bands) {
      if (!band.enabled) continue;
      const signature = JSON.stringify(band);
      let state = this.#states[sectionIndex];
      if (!state || state.id !== band.id || state.signature !== signature) {
        state = { id: band.id, signature, coefficients: coefficientsForBand(band, sampleRate), x1: 0, x2: 0, y1: 0, y2: 0 };
        this.#states[sectionIndex] = state;
      }
      const c = state.coefficients;
      for (let index = 0; index < frame.length; index += 1) {
        const input = source[index];
        const biquad = c.b0 * input + c.b1 * state.x1 + c.b2 * state.x2 - c.a1 * state.y1 - c.a2 * state.y2;
        this.#output[index] = c.dry * input + c.wet * biquad;
        state.x2 = state.x1; state.x1 = input; state.y2 = state.y1; state.y1 = biquad;
      }
      source = this.#output;
      sectionIndex += 1;
    }
    this.#states.length = sectionIndex;
    return this.#output;
  }

  reset(): void {
    this.#states = [];
  }
}
