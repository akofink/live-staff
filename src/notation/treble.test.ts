import { describe, expect, it } from "vitest";
import { concertMidiToTrebleNote } from "./treble";

describe("concertMidiToTrebleNote", () => {
  it("maps middle C to a treble staff key", () => {
    expect(concertMidiToTrebleNote(60)).toEqual({ key: "c/4" });
  });

  it("preserves a sharp accidental independently from the staff key", () => {
    expect(concertMidiToTrebleNote(61)).toEqual({ key: "c/4", accidental: "#" });
  });

  it("maps B4 without changing its octave", () => {
    expect(concertMidiToTrebleNote(71)).toEqual({ key: "b/4" });
  });

  it("rejects a fractional MIDI pitch", () => {
    expect(() => concertMidiToTrebleNote(60.5)).toThrow("MIDI pitch must be an integer.");
  });
});
