import { describe, expect, it } from "vitest";
import { midiToStaffNote } from "./staffNote";

describe("midiToStaffNote", () => {
  it("maps middle C to a staff key", () => {
    expect(midiToStaffNote(60)).toEqual({ key: "c/4" });
  });

  it("preserves a sharp accidental independently from the staff key", () => {
    expect(midiToStaffNote(61)).toEqual({ key: "c/4", accidental: "#" });
  });

  it("uses flat spelling when requested", () => {
    expect(midiToStaffNote(61, "flat")).toEqual({ key: "d/4", accidental: "b" });
  });

  it("maps B4 without changing its octave", () => {
    expect(midiToStaffNote(71)).toEqual({ key: "b/4" });
  });

  it("rejects a fractional MIDI pitch", () => {
    expect(() => midiToStaffNote(60.5)).toThrow("MIDI pitch must be an integer.");
  });
});
