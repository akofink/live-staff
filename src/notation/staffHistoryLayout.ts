import type { AccidentalPreference } from "../instruments/instruments";
import { pitchHistoryMaxEvents, pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";
import { selectActiveStaff, type ActiveStaff } from "./staffRouter";
import { midiToStaffNote } from "./staffNote";

export interface StaffHistoryMark {
  readonly midi: number;
  readonly staff: ActiveStaff;
  readonly key: string;
  readonly accidental: string | undefined;
  readonly position: number;
  readonly recency: number;
  readonly current: boolean;
}

export function layoutStaffHistory(
  events: readonly PitchHistoryEvent[],
  nowMs: number,
  accidentalPreference: AccidentalPreference,
): readonly StaffHistoryMark[] {
  let previousStaff: ActiveStaff | undefined;

  return events.slice(-pitchHistoryMaxEvents).map((event) => {
    const staff = selectActiveStaff(previousStaff, event.concertMidi);
    previousStaff = staff;
    const pitch = midiToStaffNote(event.concertMidi, accidentalPreference);
    const recency = Math.max(0, Math.min(1, 1 - (nowMs - event.onsetMs) / pitchHistoryWindowMs));

    return {
      midi: event.concertMidi,
      staff,
      key: pitch.key,
      accidental: pitch.accidental,
      position: recency,
      recency,
      current: event.endMs === undefined,
    };
  });
}
