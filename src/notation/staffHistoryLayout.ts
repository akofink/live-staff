import type { AccidentalPreference } from "../instruments/instruments";
import { pitchHistoryMaxEvents, pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";
import { selectActiveStaff, type ActiveStaff } from "./staffRouter";
import { midiToStaffNote } from "./staffNote";

export interface StaffHistoryMark {
  readonly midi: number;
  readonly staff: ActiveStaff;
  readonly key: string;
  readonly accidental: "#" | "b" | "n" | undefined;
  readonly position: number;
  readonly recency: number;
  readonly current: boolean;
}

export function layoutStaffHistory(
  events: readonly PitchHistoryEvent[],
  nowMs: number,
  accidentalPreference: AccidentalPreference,
  currentStaff?: ActiveStaff,
): readonly StaffHistoryMark[] {
  let previousStaff: ActiveStaff | undefined;
  const previousAccidentals = new Map<string, "#" | "b">();
  const boundedEvents = events.slice(-pitchHistoryMaxEvents);
  const historyCount = boundedEvents.filter((event) => event.endMs !== undefined).length;
  let historyIndex = 0;

  return boundedEvents.map((event) => {
    const staff = event.endMs === undefined && currentStaff
      ? currentStaff
      : selectActiveStaff(previousStaff, event.concertMidi);
    previousStaff = staff;
    const pitch = midiToStaffNote(event.concertMidi, accidentalPreference);
    const recency = Math.max(0, Math.min(1, 1 - (nowMs - event.onsetMs) / pitchHistoryWindowMs));
    const accidentalKey = pitch.key;
    const accidental = pitch.accidental
      ?? (previousAccidentals.has(accidentalKey) ? "n" : undefined);
    if (pitch.accidental) {
      previousAccidentals.set(accidentalKey, pitch.accidental);
    } else {
      previousAccidentals.delete(accidentalKey);
    }
    const current = event.endMs === undefined;
    const position = current ? 1 : historyCount <= 1 ? 1 : historyIndex / (historyCount - 1);
    if (!current) historyIndex += 1;

    return {
      midi: event.concertMidi,
      staff,
      key: pitch.key,
      accidental,
      position,
      recency,
      current,
    };
  });
}
