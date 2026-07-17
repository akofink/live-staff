import { describe, expect, it } from "vitest";
import { frequencyToLogPosition, waveformLevelDb } from "./signalMonitor";

describe("signal monitor scales", () => {
  it("places musical frequencies on a bounded logarithmic scale", () => {
    expect(frequencyToLogPosition(20)).toBe(0);
    expect(frequencyToLogPosition(200)).toBeCloseTo(1 / 3);
    expect(frequencyToLogPosition(2_000)).toBeCloseTo(2 / 3);
    expect(frequencyToLogPosition(20_000)).toBe(1);
    expect(frequencyToLogPosition(0)).toBe(0);
  });

  it("measures deterministic RMS level in decibels", () => {
    expect(waveformLevelDb(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(0);
    expect(waveformLevelDb(new Float32Array([0.5, -0.5]))).toBeCloseTo(-6.0206, 3);
    expect(waveformLevelDb(new Float32Array(4))).toBe(-Infinity);
  });
});
