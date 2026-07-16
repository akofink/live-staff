import { describe, expect, it } from "vitest";
import { NoteStabilizer } from "./stabilizer";

const a4 = { midi: 69, name: "A4", frequencyHz: 440, cents: 0 };
const aSharp4 = { midi: 70, name: "A#4", frequencyHz: 466.16, cents: 0 };
const a4Sharp = { midi: 69, name: "A4", frequencyHz: 448.95, cents: 35 };
const a4TooSharp = { midi: 69, name: "A4", frequencyHz: 452.89, cents: 50 };

describe("NoteStabilizer", () => {
  it("requires consecutive frames before showing a note", () => {
    const stabilizer = new NoteStabilizer(2);

    expect(stabilizer.update(a4)).toBeNull();
    expect(stabilizer.update(a4)).toEqual(a4);
  });

  it("holds a displayed note across brief dropouts before clearing it", () => {
    const stabilizer = new NoteStabilizer(2);

    stabilizer.update(a4);
    expect(stabilizer.update(a4)).toEqual(a4);
    expect(stabilizer.update(null)).toEqual(a4);
    expect(stabilizer.update(null)).toEqual(a4);
    expect(stabilizer.update(null)).toEqual(a4);
    expect(stabilizer.update(null)).toEqual(a4);
    expect(stabilizer.update(null)).toBeNull();
  });

  it("changes to a new note after consecutive matching estimates", () => {
    const stabilizer = new NoteStabilizer(2);

    stabilizer.update(a4);
    stabilizer.update(a4);
    expect(stabilizer.update(aSharp4)).toEqual(a4);
    expect(stabilizer.update(aSharp4)).toEqual(aSharp4);
  });

  it("does not alternate the display while estimates move between nearby notes", () => {
    const stabilizer = new NoteStabilizer(2);

    stabilizer.update(a4);
    stabilizer.update(a4);
    expect(stabilizer.update(aSharp4)).toEqual(a4);
    expect(stabilizer.update(a4)).toEqual(a4);
    expect(stabilizer.update(aSharp4)).toEqual(a4);
    expect(stabilizer.update(a4)).toEqual(a4);
  });

  it("holds the last in-tune note while rejecting severely out-of-tune estimates", () => {
    const stabilizer = new NoteStabilizer(2);

    stabilizer.update(a4);
    stabilizer.update(a4);
    expect(stabilizer.update(a4Sharp)).toEqual(a4);
    expect(stabilizer.update(a4TooSharp)).toEqual(a4);
    expect(stabilizer.update(a4TooSharp)).toEqual(a4);
    expect(stabilizer.update(a4TooSharp)).toEqual(a4);
    expect(stabilizer.update(a4TooSharp)).toEqual(a4);
    expect(stabilizer.update(a4TooSharp)).toBeNull();
  });
});
