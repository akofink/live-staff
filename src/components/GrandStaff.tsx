import { useEffect, useRef, useState } from "react";
import type { AccidentalPreference } from "../instruments/instruments";
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
}

export function GrandStaff({ midi, noteName, accidentalPreference, pitchLabel, loadRenderer }: GrandStaffProps) {
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
      const render = () => renderGrandStaff(element, midi, nextActiveStaff, accidentalPreference, element.clientWidth);
      observer = new ResizeObserver(render);
      observer.observe(element);
      render();
      setRendererLoaded(true);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [accidentalPreference, activeStaff, loadRenderer, midi]);

  const activeStaffName = midi === undefined
    ? undefined
    : selectActiveStaff(activeStaff, midi);
  const description = noteName && activeStaffName
    ? `Grand staff showing ${pitchLabel.toLowerCase()} ${noteName} on the ${activeStaffName} staff`
    : "Empty grand staff";

  return (
    <figure className="staff-display" aria-label={description}>
      <div ref={container} className="staff-graphic" aria-busy={loadRenderer && !rendererLoaded} aria-hidden="true" />
      <figcaption>{noteName && activeStaffName ? `${pitchLabel}: ${noteName}. ${activeStaffName === "bass" ? "Bass" : "Treble"} staff.` : "Waiting for a stable concert pitch."}</figcaption>
    </figure>
  );
}
