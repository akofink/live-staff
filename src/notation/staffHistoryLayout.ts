import type { AccidentalPreference } from "../instruments/instruments";
import { pitchHistoryMaxEvents, pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";
import { selectActiveStaff, type ActiveStaff } from "./staffRouter";
import { midiToStaffNote } from "./staffNote";

export const staffHistorySpacings = ["event", "proportional"] as const;
export type StaffHistorySpacing = (typeof staffHistorySpacings)[number];

export interface StaffHistoryMark {
  readonly midi: number;
  readonly staff: ActiveStaff;
  readonly key: string;
  readonly accidental: "#" | "b" | "n" | undefined;
  readonly position: number;
  readonly recency: number;
  readonly current: boolean;
}

function eventPosition(current: boolean, historyCount: number, historyIndex: number): number {
  if (current) return 1;
  return historyCount <= 1 ? 1 : historyIndex / (historyCount - 1);
}

function proportionalPosition(current: boolean, onsetMs: number, nowMs: number): number {
  if (current) return 1;
  const windowStart = nowMs - pitchHistoryWindowMs;
  return Math.max(0, Math.min(1, (onsetMs - windowStart) / pitchHistoryWindowMs));
}

export function layoutStaffHistory(
  events: readonly PitchHistoryEvent[],
  nowMs: number,
  accidentalPreference: AccidentalPreference,
  currentStaff?: ActiveStaff,
  spacing: StaffHistorySpacing = "event",
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
    const position = spacing === "proportional"
      ? proportionalPosition(current, event.onsetMs, nowMs)
      : eventPosition(current, historyCount, historyIndex);
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
