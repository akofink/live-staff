# Audio and Pitch Detection

## Initial Assumptions

The initial detector targets one dominant sustained pitched source in limited background noise.
It uses equal temperament and must cover useful low brass through high voice, string, woodwind, and brass ranges.

## Approach

Evaluate maintained JavaScript or TypeScript implementations of YIN and the McLeod Pitch Method before adopting a detector.
Wrap the selected implementation behind `PitchDetector` so it can be changed without touching music or UI code.

Prefer an AudioWorklet for production processing when practical.
An `AnalyserNode` may support an early experiment, but deprecated processing APIs must not remain in production.
Read the actual `AudioContext.sampleRate`; never assume one.

## Stabilization

Raw frequency estimates are not directly displayed.
The stabilizer should reject weak estimates, smooth fractional MIDI values, quantize to a semitone, require a short persistence interval, apply boundary hysteresis, hold briefly through small gaps, and clear after sustained silence.
All thresholds must be centralized and tunable.

## Latency

Target a stable note display roughly 100 to 250 ms after a pitch settles.
Favor readable stability over artificially low latency.

## Browser Constraints

Request microphone access only after an explicit user gesture.
Handle suspended contexts, interruption, missing devices, Safari behavior, rotation, and ignored audio constraints.
Request disabled echo cancellation, noise suppression, and automatic gain control where available, but tolerate unsupported or ignored constraints.

## Open Technical Decisions

- Select and benchmark a maintained detector.
- Choose detector frame sizes for low-note resolution versus latency.
- Establish a recorded-fixture and synthetic-signal benchmark suite.
- Confirm mobile Safari behavior in a real-device spike.
