import type { PitchEstimate } from "../audio/detectors/autocorrelation";

export type BenchmarkDetector = (frame: Float32Array, sampleRate: number) => PitchEstimate | null;

const minimumHz = 55;
const maximumHz = 1_000;
const minimumRms = 0.01;

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
