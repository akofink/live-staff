import { describe, expect, it } from "vitest";
import { selectActiveStaff } from "./staffRouter";

describe("selectActiveStaff", () => {
  it("routes initial B3 and lower to bass and C4 and higher to treble", () => {
    expect(selectActiveStaff(undefined, 59)).toBe("bass");
    expect(selectActiveStaff(undefined, 60)).toBe("treble");
  });

  it("retains treble through B3 before switching at A-sharp3", () => {
    expect(selectActiveStaff("treble", 59)).toBe("treble");
    expect(selectActiveStaff("treble", 58)).toBe("bass");
  });

  it("retains bass through B3 before switching at C4", () => {
    expect(selectActiveStaff("bass", 59)).toBe("bass");
    expect(selectActiveStaff("bass", 60)).toBe("treble");
  });

  it("rejects fractional MIDI pitches", () => {
    expect(() => selectActiveStaff(undefined, 59.5)).toThrow("MIDI pitch must be an integer.");
  });
});
