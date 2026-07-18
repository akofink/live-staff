# Architecture

## Deployment Model

Live Staff is a static client-side web app.
It has no backend in the initial architecture.
Microphone audio is processed locally and is never uploaded.

## Processing Pipeline

```text
user action
  -> getUserMedia
  -> MediaStream and AudioContext
  -> audio adapter
  -> optional bounded input filter chain
  -> replaceable pitch detector
  -> raw pitch estimate
  -> optional calibrated room-noise result gate
  -> pitch stabilizer
  -> canonical concert MIDI pitch
  -> bounded in-memory stable-note event history
  -> instrument transposer and spelling policy
  -> replaceable notation renderer
  -> React UI
```

## Boundaries

Pure domain modules own frequency conversion, MIDI conversion, pitch spelling, stabilization, instrument definitions, ranges, and transposition.
Browser adapters own microphone lifecycle and `AnalyserNode` frame capture.
An `AudioWorklet` remains a possible future adapter, not a current integration.
Notation adapters own rendering-library details.
React owns state presentation and user interactions.

The advanced signal monitor is an optional observer on the active browser audio adapter.
It reuses the capture analyser without changing the pitch path, reads spectrum data only while explicitly enabled, and sends ephemeral snapshots to a project-owned canvas renderer.
Disabling the monitor or stopping capture removes the observer immediately.

`InputFilterChain` applies at most four deterministic high-pass, low-pass, or band-stop sections to detector PCM and returns the original frame when no section is active or session bypass is enabled.
`RoomNoiseGate` calibrates from microphone-frame RMS and can suppress likely steady-room-noise detector results before stabilization without altering PCM.

## Local Preferences

`src/preferences/` owns the serializable instrument and filter choices plus a small browser storage adapter.
Only those choices are written to `localStorage`; microphone audio, audio frames, detected frequencies, detected notes, history, calibration, global bypass, and monitor samples are never persisted.
Signal-monitor state and samples are also never persisted.
Malformed values and unavailable browser storage safely use defaults.
The React UI resolves the selected preference to an instrument definition and derives its display pitch from canonical concert MIDI.
The preference module deliberately does not duplicate that domain calculation.

Recent-note history consumes only committed stabilizer output and stores canonical concert MIDI, onset, and end timestamps in memory.
It retains at most 10 seconds and 32 events, is cleared by a page reload, and derives its displayed spelling and transposition from current preferences.

## Canonical Data Flow

Concert pitch is the only canonical pitch representation after detection.
Each displayed written pitch is calculated independently from concert MIDI rather than by chaining instrument conversions.

```text
sounding frequency -> concert MIDI -> player written MIDI
                                -> target instrument written MIDI
```

## Key Interfaces

- `PitchDetector`: produces raw estimates from audio frames.
- `PitchStabilizer`: turns uncertain estimates into a stable-note state.
- `InstrumentTransposer`: maps concert MIDI to written MIDI.
- `InputFilterChain`: composes bounded deterministic filters for detector PCM.
- `RoomNoiseGate`: suppresses calibrated steady-noise detector results for one session.
- `PitchHistory`: retains bounded committed stable-note events in canonical concert pitch.
- `NotationRenderer`: renders the persistent grand staff, time-positioned history, and emphasized current pitch.

The exact interfaces can evolve, but domain code must not know which detector, renderer, or UI framework is in use.
