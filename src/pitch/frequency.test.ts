import { describe, expect, it } from "vitest";
import { frequencyToMidi, midiToFrequency } from "./frequency";

describe("frequencyToMidi", () => {
  it("maps A4 at the default reference to MIDI 69", () => {
    expect(frequencyToMidi(440)).toBe(69);
  });

  it("rejects nonpositive values", () => {
    expect(() => frequencyToMidi(0)).toThrow(RangeError);
  });
});

describe("midiToFrequency", () => {
  it("maps MIDI 69 to 440 Hz", () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it("inverts frequencyToMidi for C4", () => {
    expect(frequencyToMidi(midiToFrequency(60))).toBeCloseTo(60, 10);
  });

  it("rejects a nonpositive A4 reference", () => {
    expect(() => midiToFrequency(69, 0)).toThrow(RangeError);
  });
});
