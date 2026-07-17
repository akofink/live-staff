# Issue 44 Bass-Clef Architecture

## Decision

Use one dynamically selected staff, not simultaneous treble and bass staves.
Render bass for low displayed pitches and retain the current treble presentation elsewhere.
The application is monophonic, so a second staff duplicates a single event, consumes scarce 320 px mobile space, and makes the active note less immediate.

Select the clef from the MIDI value that is actually notated and labeled.
That value is concert MIDI in concert mode and written MIDI after the issue #43 display transformation in written mode.
Do not select from the raw detected MIDI after that boundary, or the staff and text can disagree for a transposing instrument.
The selected instrument's `clef` metadata is not the selector for this issue because it describes conventional part notation, while issue #44 is an automatic low-register readability policy.
An instrument-specific fixed-clef mode should be a future explicit product decision, not an implicit exception to the automatic policy.

## Boundary And Hysteresis

Use a stateful automatic-clef selector with this policy.

| Previous clef | Stable displayed MIDI | Next clef | Rationale |
| --- | ---: | --- | --- |
| none | 59 (B3) or lower | bass | B3 and lower need two or more treble ledger lines but fit naturally on or inside bass staff. |
| none | 60 (C4) or higher | treble | Middle C is the expected lower treble entry point. |
| treble | 57 (A3) or lower | bass | A3 needs two treble ledger lines and is the bass staff's top line. |
| treble | 58-127 | treble | Retain treble through the deadband. |
| bass | 60 (C4) or higher | treble | C4 is one ledger line in either clef and is the familiar treble threshold. |
| bass | 0-59 | bass | Retain bass through the deadband. |

The 58-59 MIDI deadband, A-sharp3 to B3, makes direction explicit instead of flipping at a single boundary.
Reset the selector when listening stops, just as `NoteStabilizer.reset()` clears the live display state.
The initial selection rule is intentionally biased to bass through B3 so a low voice arriving from silence is never first shown with excessive treble ledger lines.

`NoteStabilizer` already prevents changes to a different MIDI note until two consecutive detector frames arrive and holds the displayed note over four missing frames at the 80 ms sampling cadence (`src/pitch/stabilizer.ts:9-45`, `src/app/App.tsx:50-66`).
The clef selector is a second, independent display hysteresis layer, not a modification to pitch stabilization.
It receives only stable displayed MIDI, so alternating raw estimates cannot make the clef flicker.

## Rendering And Accessibility

Generalize the adapter rather than adding a second renderer.
VexFlow 5 supports the required pair through matching `stave.addClef("treble" | "bass")` and `new StaveNote({ clef, ... })` calls.
Pass the exact same selected clef to both calls because VexFlow uses the note's clef to calculate its vertical position.
The existing `concertMidiToTrebleNote()` conversion only creates VexFlow `letter/octave` keys and accidentals; it is usable for bass but should be renamed to remove the inaccurate treble-specific contract.

Keep the SVG `aria-hidden="true"`.
Make the figure's accessible name and caption state both the clef and displayed pitch, for example `Bass staff showing concert A3` and `Concert pitch: A3. Bass clef.`.
Do not place the rapidly changing note or clef in a live region.
The existing textual note display remains the stable, equivalent non-graphic representation required by `docs/ux.md:27-32`.

The staff keeps its current fixed 190 px canvas height (`src/notation/vexflowTrebleRenderer.ts:4`) and responsive SVG scaling (`src/styles/global.css:222-232`).
That is sufficient for one staff with moderate ledger lines.
Avoid animated clef transitions and do not communicate the selected clef only with the glyph.

## Current Boundaries

`TrebleStaff` dynamically imports and invokes `renderTrebleStaff()` with raw stabilized concert MIDI (`src/components/TrebleStaff.tsx:3-52`, `src/app/App.tsx:125-129`).
`vexflowTrebleRenderer.ts` hard-codes `"treble"` both for the stave and note (`src/notation/vexflowTrebleRenderer.ts:16-23`).
This is the narrow implementation seam for issue #44.

At this branch point, the written-pitch preference is only UI state: the app deliberately renders concert `note?.midi` and shows `--` for a non-concert written selection (`src/app/App.tsx:90-139`).
The pure `concertToWrittenMidi()` transformation and catalog clefs exist in `src/instruments/transposition.ts:3-9` and `src/instruments/instruments.ts:10-17`.
Issue #43 must own selecting and labeling the displayed MIDI.
Issue #44 should consume that selected MIDI and must not duplicate transposition or label logic.

## Minimal Implementation Plan

1. Add a pure `src/notation/clef.ts` selector that accepts the prior automatic clef plus integer displayed MIDI and returns `"treble"` or `"bass"` according to the table.
2. Rename `src/notation/treble.ts` and `src/notation/vexflowTrebleRenderer.ts` to generic staff/pitch names, preserving the existing deterministic sharp spelling behavior.
3. Change the renderer to accept `{ midi, clef }`, use that clef for `addClef()` and `StaveNote`, and retain the existing formatter call on every render.
4. Rename `TrebleStaff` to a generic staff component and retain selected clef in a ref or state that resets on a stopped session.
5. Have the app pass the single display-model value supplied by the #43 integration, then derive figure and caption text from its pitch label plus clef.
6. Update `docs/ux.md` and `docs/testing-strategy.md` with automatic-clef behavior and its boundary coverage.

Avoid adding a clef preference, an instrument exception table, or a second simultaneous staff in this issue.

## Deterministic Test Plan

1. Unit-test the pure selector for initial B3 (59) bass and C4 (60) treble selection, treble-to-bass at A3 (57), bass-to-treble at C4 (60), and each unchanged deadband value (A-sharp3 and B3).
2. Feed the selector the stabilized sequence C4, B3, B3, A3 and assert treble, treble, treble, bass; then A-sharp3, B3, C4 and assert bass, bass, treble.
3. Extend the renderer mock in `src/notation/vexflowTrebleRenderer.test.ts` to capture `Stave.addClef()` and `StaveNote` constructor arguments, asserting the same selected clef reaches both for A3 and C4 and formatting still occurs on repeated renders.
4. Preserve the conversion tests, rename them with the generic adapter, and add A3, B3, and C4 key assertions so clef selection is tested separately from MIDI spelling.
5. Add a component/browser test with deterministic display-model inputs, not microphone timing, that checks the figure label and caption for both clefs, checks the SVG is hidden from the accessibility tree, and confirms the 320 px layout keeps one visible staff.
6. Keep existing `NoteStabilizer` sequence tests as the raw-input flicker defense; do not test clef hysteresis through nondeterministic audio fixtures.

## UX Sketch

```text
Stable concert A3

Bass staff showing concert A3
[ bass clef and A3 on the top staff line ]
Concert pitch: A3. Bass clef.

A3
CONCERT PITCH
```

No new GitHub issue is needed.
The automatic-clef work is fully within issue #44, while the display-model integration is already tracked by issue #43.
