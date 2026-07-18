import { describe, expect, it } from "vitest";
import { detectPitch } from "./autocorrelation";
import { detectorEvidencePolicy } from "../../fixture-evaluation/evidencePolicy";
import { frequencyToNote } from "../../pitch/note";
import { NoteStabilizer } from "../../pitch/stabilizer";

function sineWave(frequencyHz: number, sampleRate = 48_000, length = 4_096, phaseOffset = 0): Float32Array {
  return Float32Array.from(
    { length },
    (_, index) => Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate + phaseOffset),
  );
}

function harmonicWave(frequencyHz: number, sampleRate = 48_000, length = 4_096, phaseOffset = 0.37): Float32Array {
  return Float32Array.from({ length }, (_, index) => {
    const phase = (2 * Math.PI * frequencyHz * index) / sampleRate + phaseOffset;
    return 0.6 * Math.sin(phase) + 0.25 * Math.sin(2 * phase) + 0.1 * Math.sin(3 * phase);
  });
}

describe("detectPitch", () => {
  it("detects a generated A4", () => {
    expect(detectPitch(sineWave(440), 48_000)?.frequencyHz).toBeCloseTo(440, 0);
  });

  it("detects a generated middle C", () => {
    expect(detectPitch(sineWave(261.63), 48_000)?.frequencyHz).toBeCloseTo(261.63, 0);
  });

  it("suppresses silence", () => {
    expect(detectPitch(new Float32Array(4_096), 48_000)).toBeNull();
  });

  it("meets the reviewed supported-range pitch and octave thresholds", () => {
    const frequencies = Array.from({ length: 50 }, (_, index) =>
      440 * 2 ** ((34 + index - 69) / 12));
    const signals = frequencies.flatMap((frequencyHz, index) => {
      const sampleRate = index % 2 === 0 ? 44_100 : 48_000;
      return [
        { frequencyHz, sampleRate, samples: sineWave(frequencyHz, sampleRate, 4_096, 0.19) },
        { frequencyHz, sampleRate, samples: harmonicWave(frequencyHz, sampleRate) },
      ];
    });
    const outcomes = signals.map(({ frequencyHz, sampleRate, samples }) => {
      const estimate = detectPitch(samples, sampleRate);
      const centsError = estimate
        ? 1_200 * Math.log2(estimate.frequencyHz / frequencyHz)
        : Number.POSITIVE_INFINITY;
      const midiError = estimate
        ? frequencyToNote(estimate.frequencyHz).midi - frequencyToNote(frequencyHz).midi
        : undefined;
      return { frequencyHz, estimate, centsError, midiError };
    });
    const accurate = outcomes.filter(
      ({ centsError }) => Math.abs(centsError) <= detectorEvidencePolicy.detector.maximumAbsoluteCentsError,
    );
    const octaveErrors = outcomes.filter(
      ({ midiError }) => midiError !== undefined && Math.abs(midiError) >= 12 && midiError % 12 === 0,
    );

    expect(accurate.length / outcomes.length, JSON.stringify(outcomes)).toBeGreaterThanOrEqual(
      detectorEvidencePolicy.detector.minimumPitchAccuracy,
    );
    expect(octaveErrors.length / outcomes.length).toBeLessThanOrEqual(
      detectorEvidencePolicy.detector.maximumOctaveErrorRate,
    );
  });

  it("returns absence for silence, sub-threshold tones, and above-threshold uncertainty", () => {
    const quietTone = Float32Array.from(sineWave(440), (sample) => sample * 0.005);
    let state = 0x12345678;
    const uncertain = Float32Array.from({ length: 4_096 }, () => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return ((state / 0xffffffff) * 2 - 1) * 0.05;
    });
    const outcomes = [new Float32Array(4_096), quietTone, uncertain].map((samples) =>
      detectPitch(samples, 48_000));
    const falsePositiveRate = outcomes.filter(Boolean).length / outcomes.length;
    const absenceRate = outcomes.filter((outcome) => outcome === null).length / outcomes.length;

    expect(falsePositiveRate).toBeLessThanOrEqual(detectorEvidencePolicy.detector.maximumFalsePositiveRate);
    expect(absenceRate).toBeGreaterThanOrEqual(detectorEvidencePolicy.detector.minimumUncertainAbsenceRate);
  });

  it("reaches a stable display within the reviewed latency threshold", () => {
    const stabilizer = new NoteStabilizer();
    const frame = sineWave(440);
    let stableAtMs: number | undefined;

    for (let timestampMs = detectorEvidencePolicy.stableDisplay.frameCadenceMs;
      timestampMs <= detectorEvidencePolicy.stableDisplay.maximumLatencyMs;
      timestampMs += detectorEvidencePolicy.stableDisplay.frameCadenceMs) {
      const estimate = detectPitch(frame, 48_000);
      const stable = stabilizer.update(estimate ? frequencyToNote(estimate.frequencyHz) : null);
      if (stable && stableAtMs === undefined) stableAtMs = timestampMs;
    }

    expect(stableAtMs).toBe(detectorEvidencePolicy.stableDisplay.worstAlignedModeledLatencyMs);
    expect(stableAtMs).toBeLessThanOrEqual(detectorEvidencePolicy.stableDisplay.maximumLatencyMs);
  });
});
