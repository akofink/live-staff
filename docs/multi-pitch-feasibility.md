# Browser-Only Multi-Pitch Feasibility

## Decision

Do not add multi-pitch display, source separation, or timbre/source association to the product now.
Keep the public capability to one dominant sustained pitched source.
Authorize one offline, deterministic two-note-estimation benchmark spike before revisiting the decision.
The spike must not ship, request a new permission, add a dependency, persist audio or profiles, or load a model.

## Current Baseline

Live Staff captures one preferred mono microphone stream after a user action.
`MicrophoneCapture` reads 4,096-sample `AnalyserNode` frames on the animation frame loop, while application detection is throttled to about every 80 ms.
`detectPitch` finds the first acceptable normalized-autocorrelation peak and returns one frequency plus confidence.
The stabilizer and notation path therefore accept one canonical concert pitch, not a set of simultaneous notes or tracks.
The documented stable-display target is 100 to 250 ms after a pitch settles.
The production entry-JavaScript budget is 100 KB gzip and excludes separately loaded chunks.

This architecture makes a single-pitch detector replaceable, but a multi-pitch result would need a separate adapter and a set-aware presentation and stabilization contract.
It must not be represented as several independent calls to the monophonic detector because harmonic overlap produces octave, subharmonic, and masking errors.

## Terms And Non-Goals

**Multi-pitch estimation** identifies the concurrent fundamental frequencies in one mixed signal.
It can correctly return a chord without knowing which musician produced each note.

**Source separation** reconstructs a signal for each source from a mixture.
It is a materially harder problem than multi-pitch estimation and requires a defined output count or source model.
It is not required to show a set of pitches and is out of scope.

**Timbre/source association** assigns an estimated pitch or track to a user-selected local profile, such as "my voice" or "my instrument."
It does not separate a source by itself, and an association is not an identity proof.
Voice-derived embeddings or feature vectors can be biometric-like data and are out of scope for the initial experiment.

The feature is not score following, general music transcription, automatic instrument recognition, speaker identification, or a claim that notes belong to a particular performer.

## Feasibility By Approach

| Approach | Expected result | Latency and resource effect | Recommendation |
| --- | --- | --- | --- |
| Iterative spectral or harmonic multi-F0 DSP in JavaScript or WASM | Plausible for two sustained, well-separated synthetic tones and simple same-room mixtures. Accuracy will fall with unison/octave proximity, nonstationary attacks, reverberation, and unequal levels. | A 4,096-sample 44.1 kHz analysis window alone spans about 93 ms. Additional accumulation, peak selection, and stability logic make the present 100 to 250 ms target possible only if benchmarked. CPU is moderate for two pitches, but must be measured on the low-power floor. | The only justified experiment. Run offline first, then decide whether a live worklet prototype is warranted. |
| AudioWorklet plus deterministic DSP or WASM | AudioWorklet improves scheduling and UI responsiveness, not the fundamental accuracy of an estimator. | Runs on the audio rendering thread and receives small blocks. Window aggregation still creates algorithmic latency. Avoid allocations and unbounded work in `process()`. WASM can reduce compute time but adds binary, initialization, and memory cost. | Use only after the offline spike meets its gates. Feature-detect and retain a clear unsupported state. |
| Browser ML transcription model | Models can estimate multiple notes for their trained domain, but do not demonstrate a responsive, low-power, general-instrument microphone feature. Magenta's browser Onsets and Frames model is for solo piano and its own documentation says it takes about half the audio duration on most browsers and is significantly slower on Safari. | Model download, runtime, tensor memory, warm-up, backend variation, and sustained inference risk the initial bundle budget, battery, and interaction budget. A worker can protect the UI but not total CPU or battery use. | Reject for live product use now. Reconsider only with a locally bundled, versioned model and device measurements that meet explicit gates. |
| Local source separation model | May make later pitch estimation or association easier for a trained source mix, but cannot be assumed to work for arbitrary live instruments or voices. | Usually adds more model memory, compute, buffering, and latency than direct multi-F0 estimation. | Out of scope. Do not prototype before a validated multi-F0 use case exists. |
| Multiple microphones or channels | Physically separated, synchronized inputs can improve source isolation, but a browser cannot assume they exist, are synchronized, or expose distinct channels. | Each active stream increases capture, processing, permissions, device-selection complexity, and battery draw. Device enumeration itself is permission-gated. | Do not make this a product requirement. Consider only an explicitly selected external multi-channel interface in a future desktop-only investigation. |
| Web MIDI | Exact note-on/note-off events for MIDI-capable instruments, including chords. It does not identify acoustic pitch, voice, or source timbre. | Very low browser CPU and no microphone capture. Support is not Baseline, so it needs an optional unsupported state. | The best future alternative for electronic instruments. Keep separate from microphone multi-pitch work. |

## Accuracy, Latency, And Cost Gates

No existing Live Staff fixture or benchmark supports a multi-pitch accuracy claim.
Reported research accuracy must not be transferred to Live Staff because model, instrumentation, microphones, mixtures, and metrics differ.
For context, Magenta reports a 50.22 transcription F1 for its piano-specific Onsets and Frames model on its evaluation, not a general live-microphone guarantee.

The next experiment should report precision, recall, F1, octave-error rate, false-positive rate during single tones and silence, onset latency, steady-state update latency, and dropped or late analysis blocks.
It should stratify results by pitch interval, relative level, harmonic content, detuning, noise, and reverberation.

The experiment passes only if, on deterministic two-sine mixtures and the project-defined harmonic mixtures, it achieves at least 95% frame-level pitch-set F1 after the same stabilization policy, produces no more than one false positive per minute on silence and single-tone controls, and keeps p95 end-to-end stable-set latency at or below 250 ms.
It must also preserve a responsive start or stop interaction within 100 ms.
These are acceptance gates for a spike, not a product accuracy promise.

Measure CPU utilization, main-thread long tasks, AudioWorklet deadline misses, JavaScript and WASM heap high-water marks, model and asset transfer size, and battery drain over a 15-minute continuous session.
Test on the existing desktop reference, one current Android low-power device, and a current iPhone or iPad.
Reject a candidate if it causes audible glitches, sustained thermal throttling, material UI jank, or an unexplained battery cost relative to monophonic capture.

## Browser And Safari Constraints

`getUserMedia`, `AudioWorklet`, WebAssembly, and `AudioContext.baseLatency` require HTTPS or another secure context where specified.
The browser may ignore requested capture constraints and latency hints, so record actual track settings, sample rate, and measured latency rather than assuming requested values.

AudioWorklet is widely available and runs custom processing off the UI thread, but it is still real-time audio work with a limited deadline.
Its input block size must be read from the received array rather than assumed.

iOS and Safari require real-device testing for microphone permission, audio-session interruption, route changes, backgrounding, sample-rate conversion, rotation, and thermal behavior.
The existing Magenta JavaScript documentation specifically warns that its piano transcription is significantly slower on Safari because of WebKit audio resampling.
That makes Safari a release blocker for any model-based live claim, not a browser to test after a desktop implementation.

Do not use `SharedArrayBuffer` or threaded WASM as a baseline requirement because cross-origin isolation and browser support complicate a static site deployment.
Treat them as optional future optimizations only after a single-threaded implementation meets the measured gates.

## Privacy And Data Handling

The existing rule remains: microphone audio, frames, detections, and recordings are never uploaded, recorded, or transmitted.
The experiment uses generated deterministic signals and project-owned non-voice fixtures only.

Do not collect a voice-like or instrument timbre profile in the initial experiment.
Do not persist an embedding, spectral template, raw audio, user-entered performer label, device ID, or association history in `localStorage`, IndexedDB, cache storage, URLs, logs, telemetry, fixtures, or crash reports.

If source association is ever reconsidered, it must be separately opted into after microphone access and visibly explain that it is a local, fallible association rather than identification.
The profile must remain in memory for one active listening session, be deleted on stop, interruption, navigation, and failure, have a user-visible clear action, and be unavailable in private or background processing.
No cloud model fetch, remote inference, analytics, or profile synchronization is permitted.

Device and MIDI enumeration expose hardware metadata and are potential fingerprinting surfaces.
Enumerate only after an explicit user action, display only the selection needed for the session, and never persist IDs or labels.
Request Web MIDI without SysEx because note input does not need it.

## Staged Recommendation

1. Maintain the monophonic product boundary and public limitation.
2. Build no feature implementation or dependency for this issue.
3. Run one offline two-pitch DSP benchmark using generated mixtures, existing test infrastructure, and the gates above.
4. If it passes on desktop, Android, and iOS measurements, prototype a non-shipping AudioWorklet adapter with a distinct `PitchSetDetector` boundary and explicit unsupported and overload behavior.
5. Consider an opt-in Web MIDI input separately for supported electronic instruments.
6. Defer separation and any voice-like source association until a distinct product requirement, privacy review, and evidence that the preceding live estimator is useful.

## Sources

- [Current Live Staff architecture](architecture.md), [audio design](audio-and-pitch-detection.md), [testing strategy](testing-strategy.md), and [release policy](release-policy.md), accessed 2026-07-17.
- [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet), accessed 2026-07-17.
- [MDN: Using AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_AudioWorklet), accessed 2026-07-17.
- [MDN: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), accessed 2026-07-17.
- [MDN: enumerateDevices](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices), accessed 2026-07-17.
- [MDN: AudioContext baseLatency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency), accessed 2026-07-17.
- [MDN: WebAssembly](https://developer.mozilla.org/en-US/docs/WebAssembly), accessed 2026-07-17.
- [MDN: Web MIDI API](https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API) and the [Web MIDI specification](https://webaudio.github.io/web-midi-api/), accessed 2026-07-17.
- [Magenta: Onsets and Frames](https://magenta.tensorflow.org/onsets-frames) and the [Magenta JavaScript model documentation](https://github.com/magenta/magenta-js/tree/master/music), accessed 2026-07-17.
- [Spotify Basic Pitch](https://github.com/spotify/basic-pitch) and its [ICASSP 2022 paper](https://arxiv.org/abs/2203.09893), accessed 2026-07-17.
