import { describe, expect, it } from "vitest";
import { PitchHistory, pitchHistoryMaxEvents } from "./pitchHistory";

describe("PitchHistory", () => {
  it("opens events only when the committed stable display note changes", () => {
    const history = new PitchHistory();

    expect(history.update(undefined, 0)).toBeUndefined();
    expect(history.update(60, 100)).toEqual([{ concertMidi: 60, onsetMs: 100, endMs: undefined }]);
    expect(history.update(60, 180)).toBeUndefined();
    expect(history.update(62, 500)).toEqual([
      { concertMidi: 60, onsetMs: 100, endMs: 500 },
      { concertMidi: 62, onsetMs: 500, endMs: undefined },
    ]);
  });

  it("keeps held dropout output in one event and closes it only after stabilization reports no note", () => {
    const history = new PitchHistory();

    history.update(69, 0);
    history.update(69, 80);
    expect(history.update(undefined, 480)).toEqual([
      { concertMidi: 69, onsetMs: 0, endMs: 480 },
    ]);
  });

  it("expires completed events outside ten seconds while retaining an active event", () => {
    const history = new PitchHistory();

    history.update(60, 0);
    history.update(undefined, 500);
    history.update(62, 1_000);
    history.update(undefined, 2_000);
    expect(history.update(64, 10_600)).toEqual([
      { concertMidi: 62, onsetMs: 1_000, endMs: 2_000 },
      { concertMidi: 64, onsetMs: 10_600, endMs: undefined },
    ]);
    expect(history.update(64, 12_100)).toEqual([
      { concertMidi: 64, onsetMs: 10_600, endMs: undefined },
    ]);
  });

  it("caps rapid committed transitions at a fixed event count", () => {
    const history = new PitchHistory();

    for (let index = 0; index < pitchHistoryMaxEvents + 8; index += 1) {
      history.update(48 + (index % 12), index * 100);
    }

    const events = history.snapshot();
    expect(events).toHaveLength(pitchHistoryMaxEvents);
    expect(events[0].onsetMs).toBe(800);
    expect(events.at(-1)).toEqual({ concertMidi: 51, onsetMs: 3_900, endMs: undefined });
  });

  it("clears its in-memory session without persistence", () => {
    const history = new PitchHistory();
    history.update(60, 0);

    expect(history.reset()).toEqual([]);
    expect(history.snapshot()).toEqual([]);
  });
});
