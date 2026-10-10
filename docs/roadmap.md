# Roadmap

## Milestone 0: Repository Bootstrap

**Status: Completed.**

Establish the app shell, strict TypeScript, linting, tests, documentation, and a static build.

## Milestone 1: Audio Technical Spike

**Status: Completed.**

Capture microphone input after a user action, access frames, evaluate one detector, and show frequency diagnostics.
Success means sustained voice or a generated tone produces plausible estimates.

## Milestone 2: Stable Note Detection

**Status: Completed for the proof of concept.**

Add conversion, thresholds, stabilization, gap holding, and silence behavior.
Success means a sustained note remains stable enough to read.

## Milestone 3: Staff Rendering

**Status: Completed and expanded.**

Render accidentals and ledger lines through a replaceable adapter.
The shipped persistent grand staff routes notes between treble and bass clefs, holds the current note at a stable coordinate, and advances the bounded 10-second a-rhythmic history independently.

## Milestone 4: Instrument Model

**Status: Completed.**

Add data-driven instruments, bass clef, transposition, and written plus concert views.
Success means known concert pitches render correctly for several instrument types.
The app selects written notation automatically for transposing instruments, provides a compact sounding-pitch reference, and intentionally avoids a second primary pitch-display control.

## Milestone 5: Proof of Concept

**Status: Shipped as a personal preview.**

Complete the first-run flow, selector, microphone states, labels, and phone layout.
Success means a new user can understand the app without instruction.
Subsequent shipped work added progressive disclosure, local preferences, room calibration, opt-in waveform and spectrum diagnostics, up to four bounded interactive filters, and a configurable A4 reference pitch.

## Milestone 6: Transposition Coach

**Status: Completed.**

Add target-instrument selection and a dual display derived independently from canonical concert pitch.
[Issue #123](https://github.com/akofink/live-staff/issues/123) scoped the milestone into slices and is closed.
The first slice added a session-only target choice in Setup and a compact target pitch readout; the final #123 follow-up saves that choice locally and broadens it to existing treble- and bass-clef definitions.
The second slice moved that readout beneath the player staff caption so it is visible sooner on a phone; it deferred a second staff and aligned target history after a 320 px comparison showed both cost space without a clear readability gain.
Player and target pitches are each derived from the same concert MIDI, never from each other.
Target choices are compared as text only; no target staff is rendered, and alto- or tenor-clef notation remains unsupported. A second target staff and aligned target history remain deferred.

## Milestone 7: Version 1.0 Hardening

**Status: Retired.**

A numbered 1.0 release is not current work.
The site stays an unversioned preview.
The offline behavior is already decided: a loaded page keeps working if the network drops, and a new visit still needs a connection.
There is no service worker and no persistent application cache.

Do not revive the closed device-evidence, release-review, detector-research, or capture-corpus issues as a milestone exit.
See [ADR 0005](adr/0005-personal-preview-not-release-program.md).

## Deferred Work

Standard MIDI File export, polyphonic input, automatic instrument recognition, persisted session history or practice logs, lessons, teacher tools, accounts, analytics, and native applications stay deferred until there is a reason to build them.
Local CSV, JSON, and plain-text export of the bounded in-memory stable-note history shipped for [issue #97](https://github.com/akofink/live-staff/issues/97); SMF remains deferred for the reasons in [export MIDI feasibility](export-midi-feasibility.md).
Proportional-time history shipped with [issue #98](https://github.com/akofink/live-staff/issues/98), which is now closed.
The boundary is in [melody transcription feasibility](melody-transcription-feasibility.md).
Rhythm inference, rest symbols, and note values stay deferred.
The [multi-pitch feasibility report](multi-pitch-feasibility.md) defers product polyphony, source separation, and timbre/source association while allowing only a bounded offline two-pitch benchmark.
The [input filter chain](input-filter-chain-design.md), [room calibration](room-noise-calibration.md), and opt-in signal monitor are shipped.
More instruments and separate pitch-display modes remain ideas, not current work. Configurable A4 shipped in [issue #124](https://github.com/akofink/live-staff/issues/124).
