# Product Specification

## Proof of Concept

Validate this path end to end:

```text
microphone input -> pitch detection -> stable concert pitch -> instrument transposition -> staff rendering
```

The proof of concept includes microphone permission, local live capture, monophonic pitch detection, detected frequency, concert and written note calculation, a persistent treble-and-bass grand staff with an active note and a bounded 10-second a-rhythmic history, an optional note label, a signal state, and a silence state.

It excludes accounts, cloud storage, persisted audio or detection history, analytics, lessons, MIDI, polyphonic recognition, sheet import, payment, social features, and any backend.

## Version 1.0 Requirements

- A compact, data-driven selection of common concert and transposing instruments.
- Correct treble and bass staff display.
- Instrument-first notation that defaults concert instruments to concert pitch and transposing instruments to written pitch.
- A compact sounding or concert-pitch reference for transposing instruments.
- Locally persisted instrument and filter preferences.
- Responsive phone, tablet, and desktop layouts.
- Clear permission, listening, silence, and failure states.
- Static deployment without an account or payment requirement.

These instrument-first presentation requirements shipped in PR #53 and intentionally replaced separate pitch-display controls.
The alternate-instrument comparison mode remains the separate Transposition Coach milestone rather than a 1.0 requirement.
Reference pitch remains fixed at A4 = 440 Hz because no independently justified configurable-reference requirement has been established.

## Nonfunctional Requirements

- Stable notes should normally appear about 100 to 250 ms after pitch settles.
- UI interaction must remain responsive during audio analysis.
- Audio stays local and listening state remains visible.
- Controls are keyboard accessible and state is not color-only.
- Strict TypeScript, tested music logic, and documented conventions are required.

## Out of Scope for 1.0

- Polyphonic recognition, score following, automatic instrument recognition, structured courses, teacher dashboards, sync, multiplayer, server-side analysis, AI lessons, music scanning, and automatic key detection.

## Proof-of-Concept Acceptance Criteria

- It runs as a static web app and requests microphone access only after an action.
- It processes audio locally and detects sustained monophonic pitches over a useful range.
- It suppresses silence and uncertain detections and renders a stable staff note.
- It supports at least one concert-pitch and one transposing instrument with correct written pitch.
- Core conversion and transposition behavior has automated coverage.
- Automated Chromium coverage passes, and current desktop plus real-mobile evidence is required by [issue #71](https://github.com/akofink/live-staff/issues/71) before 1.0.

See the [release policy](release-policy.md), [testing strategy](testing-strategy.md), [input filter chain](input-filter-chain-design.md), [room-noise calibration](room-noise-calibration.md), and [multi-pitch decision](multi-pitch-feasibility.md) for the corresponding gates and boundaries.
