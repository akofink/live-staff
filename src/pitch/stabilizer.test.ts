import { describe, expect, it } from "vitest";
import { NoteStabilizer } from "./stabilizer";

const a4 = { midi: 69, name: "A4", frequencyHz: 440, cents: 0 };

describe("NoteStabilizer", () => {
  it("requires consecutive frames before showing a note", () => {
    const stabilizer = new NoteStabilizer(2);

    expect(stabilizer.update(a4)).toBeNull();
    expect(stabilizer.update(a4)).toEqual(a4);
  });

  it("clears an unstable candidate", () => {
    const stabilizer = new NoteStabilizer(2);

    stabilizer.update(a4);
    expect(stabilizer.update(null)).toBeNull();
  });
});
