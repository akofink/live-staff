# Browser-Only Monophonic Melody Transcription Feasibility

## Decision

Ship a bounded proportional-time history layout as an explicit experimental view.
Keep equal event spacing as the default a-rhythmic mode.
Do not infer meter, tempo, pulse, measures, note values, or written rests.
Do not claim detector accuracy or 1.0 completion.

This report answers [issue #98](https://github.com/akofink/live-staff/issues/98).
It is post-1.0 experimental work and must not delay [#71](https://github.com/akofink/live-staff/issues/71) or [#72](https://github.com/akofink/live-staff/issues/72).

## Three Distinct Layers

Observed timing, uncertainty, and inferred musical rhythm are different products.

**Observed timing** is already in Live Staff.
Committed events carry onset, optional end, elapsed duration, and a rolling 10-second window.
That data supports chronology and density without introducing musical meter.

**Uncertainty** is currently collapsed.
The stabilizer holds a stable note through a few missing frames, then drops it.
Missing estimates, low-confidence frames, room-gate suppression, and true acoustic silence all become "no stable note."
History stores only committed pitches, not gap events.

**Inferred musical rhythm** is a later interpretive layer.
Written rests, note values, tempo, pulse, measures, and quantization must not appear until the application can distinguish intentional silence from detector uncertainty and can show confidence or invite correction.

## Current Baseline

`PitchHistory` stores canonical concert MIDI with listening-session onset and end timestamps.
It retains at most 10 seconds and 32 events.
[#97](https://github.com/akofink/live-staff/issues/97) already exports that snapshot as local CSV, JSON, or plain text and labels timing as observed elapsed milliseconds.

The default staff layout is a-rhythmic.
Completed notes are spaced equally by event index.
The current note stays in a fixed right-hand lane.
Recency fades by onset age, but horizontal position does not follow timestamps.

The VexFlow glyph uses `duration: "q"` with a hidden stem.
That string selects a notehead shape.
It is not a quarter-note value, a beat, or a rest.

The production detector remains a replaceable monophonic autocorrelation adapter.
[#77](https://github.com/akofink/live-staff/issues/77) and the broader [#82](https://github.com/akofink/live-staff/issues/82) corpus are still open.
No detector-accuracy claim follows from this layout work.

## Quality Metrics

Useful transcription quality is not one score.
Measure each layer separately.

| Layer | What to measure | Honest current status |
| --- | --- | --- |
| Pitch sequence | Committed MIDI versus intended notes, including octave-error rate | Depends on the detector and fixtures. Not claimed here. |
| Segmentation | Onset and release versus intended note boundaries, including repeated-note splits | Stabilizer continuation cannot rearticulate the same MIDI without a drop longer than the hold window. |
| Observed silence | Time after a committed release with no new stable pitch | Visible only as the absence of a note. Not labeled. |
| Uncertainty | Frames with no estimate, hold-window gaps, gated noise, and low confidence | Collapsed into the same empty state as silence. |
| Inferred rests | Silence classified as a musical rest with a reviewed decision rule | Deferred. No rest symbols. |
| Timing layout | Horizontal position versus stored onset in the rolling window | Event mode ignores timestamps. Proportional mode can match onsets exactly. |
| Optional rhythm | Tempo confidence, quantization error, edit burden after correction | Deferred. No pulse, grid, or note values. |

Latency, CPU, memory, mobile layout, and privacy remain the existing product budgets.
This change must not add continuous work when the view is idle, must keep the 320 CSS-pixel layout without page scrolling, and must preserve local-only audio handling.

## Bounded Implementation

The justified slice is a second history-spacing mode:

- Default **event spacing** keeps the shipped a-rhythmic layout.
- **Proportional time** places completed noteheads by observed onset in the rolling 10-second window.
- The current note remains in the fixed current lane.
- Empty horizontal space is unclassified gap, not silence, not uncertainty, and not a rest.
- The notehead glyph stays uniform.
- There is no time signature, beat grid, barline, note-value change, or rest symbol.
- The mode is session-only and is not persisted.

This slice uses timestamps the application already stores.
It does not require a new detector, a new history schema, or a rhythm model.

Duration is already exported as elapsed milliseconds.
This slice does not draw duration as a note value or as a varying glyph.
Inter-onset space therefore includes sounding tail, true silence, and uncertain gaps together.

## Deferred Work

Do not add rhythm-aware rendering, tempo or pulse estimation, quantization, or written rests in this slice.
Those experiments need a reviewed silence-versus-uncertainty rule, confidence, and undo or edit affordances.

Do not add first-class gap events until stabilizer output can name hold, absence, and suppression separately.
Do not treat existing piano fixtures or synthetic tones as a melody-transcription corpus.
Project-owned voice and multi-instrument melody recordings remain part of [#82](https://github.com/akofink/live-staff/issues/82) and attended capture.

Standard MIDI File export remains deferred for the reasons in [export MIDI feasibility](export-midi-feasibility.md).
It would still be an elapsed-time container, not rhythmic transcription.

## Failure Cases

These cases must stay visible rather than be smoothed into invented notation.

- **Vibrato** can keep one MIDI or flicker if it crosses a rounding boundary.
- **Portamento or glide** becomes integer MIDI steps because history stores committed notes, not continuous pitch.
- **Repeated notes** on the same MIDI merge unless the stabilizer drops between them.
- **Rubato** is visible in proportional time as uneven onsets and is exactly what a beat grid would hide.
- **Background noise** can commit false notes or suppress true ones before history ever sees them.
- **Uncertain gaps** currently look like any other empty space.
- **Missed onsets** are omitted; proportional spacing cannot recover them.
- **Octave errors** place the wrong staff position with ordinary confidence.

## Recommendation

Implement the bounded proportional-time view now.
Keep a-rhythmic event spacing available and default.
Keep the three layers distinct in documentation, UI copy, and export disclaimers.
Revisit rest symbols, pulse, and quantization only after detector evidence from #77 and a broader #82 corpus can support a silence-versus-uncertainty rule.

This recommendation is a layout decision, not a transcription-quality claim.
