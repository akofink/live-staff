import type { InstrumentDefinition } from "../instruments/instruments";
import { toDisplayPitch, type PitchRepresentation } from "../instruments/displayPitch";
import { pitchHistoryWindowMs, type PitchHistoryEvent } from "../pitch/pitchHistory";

interface PitchHistoryStripProps {
  readonly events: readonly PitchHistoryEvent[];
  readonly instrument: InstrumentDefinition;
  readonly pitchDisplay: PitchRepresentation;
}

export function PitchHistoryStrip({ events, instrument, pitchDisplay }: PitchHistoryStripProps) {
  return (
    <section className="pitch-history" aria-labelledby="pitch-history-title">
      <div className="history-heading">
        <h2 id="pitch-history-title">Recent notes</h2>
        <span>Last 10 seconds</span>
      </div>
      {events.length === 0 ? (
        <p className="history-empty">Stable notes will collect here while listening.</p>
      ) : (
        <ol className="history-events" aria-label={`Recent ${pitchDisplay} pitch history`}>
          {events.map((event) => {
            const pitch = toDisplayPitch(event.concertMidi, pitchDisplay, instrument);
            const durationMs = event.endMs === undefined ? undefined : event.endMs - event.onsetMs;
            const width = durationMs === undefined
              ? 12
              : Math.max(12, Math.min(100, (durationMs / pitchHistoryWindowMs) * 100));
            const duration = durationMs === undefined ? "now" : `${(durationMs / 1_000).toFixed(1)} seconds`;

            return (
              <li
                key={`${event.onsetMs}-${event.concertMidi}`}
                className={event.endMs === undefined ? "is-current" : undefined}
                style={{ flexGrow: width }}
                aria-label={`${pitch.name}, ${duration}`}
              >
                <strong>{pitch.name}</strong>
                <span>{durationMs === undefined ? "now" : `${(durationMs / 1_000).toFixed(1)}s`}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
