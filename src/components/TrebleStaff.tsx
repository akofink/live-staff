import { useEffect, useRef, useState } from "react";

type TrebleStaffRenderer = typeof import("../notation/vexflowTrebleRenderer");

let rendererModule: Promise<TrebleStaffRenderer> | undefined;

function loadVexflowRenderer(): Promise<TrebleStaffRenderer> {
  rendererModule ??= import("../notation/vexflowTrebleRenderer");
  return rendererModule;
}

interface TrebleStaffProps {
  readonly midi: number | undefined;
  readonly noteName: string | undefined;
  readonly loadRenderer: boolean;
}

export function TrebleStaff({ midi, noteName, loadRenderer }: TrebleStaffProps) {
  const container = useRef<HTMLDivElement>(null);
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

    void loadVexflowRenderer().then(({ renderTrebleStaff }) => {
      if (cancelled) {
        return;
      }

      const render = () => renderTrebleStaff(element, midi, element.clientWidth);
      observer = new ResizeObserver(render);
      observer.observe(element);
      render();
      setRendererLoaded(true);
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [loadRenderer, midi]);

  return (
    <figure className="staff-display" aria-label={noteName ? `Treble staff showing ${noteName}` : "Empty treble staff"}>
      <div ref={container} className="staff-graphic" aria-busy={loadRenderer && !rendererLoaded} aria-hidden="true" />
      <figcaption>{noteName ? `Concert pitch: ${noteName}` : "Waiting for a stable concert pitch."}</figcaption>
    </figure>
  );
}
