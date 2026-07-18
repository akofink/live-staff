# Audio and Pitch Detection

## Initial Assumptions

The initial detector targets one dominant sustained pitched source in limited background noise.
It uses equal temperament and must cover useful low brass through high voice, string, woodwind, and brass ranges.

## Current Approach

The shipped in-repository normalized-autocorrelation detector is wrapped behind `PitchDetector` so it can be changed without touching music or UI code.
`MicrophoneCapture` reads 4,096-sample `AnalyserNode` frames, while the app evaluates a detector frame about every 80 ms.
YIN and the McLeod Pitch Method remain candidates for a benchmark-driven replacement.
An `AudioWorklet` remains a future option if measured scheduling or main-thread cost justifies a capture redesign.
Read the actual `AudioContext.sampleRate`; never assume one.

## Stabilization

Raw frequency estimates are not rendered as staff notes directly.
The detector rejects frames below `0.01` RMS and estimates below `0.72` confidence, then the stabilizer requires two matching quantized MIDI estimates, holds through four missing frames, and clears after sustained silence.
These thresholds are centralized and tunable; fractional-MIDI smoothing and pitch-boundary hysteresis are not shipped.

## Latency

The reviewed deterministic upper bound is a stable note display no later than 250 ms after a pitch settles.
With a pitch settling immediately after an analysis opportunity, the shipped 80 ms cadence and two accepted frames produce a worst-aligned modeled 160 ms stable display.
This is deterministic pipeline evidence, not a wall-clock guarantee for every browser or device.
Favor readable stability over artificially low latency.

## Browser Constraints

Request microphone access only after an explicit user gesture.
Handle suspended contexts, interruption, missing devices, Safari behavior, rotation, and ignored audio constraints.
Request disabled echo cancellation, noise suppression, and automatic gain control where available, but tolerate unsupported or ignored constraints.

## Historical Capture Spike

The superseded first spike used `getUserMedia`, `AudioContext`, and an `AnalyserNode` to make local PCM frames available to a future detector.
It deliberately does not display raw pitch or add a detector dependency.
The implementation asks for one channel and disables voice-processing constraints when browsers permit them.
It resumes a suspended context after the user gesture and releases animation frames, media tracks, and the audio context on stop or failure.
This is a browser-adapter boundary, not the final audio-processing design.

## Microphone Session Lifecycle

The UI exposes five states: idle, starting, listening, interrupted, and error.
The primary control is the only recovery action: it cancels starting, stops listening, resumes an interrupted live session, or starts a fresh session after a terminal error.
Repeated starts share one pending request, and canceling startup invalidates its result so any stream delivered later is stopped before an audio context is created.

Context suspension, page backgrounding, and a device-route notification pause frame and monitor work, clear the current note, and reset filter delay, stabilization, and room calibration state.
Resuming a still-live session reuses its stream and context without another microphone request.
A track ending, a context closing, or analysis throwing is terminal and releases frame callbacks, event listeners, monitor buffers and callbacks, graph nodes, every track, and the context before offering a fresh user-initiated start.
Device-change events are advisory because browsers do not expose a consistent route identity; they never trigger microphone permission or reacquisition automatically.

Pitch history remains visible after an intentional stop, but an active event is closed on every interruption or terminal path and its expiry timer is replaced rather than duplicated.
Signal monitoring remains opt-in and performs no work while the session is paused or released.

## Published Demo Detector

The initial public demo uses an in-repository normalized-autocorrelation detector over 4,096-sample local PCM frames.
It is a deliberate dependency-free proof of concept, not a claim of production-grade pitch tracking across every instrument.
The UI processes one estimate about every 80 ms and displays a note only after two consecutive matching MIDI pitches.
The detector suppresses frames below a minimum RMS level and estimates below a correlation threshold.
Users can add up to four off-by-default high-pass, low-pass, or narrow band-stop sections before detection, or bypass all configured sections for the session.
The exact bounds, persistence, response overlay, and safety rationale are documented in the [input filter chain](input-filter-chain-design.md).
Optional [room-noise calibration](room-noise-calibration.md) suppresses likely steady-noise detector results before stabilization without changing PCM.
`npm run evaluate:fixtures` decodes the project-owned M4A recordings in headless Chromium and reports every stable-window estimate or absence against its expected concert MIDI pitch.
It enforces the observed regression floor for this single piano corpus: at least 3 of 10 in-range fixtures must have one matching window, at least 31 estimates must be emitted, and no more than 20 may be octave errors.
Those floors prevent further regression; they are not supported-range accuracy claims.
Strict deterministic evidence requires 100% of sine and harmonic-rich signals at every chromatic pitch from Bb1 at 58.27 Hz through B5 at 987.77 Hz to be within 20 cents, with zero octave errors, zero false positives, and 100% absence for reviewed silence, sub-threshold tones, and above-threshold seeded noise.
The configured autocorrelation search remains 55 to 1,000 Hz, but exact endpoint tones are not claimed: a 4,096-sample frame does not provide reviewed endpoint peak evidence.
YIN and McLeod Pitch Method remain candidates for the next benchmark-driven detector decision.

## Advanced Signal Monitor

The collapsed advanced diagnostics disclosure can opt into a waveform and logarithmic 20 Hz to 20 kHz spectrum with labeled 50 Hz and 60 Hz references.
The monitor uses the existing local `AnalyserNode`; it requests no additional permission and creates no recording, persistence, dependency, or network path.
The default state performs zero spectrum reads and does not load or render the monitor canvas.
Active reads and canvas updates are capped at 10 frames per second, or 5 frames per second when the browser reports data saving or at most four logical processors.
Disabling the checkbox, stopping listening, or unmounting the app removes the callback synchronously, and background-tab animation-frame suspension naturally pauses it.

## Open Technical Decisions

- Select and benchmark a maintained detector.
- Choose detector frame sizes for low-note resolution versus latency.
- Expand project-owned recordings beyond one piano, room, codec, and capture route.
- Confirm mobile Safari behavior in a real-device spike.
