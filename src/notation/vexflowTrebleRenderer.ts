import { Accidental, Renderer, Stave, StaveNote } from "vexflow";
import { concertMidiToTrebleNote } from "./treble";

const staffHeight = 190;
const staffInset = 12;

/** Renders one concert-pitch note on a treble staff using the VexFlow adapter. */
export function renderTrebleStaff(element: HTMLDivElement, midi: number | undefined, width: number): void {
  element.replaceChildren();

  const renderer = new Renderer(element, Renderer.Backends.SVG);
  renderer.resize(Math.max(width, 280), staffHeight);
  const context = renderer.getContext();
  const stave = new Stave(staffInset, 60, Math.max(width - staffInset * 2, 256));

  stave.addClef("treble").setContext(context).draw();

  if (midi === undefined) {
    return;
  }

  const pitch = concertMidiToTrebleNote(midi);
  const note = new StaveNote({ clef: "treble", keys: [pitch.key], duration: "q" });

  if (pitch.accidental) {
    note.addModifier(new Accidental(pitch.accidental));
  }

  note.setStave(stave).setContext(context);
  note.setX(staffInset + Math.max((width - 100) / 2, 110));
  note.draw();
}
