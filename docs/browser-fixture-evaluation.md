# Browser Fixture Evaluation

## Purpose

The project-owned piano fixtures are raw AAC/M4A recordings.
Node's test runtime does not decode M4A, so this developer-run browser harness uses the browser's `AudioContext.decodeAudioData` implementation instead.

The interactive page remains available for investigation.
The automated command uses Playwright Chromium to run that same page headlessly and records its browser-decoded results.
Playwright is a maintained browser-test runner with an explicit Chromium binary, making the decoding environment reproducible in local runs and CI.

## Run Locally

From the repository root, run:

```sh
npm run evaluate:fixtures
```

The command installs Playwright Chromium when needed, starts Vite on a loopback-only local server, opens `fixture-evaluation.html` headlessly, selects **Evaluate fixtures**, and waits for all results.
It writes the machine-readable report to `test-results/fixture-evaluation.json` and attaches it to the Playwright test result.
It fails for browser runtime errors, fetch or decode failures, incomplete fixture evaluation, or unavailable analysis windows.
It intentionally does not fail for detector mismatches or absent estimates because the current proof-of-concept detector has no published accuracy threshold.

For interactive debugging, run `npm run dev` and open `/fixture-evaluation.html`.
Select **Evaluate fixtures** and inspect the rendered cards.
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

The headless command uses a pinned Playwright Chromium revision, so it makes decoder and runtime behavior reproducible for a given browser and detector revision.
The result JSON retains matching, mismatching, and absent estimates without converting them into an accuracy assertion.
The harness does not establish detector accuracy by itself.
No accuracy threshold is claimed until browser results are recorded across the fixture set and reviewed alongside additional instruments and devices.
