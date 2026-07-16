import { detectPitch, type PitchEstimate } from "../audio/detectors/autocorrelation";
import { frequencyToNote } from "../pitch/note";

const frameLength = 4_096;
const firstWindowSeconds = 0.75;
const finalWindowSeconds = 0.75;
const windowSpacingSeconds = 0.35;
const maximumWindows = 8;

export interface WindowResult {
  readonly frequencyHz: number;
  readonly confidence: number;
  readonly detectedMidi: number;
  readonly detectedPitch: string;
  readonly cents: number;
  readonly matchesExpectedPitch: boolean;
}

export interface FixtureEvaluation {
  readonly evaluatedWindows: number;
  readonly estimates: readonly WindowResult[];
  readonly matchingWindows: number;
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
  const estimates: WindowResult[] = [];
  const starts = analysisFrameStarts(samples.length, sampleRate);

  for (const start of starts) {
    const estimate = detector(samples.slice(start, start + frameLength), sampleRate);
    if (estimate === null) {
      continue;
    }

    const note = frequencyToNote(estimate.frequencyHz);
    estimates.push({
      frequencyHz: estimate.frequencyHz,
      confidence: estimate.confidence,
      detectedMidi: note.midi,
      detectedPitch: note.name,
      cents: note.cents,
      matchesExpectedPitch: note.midi === expectedMidi,
    });
  }

  return {
    evaluatedWindows: starts.length,
    estimates,
    matchingWindows: estimates.filter((estimate) => estimate.matchesExpectedPitch).length,
  };
}
