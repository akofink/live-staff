export const signalMonitorFps = 10;
export const lowPowerSignalMonitorFps = 5;

export interface SignalMonitorFrame {
  readonly waveform: Float32Array;
  readonly spectrum: Float32Array;
  readonly sampleRate: number;
  readonly minDecibels: number;
  readonly maxDecibels: number;
}

export function frequencyToLogPosition(
  frequencyHz: number,
  minimumHz = 20,
  maximumHz = 20_000,
): number {
  const bounded = Math.min(maximumHz, Math.max(minimumHz, frequencyHz));
  return Math.log(bounded / minimumHz) / Math.log(maximumHz / minimumHz);
}

export function waveformLevelDb(waveform: Float32Array): number {
  if (waveform.length === 0) {
    return -Infinity;
  }

  let sumSquares = 0;
  for (const sample of waveform) {
    sumSquares += sample * sample;
  }
  const rms = Math.sqrt(sumSquares / waveform.length);
  return rms > 0 ? 20 * Math.log10(rms) : -Infinity;
}

export function isLowPowerSignalMonitor(): boolean {
  const connection = navigator as Navigator & { connection?: { saveData?: boolean } };
  return connection.connection?.saveData === true || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);
}
