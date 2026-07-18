# Detector Candidate Benchmark

## Scope

`npm run benchmark:detectors` runs a deterministic offline Chromium comparison at the injected detector boundary.
The production autocorrelation implementation is the control.
Multi-period autocorrelation scoring, comb projection, and landmark histograms remain research-only candidates and are absent from the production application entry graph.
Results are research evidence, not production-readiness claims.

## Synthetic Gates

Every detector receives the same named scenarios and receives an explicit pass or failure for each gate.
The supported-range gate covers every semitone from MIDI 34 through 83 at 44.1 and 48 kHz and requires every estimate within 20 cents with no octave errors.
Harmonic recovery covers harmonic-dominant and missing-fundamental tones.
The absence gate uses silence, a sub-threshold tone, and fixed-seed broadband uncertainty.

The calibrated-room gate uses the production `RoomNoiseGate` state machine and the established 12-frame fan calibration, fan rejection, and four retained bass/baritone mixtures.
The hum gate processes three successive frames through both the production `MainsHumFilter` and production `InputFilterChain` configured with `defaultNotch` before detection.
The modeled latency gate applies the production `NoteStabilizer` at an 80 ms cadence and requires stable output by 250 ms.
It does not claim end-to-end onset latency: a 4,096-sample frame spans 85.3 ms at 48 kHz or 92.9 ms at 44.1 kHz, and measured detector CPU time, browser scheduling, and frame alignment add to the user-visible result.

## Recorded Contracts

The baseline-compatible contract calls `analysisFrameStarts` without modification and uses 4,096-sample frames.
It preserves all 12 fixture reports while separately aggregating the 10 policy-supported fixtures.
This reproduces the established control baseline exactly: 3 of 10 fixtures match, 31 estimates are emitted, and 20 octave errors occur across 77 available windows.

The expanded contract is separate and must not be compared as if it were the baseline.
A deterministic 20 ms RMS envelope identifies onset without consulting fixture identity.
For each fixture and each 2,048- and 4,096-sample frame size, it samples ten dense-onset windows at 20 ms spacing, nine live-overlap windows at 50 ms spacing, and eight stable-sustain windows at 100 ms spacing.
Every artifact window retains its contract, frame size, start sample, expected catalog MIDI, estimate or absence, cents error, confidence, and octave classification.
Expected pitch always comes from the explicit fixture catalog and never filename parsing.

## Measurement

CPU timing warms each detector with 24 calls, then records 96 individual calls and reports median, p95, and maximum browser elapsed time.
Browser timer precision and host load limit interpretation; timings compare this run and are not hard real-time guarantees.

Allocation evidence is a source-level inventory.
It reports typed arrays, dynamic JavaScript arrays, possible result objects, and retained references per call.
Dynamic JavaScript array capacity, number representation, object headers, and allocator overhead are explicitly unknown rather than converted to byte estimates.

Bundle evidence uses isolated Vite/Rolldown production-library entries minified by the installed Oxc minifier and records raw minified and gzip sizes.
The candidate entry is not imported by production, so its current production import delta is structurally zero rather than measured from a hypothetical candidate integration.
The isolated entries quantify potential code cost without claiming the exact delta of a future adapter change.

## July 18, 2026 Run

The control passed supported range, harmonic recovery, absences, calibrated room gating, both hum-filter paths, and latency.
Multi-period and comb candidates failed supported range, harmonic recovery, and calibrated room gating.
The landmark candidate failed supported range, harmonic recovery, calibrated room gating, and hum filtering.
All candidates therefore failed mandatory gates.

Baseline-compatible policy results were 3 matching fixtures, 31 emissions, and 20 octave errors for control; 2, 25, and 19 for multi-period; 3, 26, and 19 for comb projection; and 0, 0, and 0 for landmarks.
Control CPU timing was 6.3 ms median, 6.8 ms p95, and 7.3 ms maximum in this run.
Multi-period was 6.3/6.8/9.3 ms, comb was 6.2/6.6/6.9 ms, and landmarks was 0/0.1/0.1 ms.
The isolated minified/gzip control entry measured 988/526 bytes; all candidates together measured 2,305/927 bytes.

No production change is justified.
The narrow next experiment is a fundamental-aware peak-selection rule that is first required to pass supported-range, missing-fundamental, and calibrated-room gates before recorded fixtures are considered.
Do not tune that experiment against fixture names or individual recording outcomes.

CPU measurements cover desktop Chromium on this host, not mobile thermal, battery, or sustained-heap behavior.
The complete report is written to `test-results/detector-benchmark.json`.
CI uploads that report and `test-results/detector-bundle-cost.json` with the existing detector evidence artifact.
The harness makes only loopback requests, does not request microphone permission, and does not transmit audio.
