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
Browser-facing, audio, notation, responsive-layout, or performance changes normally require both evaluation commands.

## Testing Expectations

- Unit test all pitch conversion, transposition, spelling, range, and stabilization behavior.
- Use deterministic synthetic signals and small project-owned audio fixtures for detector tests.
- Add browser tests for permission, start/stop, interruption, preference persistence, and responsive behavior when those features exist.
- Manually validate sustained voice or generated tones, then real instruments when available.

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

A feature is complete only when its behavior, error and empty states, mobile layout, accessibility, tests, and relevant documentation are addressed.
It must preserve local-only audio handling and must not introduce an unnecessary service dependency.

## Issue Tracking

- Create or update a GitHub issue for a newly discovered, actionable finding that is outside the current branch's scope.
- Reference the issue from each follow-up branch and pull request.
- Do not create issues for transient investigation notes or work already covered by an open issue or pull request.

## Delivery And Cleanup

- Before reporting that completed work lacks a pull request, inspect open and closed pull requests, `origin/main`, and recent workflow runs.
- Keep the worktree and agent available through pull-request checks, merge, Pages deployment, and production verification.
- For deployed UI or audio changes, verify `https://live-staff.akofink.com/` in a real browser, including console, network, relevant desktop/mobile layouts, and the changed interaction when permissions allow.
- Treat a successful Pages workflow as necessary but not sufficient production evidence.
- Remove the feature worktree, local branch, remote branch, browser session, shell pane, and agent window only after merge and required production verification.
