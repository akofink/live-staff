import type { PitchEstimate } from "../audio/detectors/autocorrelation";

export type BenchmarkDetector = (frame: Float32Array, sampleRate: number) => PitchEstimate | null;

const minimumHz = 55;
const maximumHz = 1_000;
const minimumRms = 0.01;

class ReusableFft {
  readonly real: Float64Array;
  readonly imaginary: Float64Array;
  private readonly reversed: Uint32Array;

  constructor(readonly size: number) {
    this.real = new Float64Array(size);
    this.imaginary = new Float64Array(size);
    this.reversed = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let index = 0; index < size; index += 1) {
      let value = index;
      let result = 0;
      for (let bit = 0; bit < bits; bit += 1) {
        result = (result << 1) | (value & 1);
        value >>>= 1;
      }
      this.reversed[index] = result;
    }
  }

  transform(frame: Float32Array) {
    for (let index = 0; index < this.size; index += 1) {
      const source = this.reversed[index];
      this.real[index] = source < frame.length
        ? frame[source] * (0.5 - 0.5 * Math.cos(2 * Math.PI * source / (frame.length - 1))) : 0;
      this.imaginary[index] = 0;
    }
    for (let width = 2; width <= this.size; width *= 2) {
      const half = width / 2;
      for (let start = 0; start < this.size; start += width) {
        for (let offset = 0; offset < half; offset += 1) {
          const angle = -2 * Math.PI * offset / width;
          const cosine = Math.cos(angle);
          const sine = Math.sin(angle);
          const right = start + offset + half;
          const real = this.real[right] * cosine - this.imaginary[right] * sine;
          const imaginary = this.real[right] * sine + this.imaginary[right] * cosine;
          const left = start + offset;
          this.real[right] = this.real[left] - real;
          this.imaginary[right] = this.imaginary[left] - imaginary;
          this.real[left] += real;
          this.imaginary[left] += imaginary;
        }
      }
    }
  }
}

const swipeFfts = new Map<number, ReusableFft>();

function spectralMagnitude(fft: ReusableFft, frequencyHz: number, sampleRate: number) {
  const position = frequencyHz * fft.size / sampleRate;
  const lower = Math.floor(position);
  if (lower < 1 || lower + 1 >= fft.size / 2) return 0;
  const fraction = position - lower;
  const magnitude = (index: number) => Math.sqrt(Math.hypot(fft.real[index], fft.imaginary[index]));
  return magnitude(lower) * (1 - fraction) + magnitude(lower + 1) * fraction;
}

function normalizedSpectralPeak(fft: ReusableFft, frequencyHz: number, sampleRate: number) {
  const center = spectralMagnitude(fft, frequencyHz, sampleRate);
  const spacing = Math.max(8, frequencyHz * 0.035);
  const background = (spectralMagnitude(fft, frequencyHz - spacing, sampleRate)
    + spectralMagnitude(fft, frequencyHz + spacing, sampleRate)) / 2;
  return center / (center + background + 1e-9);
}

/** Uses a bounded log-frequency grid with harmonic rewards and inter-harmonic negative evidence. */
export const detectSwipeLike: BenchmarkDetector = (frame, sampleRate) => {
  let energy = 0;
  for (const sample of frame) energy += sample * sample;
  if (Math.sqrt(energy / frame.length) < minimumRms) return null;
  const size = 2 ** Math.ceil(Math.log2(frame.length));
  let fft = swipeFfts.get(size);
  if (!fft) {
    fft = new ReusableFft(size);
    swipeFfts.set(size, fft);
  }
  fft.transform(frame);

  let bestMidi = 0;
  let bestScore = -Infinity;
  let totalWeight = 0;
  for (let harmonic = 1; harmonic <= Math.floor(sampleRate / (2 * minimumHz)); harmonic += 1) totalWeight += 1 / Math.sqrt(harmonic);
  for (let midi = 34; midi <= 83; midi += 1 / 24) {
    const fundamental = 440 * 2 ** ((midi - 69) / 12);
    let score = 0;
    let weight = 0;
    for (let harmonic = 1; harmonic * fundamental < sampleRate / 2; harmonic += 1) {
      const harmonicWeight = 1 / Math.sqrt(harmonic);
      score += harmonicWeight * spectralMagnitude(fft, harmonic * fundamental, sampleRate);
      if (harmonic > 1) score -= harmonicWeight * 0.55
        * spectralMagnitude(fft, (harmonic - 0.5) * fundamental, sampleRate);
      weight += harmonicWeight;
    }
    score /= weight || totalWeight;
    if (score > bestScore) [bestMidi, bestScore] = [midi, score];
  }
  const neighboring = spectralMagnitude(fft, 440 * 2 ** ((bestMidi - 69) / 12), sampleRate);
  const confidence = bestScore / (bestScore + neighboring + 1e-9);
  return bestScore > 0.01 ? { frequencyHz: 440 * 2 ** ((bestMidi - 69) / 12), confidence } : null;
};

const sieveFfts = new Map<number, ReusableFft>();

function harmonicAlignment(fft: ReusableFft, fundamental: number, sampleRate: number) {
  let weighted = 0;
  let totalWeight = 0;
  let covered = 0;
  const maximumHarmonic = Math.min(12, Math.floor(sampleRate / (2 * fundamental)));
  for (let harmonic = 1; harmonic <= maximumHarmonic; harmonic += 1) {
    const weight = 1 / Math.sqrt(harmonic);
    const peak = normalizedSpectralPeak(fft, harmonic * fundamental, sampleRate);
    weighted += weight * peak;
    totalWeight += weight;
    if (peak >= 0.62) covered += 1;
  }
  return weighted / totalWeight * Math.min(1, covered / 4);
}

/** Sieves bounded fundamentals using locally normalized partials and explicit lower-hypothesis evidence. */
export const detectHarmonicSieve: BenchmarkDetector = (frame, sampleRate) => {
  let energy = 0;
  for (const sample of frame) energy += sample * sample;
  if (Math.sqrt(energy / frame.length) < minimumRms) return null;
  const size = 2 ** Math.ceil(Math.log2(frame.length));
  let fft = sieveFfts.get(size);
  if (!fft) {
    fft = new ReusableFft(size);
    sieveFfts.set(size, fft);
  }
  fft.transform(frame);

  let bestFrequency = 0;
  let bestScore = -Infinity;
  let runnerUp = -Infinity;
  for (let midi = 34; midi <= 83; midi += 1 / 24) {
    const fundamental = 440 * 2 ** ((midi - 69) / 12);
    const alignment = harmonicAlignment(fft, fundamental, sampleRate);
    const half = fundamental / 2 >= minimumHz ? harmonicAlignment(fft, fundamental / 2, sampleRate) : 0;
    const third = fundamental / 3 >= minimumHz ? harmonicAlignment(fft, fundamental / 3, sampleRate) : 0;
    const score = alignment - 0.2 * Math.max(0, half - alignment * 0.72)
      - 0.12 * Math.max(0, third - alignment * 0.72);
    if (score > bestScore) {
      runnerUp = bestScore;
      [bestFrequency, bestScore] = [fundamental, score];
    } else if (score > runnerUp) runnerUp = score;
  }
  const confidence = Math.max(0, Math.min(1, 0.65 + (bestScore - runnerUp) * 4));
  return bestScore >= 0.42 ? { frequencyHz: bestFrequency, confidence } : null;
};

/** Implements MPM's NSDF, positive-lobe key maxima, and earliest relative cutoff peak. */
export const detectMpm: BenchmarkDetector = (frame, sampleRate) => {
  let energy = 0;
  for (const sample of frame) energy += sample * sample;
  if (Math.sqrt(energy / frame.length) < minimumRms) return null;

  const minimumLag = Math.floor(sampleRate / maximumHz);
  const maximumLag = Math.min(Math.floor(sampleRate / minimumHz), frame.length - 2);
  const nsdf = new Float64Array(maximumLag + 1);
  for (let lag = 0; lag <= maximumLag; lag += 1) {
    let correlation = 0;
    let divisor = 0;
    for (let index = 0; index < frame.length - lag; index += 1) {
      const left = frame[index];
      const right = frame[index + lag];
      correlation += left * right;
      divisor += left * left + right * right;
    }
    nsdf[lag] = divisor === 0 ? 0 : 2 * correlation / divisor;
  }

  let globalMaximum = 0;
  let firstQualifying = -1;
  const keyMaxima: number[] = [];
  let index = 1;
  while (index < maximumLag) {
    while (index < maximumLag && nsdf[index] <= 0) index += 1;
    if (index >= maximumLag) break;
    let maximum = -1;
    while (index < maximumLag && nsdf[index] > 0) {
      if (index >= minimumLag && (maximum < 0 || nsdf[index] > nsdf[maximum])) maximum = index;
      index += 1;
    }
    if (maximum >= minimumLag) {
      keyMaxima.push(maximum);
      globalMaximum = Math.max(globalMaximum, nsdf[maximum]);
    }
  }
  if (globalMaximum < 0.72) return null;
  for (const maximum of keyMaxima) {
    if (nsdf[maximum] >= globalMaximum * 0.93) {
      firstQualifying = maximum;
      break;
    }
  }
  if (firstQualifying <= 0 || firstQualifying >= maximumLag) return null;
  const before = nsdf[firstQualifying - 1];
  const peak = nsdf[firstQualifying];
  const after = nsdf[firstQualifying + 1];
  const divisor = before - 2 * peak + after;
  const offset = divisor === 0 ? 0 : 0.5 * (before - after) / divisor;
  return { frequencyHz: sampleRate / (firstQualifying + offset), confidence: peak };
};

function correlations(frame: Float32Array, sampleRate: number): { values: Float64Array; minimumLag: number } | null {
  let energy = 0;
  for (const sample of frame) energy += sample * sample;
  if (Math.sqrt(energy / frame.length) < minimumRms) return null;
  const minimumLag = Math.floor(sampleRate / maximumHz);
  const maximumLag = Math.min(Math.floor(sampleRate / minimumHz), frame.length - 2);
  const values = new Float64Array(maximumLag - minimumLag + 1);
  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let product = 0;
    let left = 0;
    let right = 0;
    for (let index = 0; index < frame.length - lag; index += 1) {
      product += frame[index] * frame[index + lag];
      left += frame[index] * frame[index];
      right += frame[index + lag] * frame[index + lag];
    }
    values[lag - minimumLag] = product / Math.sqrt(left * right);
  }
  return { values, minimumLag };
}

function interpolate(values: Float64Array, index: number, minimumLag: number, sampleRate: number, confidence: number): PitchEstimate {
  const before = values[index - 1];
  const peak = values[index];
  const after = values[index + 1];
  const divisor = before - 2 * peak + after;
  const offset = divisor === 0 ? 0 : 0.5 * (before - after) / divisor;
  return { frequencyHz: sampleRate / (minimumLag + index + offset), confidence };
}

/** Scores every local peak using agreement at two and three periods instead of accepting the first peak. */
export const detectMultiPeriod: BenchmarkDetector = (frame, sampleRate) => {
  const result = correlations(frame, sampleRate);
  if (!result) return null;
  const { values, minimumLag } = result;
  let best = -1;
  let bestScore = 0;
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] <= values[index - 1] || values[index] < values[index + 1]) continue;
    const lag = minimumLag + index;
    const score = values[index] * 0.65
      + (2 * lag - minimumLag < values.length ? values[2 * lag - minimumLag] * 0.25 : 0)
      + (3 * lag - minimumLag < values.length ? values[3 * lag - minimumLag] * 0.1 : 0);
    if (score > bestScore) [best, bestScore] = [index, score];
  }
  return best >= 0 && values[best] >= 0.72 && bestScore >= 0.66
    ? interpolate(values, best, minimumLag, sampleRate, Math.min(1, bestScore)) : null;
};

/** Selects a longer fundamental period only when octave and repeated-period evidence is stronger. */
export const detectFundamentalAware: BenchmarkDetector = (frame, sampleRate) => {
  const result = correlations(frame, sampleRate);
  if (!result) return null;
  const { values, minimumLag } = result;
  const first = values.findIndex((value, index) => index > 0 && index < values.length - 1
    && value >= 0.72 && value > values[index - 1] && value >= values[index + 1]);
  if (first < 0) return null;

  let selected = first;
  const firstLag = minimumLag + first;
  const expected = 2 * firstLag - minimumLag;
  if (expected < values.length - 1) {
    let candidate = expected;
    for (let index = Math.max(1, expected - 2); index <= Math.min(values.length - 2, expected + 2); index += 1) {
      if (values[index] > values[candidate]) candidate = index;
    }
    const candidateLag = minimumLag + candidate;
    const repeated = 2 * candidateLag - minimumLag;
    if (values[first] >= 0.9
      && values[candidate] >= values[first] + 0.08
      && values[candidate] >= 0.9
      && (repeated >= values.length || values[repeated] >= values[candidate] - 0.04)) {
      selected = candidate;
    }
  }
  return interpolate(values, selected, minimumLag, sampleRate, values[selected]);
};

/** A low-cost time-domain comb projection rewards repeated structure while penalizing half-period ambiguity. */
export const detectCombProjection: BenchmarkDetector = (frame, sampleRate) => {
  const result = correlations(frame, sampleRate);
  if (!result) return null;
  const { values, minimumLag } = result;
  let best = -1;
  let bestScore = 0;
  for (let index = 1; index < values.length - 1; index += 1) {
    const lag = minimumLag + index;
    const twice = 2 * lag - minimumLag;
    const half = Math.round(lag / 2) - minimumLag;
    const score = values[index] * 0.7 + (twice < values.length ? values[twice] * 0.35 : 0)
      - (half >= 0 ? Math.max(0, values[half] - values[index]) * 0.2 : 0);
    if (values[index] > values[index - 1] && values[index] >= values[index + 1] && score > bestScore) {
      [best, bestScore] = [index, score];
    }
  }
  return best >= 0 && values[best] >= 0.7 && bestScore >= 0.7
    ? interpolate(values, best, minimumLag, sampleRate, Math.min(1, bestScore)) : null;
};

/** Histograms distances between positive-going zero crossings; intended as a cheap landmark baseline. */
export const detectLandmarkHistogram: BenchmarkDetector = (frame, sampleRate) => {
  let energy = 0;
  const crossings: number[] = [];
  for (let index = 1; index < frame.length; index += 1) {
    energy += frame[index] * frame[index];
    if (frame[index - 1] <= 0 && frame[index] > 0) crossings.push(index);
  }
  if (Math.sqrt(energy / frame.length) < minimumRms || crossings.length < 4) return null;
  const bins = new Uint16Array(Math.floor(sampleRate / minimumHz) + 1);
  for (let index = 1; index < crossings.length; index += 1) {
    const distance = crossings[index] - crossings[index - 1];
    if (distance >= sampleRate / maximumHz && distance < bins.length) bins[distance] += 1;
  }
  let best = 0;
  for (let index = 1; index < bins.length; index += 1) if (bins[index] > bins[best]) best = index;
  const confidence = bins[best] / (crossings.length - 1);
  return confidence >= 0.55 ? { frequencyHz: sampleRate / best, confidence } : null;
};
