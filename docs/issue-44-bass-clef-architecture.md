# Issue 44 Grand-Staff Architecture

## Decision

Render a persistent piano-style grand staff with aligned treble and bass clefs.
Render each monophonic stable pitch exactly once on its selected staff.
The persistent two-staff frame centers the visible pitch across a wide register, removes clef replacement from the live interaction, and establishes the visual model for future simultaneous pitches.

Select the active staff from the MIDI value that is actually notated and labeled.
That value is concert MIDI in concert mode and written MIDI after the issue #43 display transformation in written mode.
Do not select from raw detected MIDI after that boundary, or the staff and text can disagree for a transposing instrument.
The selected instrument's `clef` metadata is not the selector for this issue because it describes conventional part notation, while issue #44 routes a pitch in the persistent grand-staff display.

## Active-Staff Routing

Use a stateful staff router with this policy.

| Previous active staff | Stable displayed MIDI | Next active staff | Rationale |
| --- | ---: | --- | --- |
| none | 59 (B3) or lower | bass | B3 and lower are most legible in the bass staff on initial display. |
| none | 60 (C4) or higher | treble | Middle C is the expected lower treble entry point. |
| treble | 58 (A-sharp3) or lower | bass | Move to bass before the note needs more than two treble ledger lines. |
| treble | 59-127 | treble | Retain treble for the B3 deadband. |
| bass | 60 (C4) or higher | treble | C4 is one ledger line from either staff and is the treble entry point. |
| bass | 0-59 | bass | Retain bass for the B3 deadband. |

The one-note B3 deadband prevents the note from jumping between staves during nearby pitch variation while keeping it centered in a comfortable grand-staff range.
The initial rule chooses bass for B3 so a low voice arriving from silence appears in its more legible position.
Reset the router when listening stops, just as `NoteStabilizer.reset()` clears the live display state.

`NoteStabilizer` already requires two consecutive detector frames before a different MIDI note appears and holds the displayed note through four missing frames at the 80 ms sampling cadence (`src/pitch/stabilizer.ts:9-45`, `src/app/App.tsx:50-66`).
The router is a second, independent display hysteresis layer, not a modification to pitch stabilization.
It receives only stable displayed MIDI, so alternating raw estimates cannot move the rendered note between staves.

## Layout And Rendering

Generalize the adapter rather than adding a separate bass renderer.
Create two equal-width `Stave` instances in one VexFlow SVG renderer, add `"treble"` to the upper stave and `"bass"` to the lower stave, and join them with the standard grand-staff left brace and vertical connector.
Use the same horizontal start and end coordinates for both staves so the active note has one shared visual beat position.

Increase the renderer height from the current 190 px (`src/notation/vexflowTrebleRenderer.ts:4`) to approximately 250 px.
Place the upper stave near 28 px and the lower stave near 145 px, retaining at least 70 px between the upper staff's bottom line and lower staff's top line.
This leaves room for the brace, both clefs, and C4 ledger lines without crowding the system.
Continue to use the current 280 px minimum render width and responsive SVG scaling (`src/styles/global.css:222-232`).

Create one `StaveNote` and one `Voice` only when a stable pitch exists.
Route that note and voice to the selected stave, pass the matching selected clef to `StaveNote`, and leave the other stave empty but visible.
Use the same formatter width for either stave so an A3 and C4 occupy the same horizontal location.
Do not duplicate the note, use cross-staff notation, or animate routing in this issue.

VexFlow 5 provides the required APIs through `stave.addClef("treble" | "bass")`, `new StaveNote({ clef, ... })`, and `StaveConnector`.
The existing `concertMidiToTrebleNote()` conversion only creates VexFlow `letter/octave` keys and accidentals, so it can serve both staves after being renamed to remove its inaccurate treble-specific contract.

## Accessibility

Keep the generated SVG `aria-hidden="true"` because the complete musical state is represented as stable text.
Name the figure and caption with the full layout, pitch, and active staff, for example `Grand staff showing concert A3 on the bass staff` and `Concert pitch: A3. Bass staff.`.
The persistent presence of both clefs must be communicated in text, not inferred from their glyphs.
Do not put the rapidly changing pitch or active staff in a live region.
The existing textual note display remains the equivalent non-graphic presentation required by `docs/ux.md:27-32`.

## Implemented Boundaries

`GrandStaff` dynamically imports `renderGrandStaff()` and receives only the stable `displayPitch` from `App` (`src/components/GrandStaff.tsx`, `src/app/App.tsx`).
That display model is calculated by #43 from canonical concert MIDI at the display boundary in `src/instruments/displayPitch.ts`.
The grand-staff implementation neither derives written MIDI nor labels pitches itself.

`src/notation/staffRouter.ts` selects the active staff from display MIDI.
`src/notation/vexflowGrandStaffRenderer.ts` creates both staves and routes one formatted `StaveNote` to that selected stave.
The UI derives the figure name, caption, text label, note spelling, and active staff from the same display model.

No clef preference, instrument exception table, second note, or cross-staff notation is added in this issue.

## Deterministic Test Plan

1. Unit-test the pure router for initial B3 (59) bass and C4 (60) treble routing, treble-to-bass at A-sharp3 (58), bass-to-treble at C4 (60), and the retained B3 deadband in both directions.
2. Feed the router the stabilized sequence C4, B3, B3, A-sharp3 and assert treble, treble, treble, bass; then B3, C4 and assert bass, treble.
3. Extend the VexFlow mock in `src/notation/vexflowGrandStaffRenderer.test.ts` to capture both `Stave.addClef()` calls, connector creation, stave coordinates, `StaveNote` constructor arguments, and `Voice.draw()` targets.
4. Assert that every render creates visible treble and bass staves, creates no note while waiting, and creates exactly one note and voice on the selected staff for A3 and C4.
5. Preserve formatter assertions and verify both routes use equal horizontal format widths, so the active note shares one beat position across the grand staff.
6. Preserve conversion tests under generic names and add A3, B3, and C4 key assertions so spelling remains separate from routing.
7. Add component/browser coverage with deterministic display-model inputs, not microphone timing, that verifies the accessible grand-staff label and caption for both routes, one `aria-hidden` SVG containing both staves, one displayed note, and an intact 320 px layout.
8. Keep existing `NoteStabilizer` sequence tests as the raw-input flicker defense; do not test staff routing through nondeterministic audio fixtures.

## UX Sketch

```text
Grand staff showing concert A3 on the bass staff

treble clef  [ empty upper staff ]
     brace
bass clef    [ A3 on the bass staff ]

Concert pitch: A3. Bass staff.

A3
CONCERT PITCH
```

No new GitHub issue is needed.
The grand-staff work is fully within issue #44, while display-model integration remains tracked by issue #43.
