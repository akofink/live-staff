# Input Filter Chain

## Shipped Decision

Live Staff offers up to four independently configured high-pass, low-pass, or band-stop sections before pitch detection.
The initial chain is empty, and newly added sections are enabled so their effect is immediately testable.
A session-only global bypass compares detector behavior with the original microphone frame while preserving configured bands.
The chain is deterministic local DSP and adds no permission, recording, persistence of signal data, network operation, third-party DSP dependency, or browser-specific processing path.

Band-pass remains deferred because a casual setting can remove most of the detector's 55 to 1,000 Hz musical range.
It requires separate instrument evidence and safety guidance before exposure.

## Processing Boundary

```text
microphone PCM -> zero to four ordered filter sections -> pitch detector
```

`InputFilterChain` is a project-owned frame-domain boundary in `src/audio/`.
It composes stateful biquads using the active session's sample rate and remains independent of React, storage, capture, and the detector.
When no section is active or global bypass is enabled, it returns the original frame reference and performs no per-sample filter work or output allocation.
Any configuration or bypass change resets chain state and applies on the next evaluated frame without restarting capture.
Stopping capture resets all filter state.

The current `AnalyserNode` capture path and roughly 80 ms detector cadence keep filtering on the main thread.
Moving DSP into Web Audio nodes or an `AudioWorklet` would require a separately measured capture redesign to avoid two competing processing paths.

## Controls And Bounds

| Type | Plain-language purpose | Shipped values | Initial value |
| --- | --- | --- | --- |
| High-pass | Reduce handling, wind, traffic, or HVAC rumble | 20 to 80 Hz in 5 Hz steps | 40 Hz |
| Low-pass | Reduce high-frequency microphone, cable, or preamp hiss | 8 to 18 kHz in 1 kHz steps | 14 kHz |
| Band-stop | Reduce one narrow steady background tone | 40 to 4,000 Hz, Q 8, 12, 20, or 30, reduction 3 to 24 dB | 60 Hz, Q 20, 18 dB |

High-pass and low-pass sections use second-order Butterworth responses without user resonance controls.
Band-stop width and reduction are bounded because broader or deeper cuts can hide musical fundamentals and harmonics.
The 80 Hz high-pass maximum can affect tuba, bass, cello, low brass, and low voice.
The 8 kHz low-pass minimum remains above the detector's fundamental range but can remove useful harmonics.
No section auto-enables or follows the selected instrument.

Users can add, remove, enable, disable, and edit bands while listening.
The interface explains that filters can remove parts of a voice or instrument and recommends comparison with **Bypass all filters**.
Native controls provide labels, units, visible values, keyboard operation, and supplementary text independent of the response graph.
The controls stack without horizontal page scrolling at 320 CSS pixels.

## Preferences And Privacy

Persist filter intent, not runtime or signal state.
The preference document stores validated band types, order, enabled state, and bounded parameters, and migrates the legacy `mainsHumFrequency` choice.
Global bypass is session-only and is not restored after reload.
Microphone frames, filter output, detector results, response samples, calibration, and monitor data are never persisted.
Unavailable or malformed browser storage safely uses defaults.

## Signal Monitor Integration

The opt-in signal monitor displays the raw microphone waveform and spectrum because the shared analyzer observes capture before frame-domain filters.
It overlays the composed response that reaches pitch detection, so the graph does not imply that the live spectrum is post-filter.
The monitor is dynamically loaded only after explicit opt-in, performs zero reads while disabled, and updates at no more than 10 FPS or 5 FPS on data-saving or low-logical-processor devices.
The response graph is supplementary and does not replace textual settings.

## Performance And Validation

The maximum active path is four biquads over one 4,096-sample detector frame with four delay values per section and one reusable output buffer.
Work and memory remain bounded by section count and frame size.
Unit tests cover coefficient responses, passbands, stopbands, nearby musical notes, ordering, configuration changes, bypass identity, reset, invalid preferences, and legacy migration.
Browser and performance tests cover live edits, persistence, global bypass, monitor integration, cleanup, native control semantics, and the 320 px layout.

Remaining 1.0 work is real-device validation rather than source implementation.
[Issue #71](https://github.com/akofink/live-staff/issues/71) covers current iOS Safari and representative Android behavior, VoiceOver and keyboard use, sustained performance, memory, battery or thermal observations, interruptions, route changes, and real voice or instrument outcomes.

## References

- [GitHub issue #54](https://github.com/akofink/live-staff/issues/54)
- [GitHub issue #64](https://github.com/akofink/live-staff/issues/64)
- [GitHub issue #49](https://github.com/akofink/live-staff/issues/49)
- [Room-noise calibration](room-noise-calibration.md)
- [Audio and pitch detection](audio-and-pitch-detection.md)
- [MDN: `BiquadFilterNode`](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)
- [MDN: `AudioContext.sampleRate`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/sampleRate)
- [MDN: MediaTrack constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
