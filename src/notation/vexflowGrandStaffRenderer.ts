import { Accidental, Renderer, Stave, StaveConnector, StaveNote, TickContext } from "vexflow";
import type { AccidentalPreference } from "../instruments/instruments";
import type { PitchHistoryEvent } from "../pitch/pitchHistory";
import type { ActiveStaff } from "./staffRouter";
import { layoutStaffHistory, type StaffHistoryMark } from "./staffHistoryLayout";

const staffHeight = 190;
const staffInset = 28;
const trebleStaffY = 10;
const bassStaffY = 92;
const noteAreaInset = 68;
const currentNoteEndInset = 34;
const currentLaneWidth = 58;
const notationColor = "#264d3d";

interface RendererState {
  readonly width: number;
  readonly context: ReturnType<Renderer["getContext"]>;
  readonly trebleStave: Stave;
  readonly bassStave: Stave;
}

const rendererStates = new WeakMap<HTMLDivElement, RendererState>();

function drawMark(state: RendererState, mark: StaffHistoryMark): void {
  const currentX = state.width - currentNoteEndInset;
  const historyEnd = currentX - currentLaneWidth;
  const x = mark.current
    ? currentX
    : noteAreaInset + mark.position * Math.max(1, historyEnd - noteAreaInset);
  const stave = mark.staff === "treble" ? state.trebleStave : state.bassStave;
  const group = state.context.openGroup(mark.current ? "staff-note-current" : "staff-note-history");
  group.setAttribute("data-note-x", `${x}`);
  group.setAttribute("data-accidental", mark.accidental ?? "");
  group.setAttribute("opacity", `${mark.current ? 1 : 0.3 + mark.recency * 0.45}`);
  const note = new StaveNote({
    keys: [mark.key],
    duration: "q",
    clef: mark.staff,
    autoStem: false,
  });
  if (mark.accidental) note.addModifier(new Accidental(mark.accidental), 0);
  note
    .setStave(stave)
    .setContext(state.context)
    .setStyle({
      fillStyle: notationColor,
      strokeStyle: notationColor,
    })
    .setStemStyle({ fillStyle: "transparent", strokeStyle: "transparent" });
  new TickContext().addTickable(note).preFormat().setX(x - stave.getNoteStartX());
  note.draw();
  state.context.closeGroup();
}

/** Renders an a-rhythmic chronological pitch memory on a persistent grand staff. */
export function renderGrandStaff(
  element: HTMLDivElement,
  midi: number | undefined,
  activeStaff: ActiveStaff | undefined,
  accidentalPreference: AccidentalPreference,
  width: number,
  historyEvents: readonly PitchHistoryEvent[] = [],
  nowMs = 0,
): void {
  const renderWidth = Math.max(width, 280);
  let state = rendererStates.get(element);
  if (!state || state.width !== renderWidth) {
    element.replaceChildren();
    const renderer = new Renderer(element, Renderer.Backends.SVG);
    renderer.resize(renderWidth, staffHeight);
    const context = renderer.getContext();
    const staffWidth = Math.max(width - staffInset - 12, 240);
    const trebleStave = new Stave(staffInset, trebleStaffY, staffWidth);
    const bassStave = new Stave(staffInset, bassStaffY, staffWidth);

    trebleStave.addClef("treble").setContext(context).draw();
    bassStave.addClef("bass").setContext(context).draw();
    new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.BRACE).setContext(context).draw();
    new StaveConnector(trebleStave, bassStave).setType(StaveConnector.type.SINGLE_LEFT).setContext(context).draw();
    state = { width: renderWidth, context, trebleStave, bassStave };
    rendererStates.set(element, state);
  }
  const svg = element.querySelector("svg");
  if (!svg) {
    return;
  }
  svg.querySelector(".vf-staff-notation-layer")?.remove();
  state.context.openGroup("staff-notation-layer");
  const marks = layoutStaffHistory(historyEvents, nowMs, accidentalPreference, activeStaff);
  if (marks.length === 0 && midi !== undefined && activeStaff !== undefined) {
    const fallbackEvent = { concertMidi: midi, onsetMs: nowMs, endMs: undefined };
    layoutStaffHistory([fallbackEvent], nowMs, accidentalPreference, activeStaff).forEach((mark) => drawMark(state, mark));
  } else {
    marks.forEach((mark) => drawMark(state, mark));
  }
  state.context.closeGroup();
}
