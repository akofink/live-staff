# Testing Strategy

## Unit Tests

Test pure domain behavior for frequency-to-fractional-MIDI conversion, nearest-note conversion, cents deviation, transposition, octave handling, active-staff routing hysteresis, accidental preference, ranges, stabilizer sequences, pitch history and event or proportional layout, history export formatting, room-noise gating, filter response and bypass, monitor cadence, and preference validation or migration.

## Synthetic Signals

Generate deterministic sine and harmonic-rich tones at every chromatic pitch from Bb1 at 58.27 Hz through B5 at 987.77 Hz, alternating 44.1 and 48 kHz sample rates, plus silence, sub-threshold tones, and above-threshold seeded noise.
The reviewed gate requires every pitched case to be within 20 cents with no octave errors, every silence or uncertain case to return absence, and the worst-aligned two-frame stabilizer model to display at 160 ms within the 250 ms upper bound.

## Recorded Fixtures

Use only small, project-owned recordings.
Include sustained notes from different instrument families when practical.
Do not commit large audio files without considering repository impact.

The initial `tests/fixtures/piano-iphone-16-pro-macbook-air-m2/` corpus is 1.6 MB total and is tracked directly in Git.
It is raw AAC/M4A recorded in a residential room through an iPhone 16 Pro microphone connected to a MacBook Air M2 with QuickTime Player, so it represents realistic rather than laboratory-clean input.
Keep source recordings unchanged and retain recording context plus checksums in the fixture-set README.
Do not retrofit the frozen piano directory.
The old capture kit is an optional reference, not a required corpus.
Use a browser decoding harness for M4A analysis because Node unit tests do not natively decode it.
Run `npm run evaluate:fixtures` to evaluate the original files through a pinned headless Chromium browser and save its machine-readable result.
Introduce Git LFS only when a future fixture corpus materially increases clone size or includes larger lossless recordings.

## Browser Tests

Current browser tests cover permission paths, start and stop, instrument switching, grand-staff routing and history, local preferences, filters, diagnostics, and responsive layout.
History-export tests cover deterministic CSV, JSON, and plain-text serialization, CSV escaping, written-pitch derivation after live instrument changes, and local download or share without a network URL.
Lifecycle tests cover interruption, device loss, background/resume, and startup cancellation.
Browser tests must mock audio where reliable device access is unavailable in CI.
Signal-monitor browser coverage proves zero spectrum work before opt-in, one microphone request, bounded update cadence, immediate cleanup, accessible native controls, and no overflow at 320 CSS pixels.
Pure tests cover logarithmic frequency placement, deterministic RMS level, monitor cadence, and disable semantics without wall-clock timing.
Controlled Chromium tests cover pending-start cancellation, request deduplication, context suspension and resume, simulated track end, repeated recovery, and resource-release counts.
These tests establish application state transitions and cleanup invariants, not operating-system audio-route behavior.
The M4A fixture harness runs in CI to catch decode, browser-runtime, local-serving, and reviewed corpus regressions.
Its floors of 3 matching fixtures, 31 emitted estimates, and at most 20 octave errors are a baseline for one piano corpus, not a general accuracy claim.

## Common Automated Checks

Run the checks that match the change.
The broad suite is available when useful:

```sh
npm ci
npm run lint
npm test
npm run test:fixture-manifest
npm run build
npm run test:privacy
npm run verify:privacy
npm run evaluate:fixtures
npm run evaluate:performance
```

## Manual Validation

Try voice, a piano or generated tone, and a transposing instrument when that is easy.
Automated Chromium tests do not prove every phone browser.
That gap is a known limit, not an open evidence project.
The [attended harness](attended-release-evidence.md) is optional local notes if a device session happens to occur.
Do not schedule thermal, battery, screen-reader, or route-matrix sessions as release work.
