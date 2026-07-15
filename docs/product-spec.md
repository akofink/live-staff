# Product Specification

## Proof of Concept

Validate this path end to end:

```text
microphone input -> pitch detection -> stable concert pitch -> instrument transposition -> staff rendering
```

The proof of concept includes microphone permission, local live capture, monophonic pitch detection, detected frequency, concert and written note calculation, one staff, an optional note label, a signal state, and a silence state.

It excludes accounts, storage, analytics, lessons, MIDI, polyphonic recognition, sheet import, payment, social features, and any backend.

## Version 1.0 Requirements

- A data-driven selection of common concert and transposing instruments.
- Correct treble and bass staff display.
- Written-only, concert-only, and combined pitch views.
- An alternate-instrument comparison mode.
- Configurable A4 reference, defaulting to 440 Hz.
- Locally persisted preferences.
- Responsive phone, tablet, and desktop layouts.
- Clear permission, listening, silence, and failure states.
- Static deployment without an account or payment requirement.

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
- It works in at least one current desktop and mobile browser.
