# Standard MIDI File Export Feasibility

## Decision

Do not ship Standard MIDI File export with the first local history export.
Keep CSV, JSON, and plain text as the transparent formats for committed stable-note history.
If SMF is added later, it must remain an unquantized elapsed-time container and must not claim rhythmic transcription.

## Current Baseline

Live Staff stores bounded in-memory history as canonical concert MIDI with onset and end timestamps in listening-session milliseconds.
It does not store meter, tempo, beat, key, dynamics, or note values.
Exports are generated only after an explicit user action and stay on the device.

## Required Mapping If SMF Is Added

SMF needs a tick division and a tempo meta-event even when the source data has no musical tempo.

The only mapping that preserves observed elapsed time without inventing a groove is:

- Set tempo to 1,000,000 microseconds per quarter note, which is 60 BPM as a container clock.
- Set division to 1,000 ticks per quarter note.
- Map 1 millisecond of listening-session time to 1 tick.
- Emit note-on at onset and note-off at the stored end or at export time for a still-sounding event.
- Use concert MIDI note numbers on channel 0.
- Use a placeholder velocity such as 64, never detected loudness.

Do not write a time signature, key signature, quantized durations, or tempo changes.
Any SMF file must include the same elapsed-time disclaimer carried by the text formats.

## Why This Is Deferred

A Standard MIDI File still looks like notation-ready performance data to downstream tools.
Those tools will quantize, snap, and interpret the dummy 60 BPM clock as music unless the user already knows it is a container.
CSV, JSON, and plain text make the elapsed-time contract visible without that implication.
No additional dependency is justified until there is evidence that users need SMF specifically.

## Non-Goals

This evaluation is not a transcription feature, score export, practice-log sync, or a claim that Live Staff measures tempo or meter.
