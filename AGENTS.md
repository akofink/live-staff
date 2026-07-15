# Live Staff Agent Guide

## Purpose

Build a focused, free web utility that translates a musician's live monophonic pitch into clear, instrument-aware staff notation.
The magical moment is: the musician plays a note, and the correct note appears on the staff.

## Non-Negotiable Constraints

- Keep the core application client-side and statically deployable.
- Do not upload, record, or transmit microphone audio.
- Do not add accounts, payments, analytics, a backend, APIs, databases, or cloud audio processing without an explicit, documented product requirement.
- Ask for microphone permission only after a user action.
- Use concert pitch as the canonical internal representation.
- Keep pitch detection, stabilization, instrument transposition, note spelling, and notation rendering replaceable.
- Do not make domain modules import React, browser APIs, or notation libraries.
- Prefer small, maintained dependencies with a clear reason to exist.

## Architecture Boundaries

- `src/pitch/` contains pure conversion, spelling, and stabilization logic.
- `src/instruments/` contains data-driven definitions and concert-to-written conversion.
- `src/audio/` contains browser-only capture and detector adapters.
- `src/notation/` contains notation-rendering adapters.
- `src/app/` and `src/components/` compose the interface.

## Commands

```sh
npm run build
npm run lint
npm test
```

Run relevant checks before committing.

## Testing Expectations

- Unit test all pitch conversion, transposition, spelling, range, and stabilization behavior.
- Use deterministic synthetic signals and small project-owned audio fixtures for detector tests.
- Add browser tests for permission, start/stop, interruption, preference persistence, and responsive behavior when those features exist.
- Manually validate sustained voice or generated tones, then real instruments when available.

## Style and Documentation

- Use strict TypeScript and small modules.
- Use US English and ASCII unless a music symbol materially improves a user-facing document.
- Avoid unnecessary abstractions and comments that restate code.
- Update the relevant document and ADR when a product or architectural decision changes.
- Keep full sentences on separate lines in substantial Markdown documents.

## Definition of Done

A feature is complete only when its behavior, error and empty states, mobile layout, accessibility, tests, and relevant documentation are addressed.
It must preserve local-only audio handling and must not introduce an unnecessary service dependency.
