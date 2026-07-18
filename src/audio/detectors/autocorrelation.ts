export interface PitchEstimate {
  readonly frequencyHz: number;
  readonly confidence: number;
}

export interface DetectorOptions {
  readonly minimumFrequencyHz?: number;
  readonly maximumFrequencyHz?: number;
  readonly minimumRms?: number;
  readonly minimumConfidence?: number;
}

export const detectorDefaults: Required<DetectorOptions> = {
  minimumFrequencyHz: 55,
  maximumFrequencyHz: 1_000,
  minimumRms: 0.01,
  minimumConfidence: 0.72,
};

/** Estimates one dominant pitch using normalized autocorrelation. */
export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options: DetectorOptions = {},
): PitchEstimate | null {
  const settings = { ...detectorDefaults, ...options };
  const rms = Math.sqrt(frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length);
  if (rms < settings.minimumRms) {
    return null;
  }

  const minimumLag = Math.floor(sampleRate / settings.maximumFrequencyHz);
  const maximumLag = Math.min(Math.floor(sampleRate / settings.minimumFrequencyHz), frame.length - 2);
  const correlations: number[] = [];

  for (let lag = minimumLag; lag <= maximumLag; lag += 1) {
    let correlation = 0;
    let leadingEnergy = 0;
    let laggingEnergy = 0;
    for (let index = 0; index < frame.length - lag; index += 1) {
      const leading = frame[index];
      const lagging = frame[index + lag];
      correlation += leading * lagging;
      leadingEnergy += leading * leading;
      laggingEnergy += lagging * lagging;
    }
    const normalized = correlation / Math.sqrt(leadingEnergy * laggingEnergy);
    correlations.push(normalized);
  }

  const peakIndex = correlations.findIndex(
    (correlation, index) =>
      index > 0 &&
      index < correlations.length - 1 &&
      correlation >= settings.minimumConfidence &&
      correlation > correlations[index - 1] &&
      correlation >= correlations[index + 1],
  );
  if (peakIndex === -1) {
    return null;
  }

  const before = correlations[peakIndex - 1];
  const peak = correlations[peakIndex];
  const after = correlations[peakIndex + 1];
  const offset = 0.5 * (before - after) / (before - 2 * peak + after);

  return {
    frequencyHz: sampleRate / (minimumLag + peakIndex + offset),
    confidence: correlations[peakIndex],
  };
}
