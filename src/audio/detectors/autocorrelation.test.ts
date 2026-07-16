import { describe, expect, it } from "vitest";
import { detectPitch } from "./autocorrelation";

function sineWave(frequencyHz: number, sampleRate = 48_000, length = 4_096): Float32Array {
  return Float32Array.from(
    { length },
    (_, index) => Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate),
  );
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
});
