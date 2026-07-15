import { describe, expect, it } from "vitest";
import { frequencyToMidi } from "./frequency";

describe("frequencyToMidi", () => {
  it("maps A4 at the default reference to MIDI 69", () => {
    expect(frequencyToMidi(440)).toBe(69);
  });

  it("rejects nonpositive values", () => {
    expect(() => frequencyToMidi(0)).toThrow(RangeError);
  });
});
