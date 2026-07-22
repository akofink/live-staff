import { describe, expect, it } from "vitest";
import { benchmarkDetectors, detectorAllocationInventory, establishedScenarioResults, evaluateFrames, modeledLatency, recordedFrameStarts, seededNoise, syntheticCorpus, tone } from "./benchmark";

describe("detector benchmark logic", () => {
  it("builds an identical labeled corpus on every invocation", () => {
    const first = syntheticCorpus();
    const second = syntheticCorpus();
    expect(first.map((frame) => frame.id)).toEqual(second.map((frame) => frame.id));
    expect([...first[0].samples]).toEqual([...second[0].samples]);
    expect([...seededNoise(8, 1, 9)]).toEqual([...seededNoise(8, 1, 9)]);
  });

  it("reports matches, absences, octave errors, cents, and confidence", () => {
    const report = evaluateFrames([
      { id: "match", samples: tone(69), sampleRate: 48_000, expectedMidi: 69 },
      { id: "absence", samples: new Float32Array(4_096), sampleRate: 48_000, expectedMidi: null },
    ], benchmarkDetectors.control);
    expect(report).toMatchObject({ emitted: 1, absent: 1, matches: 1, octaveErrors: 0, falsePositiveRate: 0 });
    expect(report.cents.p50).not.toBeNull();
    expect(report.confidence.correctP50).not.toBeNull();
    expect(report.matchingGroups).toEqual(["match"]);
    expect(report.confidence.riskCoverage).toHaveLength(4);
  });

  it("models first correct and stable display latency deterministically", () => {
    expect(modeledLatency(benchmarkDetectors.control)).toEqual({ frameCadenceMs: 80, firstCorrectMs: 80, firstStableMs: 160 });
  });

  it("labels recorded windows from signal onset rather than fixture identity", () => {
    const samples = new Float32Array(48_000 * 2);
    samples.set(tone(69, 48_000, 48_000), 24_000);
    const starts = recordedFrameStarts(samples, 48_000, 4_096);
    expect(starts).toHaveLength(27);
    expect(starts.slice(0, 3)).toEqual([
      { label: "dense-onset", start: 24_000 }, { label: "dense-onset", start: 24_960 }, { label: "dense-onset", start: 25_920 },
    ]);
    expect(starts.filter(({ label }) => label === "live-overlap")).toHaveLength(9);
    expect(starts.filter(({ label }) => label === "stable-sustain")).toHaveLength(8);
  });

  it("keeps expanded evidence when a recording begins above the onset threshold", () => {
    expect(recordedFrameStarts(tone(69, 48_000, 96_000), 48_000, 4_096)).toHaveLength(27);
  });

  it("runs established production gate and filter scenarios per detector", () => {
    const scenarios = establishedScenarioResults(benchmarkDetectors.control);
    expect(scenarios.supportedRange.pass).toBe(true);
    expect(scenarios.absences.pass).toBe(true);
    expect(scenarios.calibratedRoomGate.pass).toBe(true);
    expect(scenarios.humFilters.pass).toBe(true);
    expect(scenarios.latency.pass).toBe(true);
  });

  it("requires the fundamental-aware selector to clear every mandatory gate", () => {
    const scenarios = establishedScenarioResults(benchmarkDetectors.fundamentalAware);
    expect(Object.fromEntries(Object.entries(scenarios).map(([name, result]) => [name, result.pass])), JSON.stringify(scenarios)).toEqual({
      supportedRange: true,
      harmonicRecovery: true,
      absences: true,
      calibratedRoomGate: true,
      humFilters: true,
      latency: true,
    });
  }, 30_000);

  it("rejects the SWIPE-like candidate before recorded inspection when a mandatory gate fails", () => {
    const scenarios = establishedScenarioResults(benchmarkDetectors.swipeLike);
    expect(Object.fromEntries(Object.entries(scenarios).map(([name, result]) => [name, result.pass])), JSON.stringify(scenarios)).toEqual({
      supportedRange: false,
      harmonicRecovery: false,
      absences: false,
      calibratedRoomGate: false,
      humFilters: true,
      latency: true,
    });
  }, 30_000);

  it("does not express dynamic JavaScript allocations as exact bytes", () => {
    expect(detectorAllocationInventory("control")).toMatchObject({ perCall: { dynamicJsArrays: 1 }, bytes: expect.stringContaining("unknown") });
    expect(detectorAllocationInventory("landmarkHistogram")).toMatchObject({ perCall: { dynamicJsArrays: 1 }, bytes: expect.stringContaining("unknown") });
  });
});
