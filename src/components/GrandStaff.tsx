import { useEffect, useRef, useState } from "react";
import type { AccidentalPreference } from "../instruments/instruments";
import type { InstrumentDefinition } from "../instruments/instruments";
import { toDisplayPitch, type PitchRepresentation } from "../instruments/displayPitch";
import type { PitchHistoryEvent } from "../pitch/pitchHistory";
import { selectActiveStaff, type ActiveStaff } from "../notation/staffRouter";

type GrandStaffRenderer = typeof import("../notation/vexflowGrandStaffRenderer");

let rendererModule: Promise<GrandStaffRenderer> | undefined;

function loadVexflowRenderer(): Promise<GrandStaffRenderer> {
  rendererModule ??= import("../notation/vexflowGrandStaffRenderer");
  return rendererModule;
}

interface GrandStaffProps {
  readonly midi: number | undefined;
  readonly noteName: string | undefined;
  readonly accidentalPreference: AccidentalPreference;
  readonly pitchLabel: string;
  readonly loadRenderer: boolean;
  readonly historyEvents: readonly PitchHistoryEvent[];
  readonly historyNowMs: number;
  readonly instrument: InstrumentDefinition;
  readonly pitchDisplay: PitchRepresentation;
}

export function GrandStaff({ midi, noteName, accidentalPreference, pitchLabel, loadRenderer, historyEvents, historyNowMs, instrument, pitchDisplay }: GrandStaffProps) {
  const container = useRef<HTMLDivElement>(null);
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | undefined>(undefined);
  const [rendererLoaded, setRendererLoaded] = useState(false);

  useEffect(() => {
    const element = container.current;
    if (!element) {
      return;
    }

    if (!loadRenderer) {
      element.replaceChildren();
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | undefined;

    void loadVexflowRenderer().then(({ renderGrandStaff }) => {
      if (cancelled) {
        return;
      }

      const nextActiveStaff = midi === undefined
        ? undefined
        : selectActiveStaff(activeStaff, midi);
      if (nextActiveStaff && nextActiveStaff !== activeStaff) {
        setActiveStaff(nextActiveStaff);
      }
      const displayHistory = historyEvents.map((event) => ({
        ...event,
        concertMidi: toDisplayPitch(event.concertMidi, pitchDisplay, instrument).midi,
      }));
      const render = () => renderGrandStaff(element, midi, nextActiveStaff, accidentalPreference, element.clientWidth, displayHistory, historyNowMs);
      observer = new ResizeObserver(render);
      observer.observe(element);
      render();
      setRendererLoaded(true);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [accidentalPreference, activeStaff, historyEvents, historyNowMs, instrument, loadRenderer, midi, pitchDisplay]);

  const activeStaffName = midi === undefined
    ? undefined
    : selectActiveStaff(activeStaff, midi);
  const historyDescription = historyEvents.reduce<{ staff: ActiveStaff | undefined; descriptions: string[] }>((summary, event) => {
    const pitch = toDisplayPitch(event.concertMidi, pitchDisplay, instrument);
    const staff = selectActiveStaff(summary.staff, pitch.midi);
    const ageSeconds = Math.max(0, Math.round((historyNowMs - event.onsetMs) / 1_000));
    const description = event.endMs === undefined
      ? `${pitch.name}, current, ${staff} staff`
      : `${pitch.name}, ${staff} staff, about ${ageSeconds} seconds old`;
    return { staff, descriptions: [...summary.descriptions, description] };
  }, { staff: undefined, descriptions: [] }).descriptions.join("; ");
  const description = noteName && activeStaffName
    ? `Grand staff with a 10-second pitch history showing current ${pitchLabel.toLowerCase()} ${noteName} on the ${activeStaffName} staff`
    : historyEvents.length > 0
      ? `Grand staff with ${historyEvents.length} recent ${pitchDisplay} pitch ${historyEvents.length === 1 ? "event" : "events"}`
      : "Grand staff with an empty 10-second pitch history";

  return (
    <figure className="staff-display" aria-label={description}>
      <div ref={container} className="staff-graphic" aria-busy={loadRenderer && !rendererLoaded} aria-hidden="true" />
      <figcaption>
        <span>{noteName && activeStaffName ? `${pitchLabel}: ${noteName}. ${activeStaffName === "bass" ? "Bass" : "Treble"} staff.` : historyEvents.length > 0 ? "Recent pitch memory." : "Waiting for a stable pitch."}</span>
        <span aria-hidden="true">Past 10s · older notes fade · now</span>
        <span className="visually-hidden">{historyDescription ? `Pitch history, oldest to newest: ${historyDescription}.` : "No recent stable notes."}</span>
      </figcaption>
    </figure>
  );
}
