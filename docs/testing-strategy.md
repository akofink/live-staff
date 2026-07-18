# Testing Strategy

## Unit Tests

Test pure domain behavior for frequency-to-fractional-MIDI conversion, nearest-note conversion, cents deviation, transposition, octave handling, active-staff routing hysteresis, accidental preference, ranges, stabilizer sequences, pitch history and layout, room-noise gating, filter response and bypass, monitor cadence, and preference validation or migration.

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
Use a browser decoding harness for M4A analysis because Node unit tests do not natively decode it.
Run `npm run evaluate:fixtures` to evaluate the original files through a pinned headless Chromium browser and save its machine-readable result.
Introduce Git LFS only when a future fixture corpus materially increases clone size or includes larger lossless recordings.

## Browser Tests

Current browser tests cover permission paths, start and stop, instrument switching, grand-staff routing and history, local preferences, filters, diagnostics, and responsive layout.
Issue [#67](https://github.com/akofink/live-staff/issues/67) adds comprehensive interruption, device-loss, background/resume, and startup-cancellation behavior.
Browser tests must mock audio where reliable device access is unavailable in CI.
Signal-monitor browser coverage proves zero spectrum work before opt-in, one microphone request, bounded update cadence, immediate cleanup, accessible native controls, and no overflow at 320 CSS pixels.
Pure tests cover logarithmic frequency placement, deterministic RMS level, monitor cadence, and disable semantics without wall-clock timing.
Controlled Chromium tests cover pending-start cancellation, request deduplication, context suspension and resume, simulated track end, repeated recovery, and resource-release counts.
These tests establish application state transitions and cleanup invariants, not operating-system audio-route behavior.
The M4A fixture harness runs in CI to catch decode, browser-runtime, local-serving, and reviewed corpus regressions.
Its floors of 3 matching fixtures, 31 emitted estimates, and at most 20 octave errors are a baseline for one piano corpus, not a general accuracy claim.

## Automated Gate

Run a reproducible install and the same gate used by CI:

```sh
npm ci
npm run lint
npm test
npm run build
npm run test:privacy
npm run verify:privacy
npm run evaluate:fixtures
npm run evaluate:performance
```

## Manual Validation

Validate with voice, piano or generated tone, and at least one transposing instrument when available.
Maintain a supported-browser and device matrix as real devices are tested.
[Issue #71](https://github.com/akofink/live-staff/issues/71) owns durable real-device evidence for iOS Safari and Android backgrounding, screen lock, phone or OS audio interruption, permission revocation, wired and Bluetooth route changes, external microphone loss, sustained thermal behavior, keyboard use, screen readers, and browser-specific permission UI.
Those cases cannot be represented faithfully by replacing Chromium browser objects in automation and must not be inferred from the controlled lifecycle tests.
Use the [attended release evidence harness](attended-release-evidence.md) to record these human observations locally and export reviewable JSON and Markdown without capturing audio or uploading evidence.
