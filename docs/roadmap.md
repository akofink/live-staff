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
The shipped persistent grand staff routes notes between treble and bass clefs and places the bounded 10-second a-rhythmic history directly across the staff.

## Milestone 4: Instrument Model

**Status: Completed.**

Add data-driven instruments, bass clef, transposition, and written plus concert views.
Success means known concert pitches render correctly for several instrument types.
The app selects written notation automatically for transposing instruments, provides a compact sounding-pitch reference, and intentionally avoids a second primary pitch-display control.

## Milestone 5: Proof of Concept

**Status: Implementation completed; release evidence remains in Milestone 7.**

Complete the first-run flow, selector, microphone states, labels, and phone layout.
Success means a new user can understand the app without instruction.
Subsequent shipped work added progressive disclosure, local preferences, room calibration, opt-in waveform and spectrum diagnostics, and up to four bounded interactive filters.

## Milestone 6: Transposition Coach

**Status: Not started and not required for core 1.0 hardening.**

Add target-instrument selection and a dual display derived independently from canonical concert pitch.

## Milestone 7: Version 1.0 Hardening

**Status: In progress.**

Complete browser and device coverage, accessibility review, the offline-contract decision, detector evidence, lifecycle recovery, privacy evidence, performance review, and deployment documentation.
The milestone exits through the 1.0 hardening gate in the [release policy](release-policy.md).
The offline decision is complete: 1.0 continues working after an online load loses connectivity, but new visits and reloads require the network; no service worker or persistent application cache is used.

Recommended execution order:

1. [#67 Harden microphone lifecycle and interruption recovery](https://github.com/akofink/live-staff/issues/67) and [#69 define enforceable detector evidence](https://github.com/akofink/live-staff/issues/69) can proceed independently.
2. [#68 define the offline contract](https://github.com/akofink/live-staff/issues/68) in parallel with the foundational hardening.
3. [#71 record real-device, accessibility, privacy, and sustained-performance evidence](https://github.com/akofink/live-staff/issues/71) after lifecycle and detector claims settle.
4. [#72 run the dedicated 1.0 release review](https://github.com/akofink/live-staff/issues/72) after all preceding requirements and evidence close.

The reusable [fixture capture protocol](fixture-capture-protocol.md) defines validated manifests, immutable same-take lossless/AAC assets, decoder comparison records, and the remaining physical capture matrix for [#82](https://github.com/akofink/live-staff/issues/82).
Its local validation tooling can land independently, but #82 remains open until the operator-assisted recordings exist and are reviewed; those recordings complement detector work in #77 and attended device evidence in #71.

## Deferred Work

MIDI, polyphonic input, automatic instrument recognition, persisted session history or practice logs, lessons, teacher tools, accounts, analytics, and native applications remain deferred until users validate the core experience.
The [multi-pitch feasibility report](multi-pitch-feasibility.md) defers product polyphony, source separation, and timbre/source association while allowing only a bounded offline two-pitch benchmark.
The [input filter chain](input-filter-chain-design.md), [room calibration](room-noise-calibration.md), and opt-in signal monitor are shipped; real-device validation remains part of issue #71.
Configurable A4, expansion beyond the current five selectable instruments, and separate pitch-display modes have no current evidence-backed 1.0 requirement.
