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
  -> replaceable pitch detector
  -> raw pitch estimate
  -> pitch stabilizer
  -> canonical concert MIDI pitch
  -> instrument transposer and spelling policy
  -> replaceable notation renderer
  -> React UI
```

## Boundaries

Pure domain modules own frequency conversion, MIDI conversion, pitch spelling, stabilization, instrument definitions, ranges, and transposition.
Browser adapters own microphone lifecycle, audio frames, and AudioWorklet integration.
Notation adapters own rendering-library details.
React owns state presentation and user interactions.

## Local Preferences

`src/preferences/` owns the serializable instrument and pitch-display choices plus a small browser storage adapter.
Only those choices are written to `localStorage`; microphone audio, audio frames, detected frequencies, and detected notes are never persisted.
Malformed values and unavailable browser storage safely use defaults.
When the instrument transposition domain is available on this branch, the React UI will pass `Preferences.instrumentId` and canonical concert MIDI to its concert-to-written conversion interface.
The preference module deliberately does not duplicate that domain calculation.

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
- `NotationRenderer`: renders or clears a spelled pitch for a clef.

The exact interfaces can evolve, but domain code must not know which detector, renderer, or UI framework is in use.
