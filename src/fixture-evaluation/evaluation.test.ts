import { describe, expect, it } from "vitest";
import { analysisFrameStarts, evaluateFixturePcm } from "./evaluation";
import { pianoFixtures } from "./fixtures";

describe("piano fixture catalog", () => {
  it("assigns the recorded filenames their expected concert MIDI pitches", () => {
    expect(pianoFixtures).toEqual([
      { fileName: "a3.m4a", expectedPitch: "A3", expectedMidi: 57 },
      { fileName: "bb1.m4a", expectedPitch: "Bb1", expectedMidi: 34 },
      { fileName: "bb2.m4a", expectedPitch: "Bb2", expectedMidi: 46 },
      { fileName: "c1.m4a", expectedPitch: "C1", expectedMidi: 24 },
      { fileName: "c2.m4a", expectedPitch: "C2", expectedMidi: 36 },
      { fileName: "c3.m4a", expectedPitch: "C3", expectedMidi: 48 },
      { fileName: "c4.m4a", expectedPitch: "C4", expectedMidi: 60 },
      { fileName: "c5.m4a", expectedPitch: "C5", expectedMidi: 72 },
      { fileName: "e3.m4a", expectedPitch: "E3", expectedMidi: 52 },
      { fileName: "f1.m4a", expectedPitch: "F1", expectedMidi: 29 },
      { fileName: "f2.m4a", expectedPitch: "F2", expectedMidi: 41 },
      { fileName: "g4.m4a", expectedPitch: "G4", expectedMidi: 67 },
    ]);
  });
});

describe("fixture evaluation", () => {
  it("selects up to eight windows after the attack and before the decay tail", () => {
    const starts = analysisFrameStarts(5 * 48_000, 48_000);

    expect(starts).toHaveLength(8);
    expect(starts[0]).toBe(36_000);
    expect(starts.at(-1)).toBeLessThan(5 * 48_000 - 36_000 - 4_096);
  });

  it("reports matches, mismatches, and absent estimates without hiding any outcome", () => {
    const samples = new Float32Array(5 * 48_000);
    const estimates = [
      { frequencyHz: 440, confidence: 0.9 },
      { frequencyHz: 466.16, confidence: 0.8 },
      null,
    ];
    let call = 0;

    const evaluation = evaluateFixturePcm(samples, 48_000, 69, () => estimates[call++] ?? null);

    expect(evaluation.evaluatedWindows).toBe(8);
    expect(evaluation.matchingWindows).toBe(1);
    expect(evaluation.windows).toHaveLength(8);
    expect(evaluation.windows.slice(0, 3)).toMatchObject([
      { estimate: { detectedPitch: "A4", matchesExpectedPitch: true } },
      { estimate: { detectedPitch: "A#4", matchesExpectedPitch: false } },
      { estimate: null },
    ]);
  });
});
