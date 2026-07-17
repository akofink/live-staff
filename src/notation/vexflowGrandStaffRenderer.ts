import { Accidental, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from "vexflow";
import type { AccidentalPreference } from "../instruments/instruments";
import type { ActiveStaff } from "./staffRouter";
import { midiToStaffNote } from "./staffNote";

const staffHeight = 250;
const staffInset = 28;
const trebleStaffY = 28;
const bassStaffY = 145;

/** Renders one display-pitch note on a persistent piano-style grand staff. */
export function renderGrandStaff(
  element: HTMLDivElement,
  midi: number | undefined,
  activeStaff: ActiveStaff | undefined,
  accidentalPreference: AccidentalPreference,
  width: number,
): void {
  element.replaceChildren();

  const renderer = new Renderer(element, Renderer.Backends.SVG);
  renderer.resize(Math.max(width, 280), staffHeight);
  const context = renderer.getContext();
  const staffWidth = Math.max(width - staffInset - 12, 240);
  const trebleStave = new Stave(staffInset, trebleStaffY, staffWidth);
  const bassStave = new Stave(staffInset, bassStaffY, staffWidth);

  trebleStave.addClef("treble").setContext(context).draw();
  bassStave.addClef("bass").setContext(context).draw();
  new StaveConnector(trebleStave, bassStave)
    .setType(StaveConnector.type.BRACE)
    .setContext(context)
    .draw();
  new StaveConnector(trebleStave, bassStave)
    .setType(StaveConnector.type.SINGLE_LEFT)
    .setContext(context)
    .draw();

  if (midi === undefined || activeStaff === undefined) {
    return;
  }

  const pitch = midiToStaffNote(midi, accidentalPreference);
  const note = new StaveNote({ clef: activeStaff, keys: [pitch.key], duration: "q" });

  if (pitch.accidental) {
    note.addModifier(new Accidental(pitch.accidental));
  }

  const voice = new Voice({ numBeats: 1, beatValue: 4 }).addTickables([note]);
  const activeStave = activeStaff === "treble" ? trebleStave : bassStave;
  new Formatter().joinVoices([voice]).format([voice], activeStave.getNoteEndX() - activeStave.getNoteStartX());
  voice.draw(context, activeStave);
}
