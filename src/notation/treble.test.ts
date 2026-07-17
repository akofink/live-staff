import { describe, expect, it } from "vitest";
import { midiToTrebleNote } from "./treble";

describe("midiToTrebleNote", () => {
  it("maps middle C to a treble staff key", () => {
    expect(midiToTrebleNote(60)).toEqual({ key: "c/4" });
  });

  it("preserves a sharp accidental independently from the staff key", () => {
    expect(midiToTrebleNote(61)).toEqual({ key: "c/4", accidental: "#" });
  });

  it("uses flat spelling when requested", () => {
    expect(midiToTrebleNote(61, "flat")).toEqual({ key: "d/4", accidental: "b" });
  });

  it("maps B4 without changing its octave", () => {
    expect(midiToTrebleNote(71)).toEqual({ key: "b/4" });
  });

  it("rejects a fractional MIDI pitch", () => {
    expect(() => midiToTrebleNote(60.5)).toThrow("MIDI pitch must be an integer.");
  });
});
