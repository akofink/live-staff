# Detector Candidate Benchmark

## Scope

`npm run benchmark:detectors` runs a deterministic offline Chromium comparison at the injected detector boundary.
The production autocorrelation implementation is the control.
Fundamental-aware peak selection, multi-period autocorrelation scoring, comb projection, and landmark histograms remain research-only candidates and are absent from the production application entry graph.
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
Those initial candidates therefore failed mandatory gates.

Baseline-compatible policy results were 3 matching fixtures, 31 emissions, and 20 octave errors for control; 2, 25, and 19 for multi-period; 3, 26, and 19 for comb projection; and 0, 0, and 0 for landmarks.
Control CPU timing was 6.3 ms median, 6.8 ms p95, and 7.3 ms maximum in this run.
Multi-period was 6.3/6.8/9.3 ms, comb was 6.2/6.6/6.9 ms, and landmarks was 0/0.1/0.1 ms.
The isolated minified/gzip control entry measured 988/526 bytes; all candidates together measured 2,305/927 bytes.

No production change is justified.
The fundamental-aware follow-up below supersedes the next-experiment note from this run.

CPU measurements cover desktop Chromium on this host, not mobile thermal, battery, or sustained-heap behavior.
The complete report is written to `test-results/detector-benchmark.json`.
CI uploads that report and `test-results/detector-bundle-cost.json` with the existing detector evidence artifact.
The harness makes only loopback requests, does not request microphone permission, and does not transmit audio.

## Fundamental-Aware Follow-Up

The bounded follow-up retained the first acceptable autocorrelation peak unless its octave-period peak had at least 0.08 stronger normalized correlation, at least 0.90 confidence, and repeated-period support within 0.04 when that lag was available.
Allowing third-period selection or accepting a lower-confidence first peak reproduced the rejected regressions: the 146.83 Hz calibrated-room mixture became 73.39 Hz, and the mains-hum-filter result moved from MIDI 57 to MIDI 38.
Those forms were rejected before recorded evidence was inspected.

The gate-safe form passed all 100 supported-range windows, all 10 harmonic-dominant and missing-fundamental windows, all three absences, fan rejection and all four calibrated-room mixtures, both hum-filter paths, and the 160 ms modeled stable-display latency gate.
Only after those gates passed was recorded evidence inspected.

The gate-safe selector produced exactly the control result on every recorded contract.
The baseline-compatible policy result remained 3 matching fixture groups, 31 emissions, and 20 octave errors across 77 windows.
Dense-onset results remained 30/110/79 matches/emissions/octave errors at 2,048 samples and 31/113/82 at 4,096 samples.
Live-overlap results remained 24/90/66 and 23/90/67.
Stable-sustain results remained 15/56/41 at both frame sizes.
Confidence filtering did not separate correctness: baseline median confidence was 0.988 for correct estimates and 0.985 for incorrect estimates.

Control CPU timing was 5.2 ms median, 5.4 ms p95, and 5.6 ms maximum in this run.
The selector measured 5.3/5.7/5.8 ms.
It allocates one `Float64Array(maximumLag - minimumLag + 1)`, one correlation wrapper, and zero or one result object per call, retaining no references.
The aggregate research-candidate entry increased from 2,305/927 to 2,891/1,101 minified/gzip bytes, a 586/174-byte research bundle increase; production import delta remains structurally zero.

## Harmonic-Sieve Decision Rule

The July 22, 2026 harmonic-sieve investigation is rejected before recorded inspection if any supported-range, 20-cent, harmonic or missing-fundamental, absence, calibrated-room, hum-filter, or 250 ms modeled-latency gate fails.
Only after all mandatory gates pass may the immutable recordings be inspected.
Production selection additionally requires at least five matching in-range fixture groups, materially fewer than 20 octave errors without reducing emissions to conceal errors, acceptable 2,048- and 4,096-sample CPU p50/p95 within the 80 ms desktop cadence, bounded retained buffers and allocations, and acceptable isolated bundle cost.
The research-only sieve uses a bounded MIDI 34 through 83 candidate grid, local-neighborhood spectral normalization, multi-harmonic coverage, and explicit penalties when half- or third-frequency hypotheses explain the observed partials.
It remains outside the production entry graph unless every threshold clears.

The candidate failed the pre-recorded gate and was rejected without evaluating recorded fixtures.
It matched 34 of 100 supported-range windows, emitted 35 estimates, and had a 29.2-cent absolute p95; most estimates below MIDI 66 were absent.
It recovered 2 of 10 harmonic-dominant or missing-fundamental windows, emitted a false positive for fixed-seed uncertainty, missed all four calibrated-room mixtures, and returned absence after both required hum-filter paths.
It reached the modeled stable display at 160 ms, the only mandatory gate it passed.

Desktop Chromium measured 4.2 ms median and 4.4 ms p95 for 2,048-sample frames, and 4.5/4.6 ms for 4,096-sample frames.
Those costs fit within the desktop 80 ms cadence but do not offset the detection failures or establish mobile thermal and battery behavior.
Per call the implementation allocates no typed or dynamic arrays and only an optional result object.
The two observed FFT sizes retain two `Float64Array` work buffers and one `Uint32Array` bit-reversal table each, totaling 122,880 typed-array payload bytes and six retained references.
The aggregate isolated research-candidate entry measured 6,147 minified and 2,134 gzip bytes, 1,139/304 bytes above the preceding SWIPE-like research entry; production import delta remains structurally zero.

No production change is justified, and issue #77 remains open.
The next bounded experiment should test cross-frame octave-hypothesis persistence through the replaceable detector adapter, requiring fixture-independent evidence across consecutive frames and measuring the added latency against the same mandatory gates before recorded contracts are inspected.

## SWIPE-Like Follow-Up

The July 22, 2026 follow-up fixed its decision rule before recorded inspection: reject on any mandatory gate failure, fewer than five matching in-range fixture groups, octave errors not materially below 20, or browser/mobile cost incompatible with the 80 ms analysis cadence.
The research-only estimator uses project-owned iterative radix-2 FFT code, retained FFT work buffers, a MIDI 34 through 83 grid at 1/24-semitone spacing, inverse-square-root harmonic rewards, and negative evidence halfway between harmonics.
No third-party FFT code or dependency was added.

The candidate failed the pre-recorded gate and was rejected without evaluating recorded fixtures.
It matched 99 of 100 supported-range windows with zero octave errors, but its absolute cents p95 was 25 rather than at most 20.
It matched 7 of 10 harmonic and missing-fundamental windows, emitted one false positive on the three absence cases, and missed the 61.74 Hz calibrated-room tolerance by estimating 63.39 Hz.
It passed both hum-filter paths and reached the modeled stable display at 160 ms.

The benchmark marks its recorded result `skipped-mandatory-gate-failure` so future runs cannot accidentally present recorded outcomes for this rejected form.
It reports CPU median and p95 for both 2,048- and 4,096-sample frames in addition to the standard 4,096-sample timing.
Per call it allocates no typed or dynamic arrays and only an optional result object; each observed FFT size retains two `Float64Array` work buffers and one `Uint32Array` bit-reversal table, totaling `FFT size * 20` payload bytes.
Desktop Chromium measured 19.3 ms median and 21.3 ms p95 for the standard 4,096-sample timing, versus 8.6 and 9.1 ms for control.
The explicit frame-size runs measured 19.4/21.4 ms median/p95 at 2,048 samples and 19.5/21.7 ms at 4,096 samples, showing that the bounded frequency-grid scoring rather than FFT size dominates this implementation.
Those figures fit within the desktop 80 ms cadence but are about 2.2 to 2.3 times control cost and do not establish acceptable low-power mobile thermal or battery behavior.
The two observed FFT sizes retain 122,880 typed-array payload bytes in total.
The aggregate isolated candidate entry measured 5,008 minified and 1,830 gzip bytes, an increase of 2,117 and 729 bytes over the preceding 2,891/1,101-byte research entry; production import delta remains structurally zero.

No production change is justified, and issue #77 remains open.
