import { Renderer, Stave, StaveConnector } from "vexflow";
import type { AccidentalPreference } from "../instruments/instruments";
import type { PitchHistoryEvent } from "../pitch/pitchHistory";
import type { ActiveStaff } from "./staffRouter";
import { layoutStaffHistory, type StaffHistoryMark } from "./staffHistoryLayout";

const staffHeight = 190;
const staffInset = 28;
const trebleStaffY = 10;
const bassStaffY = 92;
const svgNamespace = "http://www.w3.org/2000/svg";
const noteAreaInset = 68;
const noteAreaEndInset = 18;
const letterSteps: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

function staffY(mark: StaffHistoryMark): number {
  const [letter, octaveText] = mark.key.split("/");
  const step = Number(octaveText) * 7 + letterSteps[letter];
  const bottomStep = mark.staff === "treble" ? 4 * 7 + letterSteps.e : 2 * 7 + letterSteps.g;
  const bottomLineY = mark.staff === "treble" ? trebleStaffY + 80 : bassStaffY + 80;
  return bottomLineY - (step - bottomStep) * 5;
}

function addSvgElement(svg: SVGElement, name: string, attributes: Record<string, string>): SVGElement {
  const node = document.createElementNS(svgNamespace, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  svg.append(node);
  return node;
}

function drawMark(svg: SVGElement, mark: StaffHistoryMark, width: number): void {
  const x = noteAreaInset + mark.position * Math.max(1, width - noteAreaInset - noteAreaEndInset);
  const y = staffY(mark);
  const opacity = mark.current ? 1 : 0.28 + mark.recency * 0.42;
  const color = mark.current ? "#b15a23" : "#264d3d";
  const radiusX = mark.current ? 7.5 : 5.5;
  const radiusY = mark.current ? 5.3 : 3.8;
  const bottomLineY = mark.staff === "treble" ? trebleStaffY + 80 : bassStaffY + 80;
  const topLineY = bottomLineY - 40;

  for (let ledgerY = topLineY - 10; ledgerY >= y; ledgerY -= 10) {
    addSvgElement(svg, "line", { x1: `${x - 9}`, y1: `${ledgerY}`, x2: `${x + 9}`, y2: `${ledgerY}`, stroke: color, opacity: `${opacity}` });
  }
  for (let ledgerY = bottomLineY + 10; ledgerY <= y; ledgerY += 10) {
    addSvgElement(svg, "line", { x1: `${x - 9}`, y1: `${ledgerY}`, x2: `${x + 9}`, y2: `${ledgerY}`, stroke: color, opacity: `${opacity}` });
  }

  if (mark.accidental) {
    const accidental = mark.accidental === "#" ? "♯" : "♭";
    const text = addSvgElement(svg, "text", { x: `${x - radiusX - 10}`, y: `${y + 5}`, fill: color, opacity: `${opacity}`, "font-size": mark.current ? "17" : "14" });
    text.textContent = accidental;
  }
  addSvgElement(svg, "ellipse", {
    cx: `${x}`,
    cy: `${y}`,
    rx: `${radiusX}`,
    ry: `${radiusY}`,
    fill: color,
    opacity: `${opacity}`,
    transform: `rotate(-12 ${x} ${y})`,
    class: mark.current ? "staff-note-current" : "staff-note-history",
  });
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
  let svg = element.querySelector("svg");
  if (!svg || svg.getAttribute("data-staff-width") !== `${renderWidth}`) {
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
    svg = element.querySelector("svg");
    svg?.setAttribute("data-staff-width", `${renderWidth}`);
  }
  if (!svg) {
    return;
  }
  svg.querySelector(".staff-history-layer")?.remove();
  const layer = addSvgElement(svg, "g", { class: "staff-history-layer" });
  const marks = layoutStaffHistory(historyEvents, nowMs, accidentalPreference);
  if (marks.length === 0 && midi !== undefined && activeStaff !== undefined) {
    const fallbackEvent = { concertMidi: midi, onsetMs: nowMs, endMs: undefined };
    layoutStaffHistory([fallbackEvent], nowMs, accidentalPreference).forEach((mark) => drawMark(layer, mark, renderWidth));
    return;
  }
  marks.forEach((mark) => drawMark(layer, mark, renderWidth));
}
