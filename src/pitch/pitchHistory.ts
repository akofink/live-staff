export interface PitchHistoryEvent {
  readonly concertMidi: number;
  readonly onsetMs: number;
  readonly endMs: number | undefined;
}

export const pitchHistoryWindowMs = 10_000;
export const pitchHistoryMaxEvents = 32;

export class PitchHistory {
  #events: PitchHistoryEvent[] = [];

  update(concertMidi: number | undefined, timestampMs: number): readonly PitchHistoryEvent[] | undefined {
    const active = this.#events.at(-1);
    const activeMidi = active && active.endMs === undefined ? active.concertMidi : undefined;

    if (concertMidi === activeMidi) {
      return this.#prune(timestampMs) ? this.snapshot() : undefined;
    }

    if (active && activeMidi !== undefined) {
      this.#events[this.#events.length - 1] = { ...active, endMs: timestampMs };
    }

    if (concertMidi !== undefined) {
      this.#events.push({ concertMidi, onsetMs: timestampMs, endMs: undefined });
    }

    this.#prune(timestampMs);
    return this.snapshot();
  }

  reset(): readonly PitchHistoryEvent[] {
    this.#events = [];
    return this.snapshot();
  }

  snapshot(): readonly PitchHistoryEvent[] {
    return this.#events.map((event) => ({ ...event }));
  }

  #prune(timestampMs: number): boolean {
    const previousLength = this.#events.length;
    const cutoff = timestampMs - pitchHistoryWindowMs;
    this.#events = this.#events
      .filter((event) => event.endMs === undefined || event.endMs > cutoff)
      .slice(-pitchHistoryMaxEvents);
    return this.#events.length !== previousLength;
  }
}
