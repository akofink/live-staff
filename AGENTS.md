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
npm run test:privacy
npm run evaluate:fixtures
npm run evaluate:performance
```

Run the checks relevant to the change before committing.
Use the fixture and performance evaluators for audio or detector changes when they help cover the behavior.

## Testing Expectations

- Unit test pitch conversion, transposition, spelling, range, and stabilization behavior that the change touches.
- Use deterministic synthetic signals and the existing small fixtures for detector tests.
- Add a browser test when the change alters permission, start/stop, interruption, preferences, or layout.
- A quick listen with voice or a tone is welcome when it is easy. It is not a release gate.

## Runtime And Performance

- Keep the default idle and listening paths efficient on low-power mobile devices.
- Advanced diagnostics and visualizations must be opt-in, bounded, and perform no continuous work while hidden or disabled.
- Bound retained signal and pitch history by both time and item count.
- Preserve the production entry-JavaScript budget enforced by `npm run build`.

## Style and Documentation

- Use strict TypeScript and small modules.
- Use US English and ASCII unless a music symbol materially improves a user-facing document.
- Avoid unnecessary abstractions and comments that restate code.
- Update the relevant document and ADR when a product or architectural decision changes.
- Keep full sentences on separate lines in substantial Markdown documents.

## Definition of Done

A change is done when the behavior works, the relevant automated checks pass, and local-only audio handling still holds.
Do not block it on a device matrix, a screen-reader certification, a thermal or battery run, or a new recording corpus.
Say what is still rough instead of inventing a compliance program around it.

## Issue Tracking

- File a GitHub issue only for work the maintainer wants tracked.
- Do not open evidence, release, capture, or research programs on your own.
- Do not reopen closed issues #71, #72, #77, #82, or #98 as gates.
- Skip transient notes and work already covered by an open issue or pull request.

## Delivery And Cleanup

- Before reporting that completed work lacks a pull request, inspect open and closed pull requests, `origin/main`, and recent workflow runs.
- Keep the worktree available through pull-request checks and merge.
- For a user-visible behavior change, a quick look at `https://live-staff.akofink.com/` after deploy is useful when practical.
- Remove the feature worktree and branch after merge when no follow-up is needed.
- Do not add a device, thermal, or privacy-network campaign.
