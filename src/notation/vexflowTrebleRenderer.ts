import { Accidental, Formatter, Renderer, Stave, StaveNote, Voice } from "vexflow";
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

  const voice = new Voice({ numBeats: 1, beatValue: 4 }).addTickables([note]);
  new Formatter().joinVoices([voice]).format([voice], stave.getNoteEndX() - stave.getNoteStartX());
  voice.draw(context, stave);
}
