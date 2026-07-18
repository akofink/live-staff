import { detectPitch, type PitchEstimate } from "../audio/detectors/autocorrelation";
import { frequencyToNote } from "../pitch/note";

const frameLength = 4_096;
const firstWindowSeconds = 0.75;
const finalWindowSeconds = 0.75;
const windowSpacingSeconds = 0.35;
const maximumWindows = 8;

export interface WindowResult {
  readonly startSample: number;
  readonly startMs: number;
  readonly expectedFrequencyHz: number;
  readonly estimate: {
    readonly frequencyHz: number;
    readonly confidence: number;
    readonly detectedMidi: number;
    readonly detectedPitch: string;
    readonly centsError: number;
    readonly midiError: number;
    readonly matchesExpectedPitch: boolean;
    readonly octaveError: boolean;
  } | null;
}

export interface FixtureEvaluation {
  readonly evaluatedWindows: number;
  readonly windows: readonly WindowResult[];
  readonly matchingWindows: number;
  readonly octaveErrors: number;
}

type Detector = (frame: Float32Array, sampleRate: number) => PitchEstimate | null;

/** Returns analysis frames after attack and before the natural decay tail. */
export function analysisFrameStarts(sampleCount: number, sampleRate: number): readonly number[] {
  const firstStart = Math.ceil(firstWindowSeconds * sampleRate);
  const lastStart = Math.floor((sampleCount - finalWindowSeconds * sampleRate - frameLength) / 1);
  const spacing = Math.floor(windowSpacingSeconds * sampleRate);
  const starts: number[] = [];

  for (let start = firstStart; start <= lastStart && starts.length < maximumWindows; start += spacing) {
    starts.push(start);
  }

  return starts;
}

/** Evaluates stable PCM windows without retaining or altering the source recording. */
export function evaluateFixturePcm(
  samples: Float32Array,
  sampleRate: number,
  expectedMidi: number,
  detector: Detector = detectPitch,
): FixtureEvaluation {
  const windows: WindowResult[] = [];
  const starts = analysisFrameStarts(samples.length, sampleRate);
  const expectedFrequencyHz = 440 * 2 ** ((expectedMidi - 69) / 12);

  for (const start of starts) {
    const estimate = detector(samples.slice(start, start + frameLength), sampleRate);
    if (estimate === null) {
      windows.push({
        startSample: start,
        startMs: (start / sampleRate) * 1_000,
        expectedFrequencyHz,
        estimate: null,
      });
      continue;
    }

    const note = frequencyToNote(estimate.frequencyHz);
    const midiError = note.midi - expectedMidi;
    windows.push({
      startSample: start,
      startMs: (start / sampleRate) * 1_000,
      expectedFrequencyHz,
      estimate: {
        frequencyHz: estimate.frequencyHz,
        confidence: estimate.confidence,
        detectedMidi: note.midi,
        detectedPitch: note.name,
        centsError: Math.round(1_200 * Math.log2(estimate.frequencyHz / expectedFrequencyHz)),
        midiError,
        matchesExpectedPitch: midiError === 0,
        octaveError: Math.abs(midiError) >= 12 && midiError % 12 === 0,
      },
    });
  }

  return {
    evaluatedWindows: starts.length,
    windows,
    matchingWindows: windows.filter((window) => window.estimate?.matchesExpectedPitch).length,
    octaveErrors: windows.filter((window) => window.estimate?.octaveError).length,
  };
}
