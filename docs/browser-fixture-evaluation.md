# Browser Fixture Evaluation

## Purpose

The project-owned piano fixtures are raw AAC/M4A recordings.
Node's test runtime does not decode M4A, so this developer-run browser harness uses the browser's `AudioContext.decodeAudioData` implementation instead.

This is intentionally not a Playwright suite.
The project has no existing browser-test runner, and adding Playwright plus managed browser binaries only to decode fixtures would add a substantial dependency and CI surface without testing a user-facing browser flow.
The small Vite harness uses the same local browser audio decoding API that needs evaluation and requires no added package, backend, upload, or network service.

## Run Locally

From the repository root, run:

```sh
npm run evaluate:fixtures
```

Vite opens `fixture-evaluation.html`.
Select **Evaluate fixtures** and wait for all 12 fixture cards to render.
The harness fetches only the local files served by Vite from `tests/fixtures/piano-iphone-16-pro-macbook-air-m2/`.
It does not request microphone permission, record audio, retain decoded PCM, or transmit audio.

## What It Evaluates

For each fixture, the harness decodes the original M4A in the browser.
It samples up to eight 4,096-sample windows beginning 0.75 seconds after the recording starts and ending before the final 0.75 seconds.
Those bounds deliberately avoid treating the attack and decay as reliable steady-pitch data.
Each detected estimate displays its note, frequency, confidence, cents offset, and comparison with the expected concert MIDI pitch from the fixture catalog.
The catalog and fixture filenames use scientific pitch notation, including middle C as C4.

## Acceptance Protocol

Use a current Chrome, Safari, or Firefox build with M4A decoding support.
Record the browser and version with the result.
Confirm that all 12 files decode and render a card.
Confirm that every card includes its expected pitch and reports all detected estimates, mismatches, and missing estimates.
Investigate decode failures, missing estimates, octave errors, and pitch mismatches before changing detector behavior.
Do not replace, normalize, trim, re-encode, or otherwise modify a fixture while investigating.

The harness makes results reproducible for a given browser and detector revision, but it does not establish detector accuracy by itself.
No accuracy threshold is claimed until browser results are recorded across the fixture set and reviewed alongside additional instruments and devices.
