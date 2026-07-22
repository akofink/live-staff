import { describe, expect, it } from "vitest";
import { pitchHistoryMaxEvents } from "../pitch/pitchHistory";
import { layoutStaffHistory } from "./staffHistoryLayout";

describe("layoutStaffHistory", () => {
  it("advances completed events discretely while keeping the current position fixed", () => {
    const marks = layoutStaffHistory([
      { concertMidi: 48, onsetMs: 0, endMs: 100 },
      { concertMidi: 60, onsetMs: 5_000, endMs: 5_100 },
      { concertMidi: 67, onsetMs: 10_000, endMs: undefined },
    ], 10_000, "sharp");

    expect(marks.map(({ position }) => position)).toEqual([0, 1, 1]);
    expect(marks.map(({ staff }) => staff)).toEqual(["bass", "treble", "treble"]);
    expect(marks.at(-1)).toMatchObject({ current: true, recency: 1, key: "g/4" });
  });

  it("uses a native natural modifier when a prior alteration is canceled", () => {
    const marks = layoutStaffHistory([
      { concertMidi: 61, onsetMs: 0, endMs: 100 },
      { concertMidi: 60, onsetMs: 200, endMs: undefined },
    ], 200, "sharp");

    expect(marks.map(({ accidental }) => accidental)).toEqual(["#", "n"]);
  });

  it("preserves the authoritative current clef at the routing boundary", () => {
    const marks = layoutStaffHistory([
      { concertMidi: 59, onsetMs: 1_000, endMs: undefined },
    ], 2_000, "sharp", "treble");

    expect(marks[0]).toMatchObject({ staff: "treble", recency: 0.9 });
  });

  it("keeps only the fixed renderer event bound", () => {
    const events = Array.from({ length: pitchHistoryMaxEvents + 4 }, (_, index) => ({
      concertMidi: 48 + index,
      onsetMs: index * 100,
      endMs: index === pitchHistoryMaxEvents + 3 ? undefined : index * 100 + 50,
    }));

    const marks = layoutStaffHistory(events, 4_000, "flat");

    expect(marks).toHaveLength(pitchHistoryMaxEvents);
    expect(marks[0].midi).toBe(52);
    expect(marks.at(-1)?.current).toBe(true);
  });
});
