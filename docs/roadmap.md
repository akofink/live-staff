# Roadmap

## Milestone 0: Repository Bootstrap

Establish the app shell, strict TypeScript, linting, tests, documentation, and a static build.

## Milestone 1: Audio Technical Spike

Capture microphone input after a user action, access frames, evaluate one detector, and show frequency diagnostics.
Success means sustained voice or a generated tone produces plausible estimates.

## Milestone 2: Stable Note Detection

Add conversion, thresholds, smoothing, hysteresis, and silence behavior.
Success means a sustained note remains stable enough to read.

## Milestone 3: Staff Rendering

Render treble-clef notes, accidentals, and ledger lines through a replaceable adapter.
Success means supported test notes are placed correctly.

## Milestone 4: Instrument Model

Add data-driven instruments, bass clef, transposition, and written plus concert views.
Success means known concert pitches render correctly for several instrument types.

## Milestone 5: Proof of Concept

Complete the first-run flow, selector, microphone states, labels, and phone layout.
Success means a new user can understand the app without instruction.

## Milestone 6: Transposition Coach

Add target-instrument selection and a dual display derived independently from canonical concert pitch.

## Milestone 7: Version 1.0 Hardening

Add local preferences, browser coverage, accessibility review, offline shell, privacy copy, performance review, and deployment documentation.
The milestone exits through the 1.0 hardening gate in the [release policy](release-policy.md).

## Deferred Work

MIDI, polyphonic input, automatic instrument recognition, history, lessons, teacher tools, accounts, analytics, and native applications remain deferred until users validate the core experience.
The [multi-pitch feasibility report](multi-pitch-feasibility.md) defers product polyphony, source separation, and timbre/source association while allowing only a bounded offline two-pitch benchmark.
