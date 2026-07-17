import { describe, expect, it } from "vitest";
import { frequencyToNote, midiToNoteName } from "./note";

describe("frequencyToNote", () => {
  it("maps A4 to concert A4", () => {
    expect(frequencyToNote(440)).toMatchObject({ midi: 69, name: "A4", cents: 0 });
  });

  it("maps middle C to C4", () => {
    expect(frequencyToNote(261.625565)).toMatchObject({ midi: 60, name: "C4" });
  });

  it("spells MIDI pitches with the requested accidental preference", () => {
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(61, "flat")).toBe("D-flat4");
  });
});
