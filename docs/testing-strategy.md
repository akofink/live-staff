# Testing Strategy

## Unit Tests

Test pure domain behavior for frequency-to-fractional-MIDI conversion, nearest-note conversion, cents deviation, transposition, octave handling, active-staff routing hysteresis, accidental preference, ranges, and stabilizer sequences.

## Synthetic Signals

Generate deterministic tones for A4 at 440 Hz, concert B-flat4, middle C, low and high notes, small detuning, silence, and harmonic-rich signals where useful.
Use them to test detector accuracy and confidence behavior without device variability.

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

When microphone behavior exists, cover permission accepted and denied, absent input devices, suspended contexts, start and stop, instrument switching, persistent grand-staff routing, local preference persistence, and responsive layout.
Browser tests must mock audio where reliable device access is unavailable in CI.
The M4A fixture harness runs in CI to catch decode, browser-runtime, and local-serving regressions.
It is not a CI accuracy claim: mismatches and absent estimates remain reported data until a reviewed accuracy threshold exists.

## Manual Validation

Validate with voice, piano or generated tone, and at least one transposing instrument when available.
Maintain a supported-browser and device matrix as real devices are tested.
