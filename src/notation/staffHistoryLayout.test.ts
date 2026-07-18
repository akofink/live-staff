import { describe, expect, it } from "vitest";
import { pitchHistoryMaxEvents } from "../pitch/pitchHistory";
import { layoutStaffHistory } from "./staffHistoryLayout";

describe("layoutStaffHistory", () => {
  it("maps ten seconds of chronology from left to right without rhythmic values", () => {
    const marks = layoutStaffHistory([
      { concertMidi: 48, onsetMs: 0, endMs: 100 },
      { concertMidi: 60, onsetMs: 5_000, endMs: 5_100 },
      { concertMidi: 67, onsetMs: 10_000, endMs: undefined },
    ], 10_000, "sharp");

    expect(marks.map(({ position }) => position)).toEqual([0, 0.5, 1]);
    expect(marks.map(({ staff }) => staff)).toEqual(["bass", "treble", "treble"]);
    expect(marks.at(-1)).toMatchObject({ current: true, recency: 1, key: "g/4" });
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
