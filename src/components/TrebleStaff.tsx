import { useEffect, useRef } from "react";
import { renderTrebleStaff } from "../notation/vexflowTrebleRenderer";

interface TrebleStaffProps {
  readonly midi: number | undefined;
  readonly noteName: string | undefined;
}

export function TrebleStaff({ midi, noteName }: TrebleStaffProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) {
      return;
    }

    const render = () => renderTrebleStaff(element, midi, element.clientWidth);
    const observer = new ResizeObserver(render);

    observer.observe(element);
    render();
    return () => observer.disconnect();
  }, [midi]);

  return (
    <figure className="staff-display" aria-label={noteName ? `Treble staff showing ${noteName}` : "Empty treble staff"}>
      <div ref={container} className="staff-graphic" aria-hidden="true" />
      <figcaption>{noteName ? `Concert pitch: ${noteName}` : "Waiting for a stable concert pitch."}</figcaption>
    </figure>
  );
}
