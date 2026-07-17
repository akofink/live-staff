# Input Filter Chain Design

## Decision

Live Staff should offer an opt-in input filter chain with independent high-pass, mains-notch, and low-pass sections.
All three sections remain off by default.
The first implementation should extend the existing deterministic frame-domain DSP rather than introduce a dependency or rebuild capture around Web Audio filter nodes.
It must be reviewed with the signal-monitor plan in [issue #49](https://github.com/akofink/live-staff/issues/49) before source implementation begins.

The processing order is:

```text
microphone PCM -> high-pass -> 50/60 Hz notch -> low-pass -> pitch detector
```

This familiar order removes broad subsonic energy before the precise hum cut and bounds high-frequency noise last.
Each disabled section must be a true bypass.
If every section is disabled, the chain must return the original frame reference and perform no per-sample work or allocation.

## Why This Fits The Current Architecture

`MicrophoneCapture` currently reads 4,096-sample frames from an `AnalyserNode`, and the app evaluates a frame about every 80 ms.
`MainsHumFilter` then applies a stateful, deterministic biquad before pitch detection.
It already preserves state across frames, resets when its setting changes, returns the input reference when bypassed, and avoids a browser-specific processing dependency.

The implementation should evolve that boundary into an `InputFilterChain` composed of project-owned biquad sections in `src/audio/`.
Coefficients must use the active session's actual sample rate.
The chain remains independent of React, storage, capture, and the detector.
No `BiquadFilterNode`, `AudioWorklet`, or third-party DSP package is needed for this bounded detector-input use case.

Web Audio biquads remain a valid future option if processing moves onto the real-time audio graph.
That move should happen only with a broader capture redesign because mixing Web Audio nodes with the current frame filter would create two processing paths and less deterministic tests.
The Web Audio API defines the required `highpass`, `lowpass`, and `notch` types, so equivalent response remains portable if that migration becomes useful.

## Controls And Safe Bounds

| Section | Plain-language label | Values | Initial preset | Default | Purpose |
| --- | --- | --- | --- | --- | --- |
| High-pass | Rumble reduction | 20-80 Hz, 5 Hz steps | 40 Hz | Off | Reduces handling, wind, traffic, and HVAC rumble below the selected cutoff. |
| Mains notch | Electrical hum reduction | 50 Hz or 60 Hz | 60 Hz only after the user chooses it | Off | Removes a narrow steady power-line tone while retaining nearby low notes. |
| Low-pass | Hiss reduction | 8-18 kHz, 1 kHz steps | 14 kHz | Off | Reduces high-frequency electronic or microphone hiss above the selected cutoff. |

The high-pass and low-pass sections should use second-order Butterworth responses (`Q = 1 / sqrt(2)`) with no resonance control in the initial UI.
The existing notch's narrow fixed shape should remain the baseline; an implementation may express it as a fixed `Q` only after response tests prove equivalent protection for B1 at 61.7 Hz.
Technical `Q`, slope, and filter-shape controls are deliberately deferred because they increase the chance of ringing or removing musical content without improving the core troubleshooting task.

These bounds are conservative rather than instrument-specific.
The 20 Hz high-pass minimum is effectively protective, while the 80 Hz maximum can affect fundamentals from tuba, bass, cello, low brass, and low voice and therefore requires clear guidance.
The 8 kHz low-pass minimum remains above the fundamental range represented by the current instrument model, but it can remove harmonics that help a detector identify a note.
Consequently, neither section should auto-enable or auto-follow the selected instrument.

Changing a cutoff while listening must update the coefficients for the next frame without restarting capture.
Enabling a section starts it from zeroed delay state.
Disabling it takes effect on the next frame and clears its state so stale samples cannot reappear when re-enabled.
The top-level **Bypass all filters** action must take effect on the next frame, preserve individual settings, and restore them when released.
Stopping, interruption, device replacement, or sample-rate change resets all filter state.

## Preference Semantics

Persist intent, not runtime state.
Store each section's enabled state and selected frequency in the existing local preference document, validate every field, and migrate the current `mainsHumFrequency` value without changing its meaning.
The global bypass is an immediate session control and should not be persisted; a reload must honor the saved independent section settings instead of unexpectedly remaining bypassed.

Controls remain editable while listening, matching the current live preference behavior.
One polite status message should announce successful persistence or session-only fallback.
Do not announce every slider step.
The visible value beside a focused range control and its accessible value text should update immediately.

## User Experience And Copy

Place **Input filters** inside the existing collapsed setup panel, after instrument selection.
Show the three independent switches, their current values, and **Bypass all filters** without requiring the advanced visualization.
Frequency controls are disabled, but still readable, when their section is off.

Recommended guidance:

- **Rumble reduction:** "Cuts very low sound from handling, wind, traffic, or air systems. Leave this off if it weakens low notes."
- **Electrical hum reduction:** "Cuts one narrow background tone caused by electrical power or nearby equipment. Try 60 Hz or 50 Hz and keep the setting that helps without hiding your note."
- **Hiss reduction:** "Cuts very high background hiss from a microphone, cable, or preamp. Leave this off if notes become harder to detect."
- **Bypass all filters:** "Temporarily compare the original microphone signal. Your filter settings are kept."

An accessible **Why use input filters?** `details` disclosure should contain:

> Steady noise can come from HVAC, lighting, cables, power supplies, and audio equipment.
> Electrical systems commonly use 60 Hz in the United States and Canada, while 50 Hz is common in most of Europe and many other regions.
> This is only a starting hint: equipment, travel, converters, and local power systems vary, so it is safe to try either hum setting.
> Filters can also remove parts of a voice or instrument, especially low notes, so compare with Bypass all filters.

Use native buttons, switches or checkboxes, range inputs, selects, and `details`/`summary` controls.
Do not hide instructions in hover-only tooltips.
Every frequency input needs a persistent label, unit, visible value, and programmatic description.
Keyboard arrow keys must adjust range inputs by one step, and the controls need at least a 44 by 44 CSS pixel touch target without requiring a precision drag.
Screen readers should receive state and value through native semantics; the response graph is supplementary and must not be the only representation of settings.

On a 320 px viewport, stack each label, switch, value, and frequency input in document order.
Keep bypass and the three switches reachable without horizontal scrolling.
The collapsed setup summary should stay compact and should not enumerate every filter setting.

## Optional Response Visualization And Issue #49

The filter controls do not depend on a graph.
The first implementation can ship without one after the numerical response tests and listening evaluation pass.

If users need visual confirmation, expose **Show filter response** in a nested advanced disclosure.
Opening it should dynamically import a project-owned renderer and draw a static, log-frequency aggregate response from the same coefficient definitions used by DSP.
Closing it must cancel rendering and release its buffers.
The graph needs a text alternative such as "High-pass 40 Hz on; 60 Hz notch on; low-pass 14 kHz off" and keyboard-readable frequency/gain samples.

The live waveform and spectrum remain owned by [issue #49](https://github.com/akofink/live-staff/issues/49).
If #49 later overlays live spectrum with filter response, it should consume a read-only response description rather than own or duplicate filter state.
It must remain dynamically loaded, explicitly enabled, immediately stoppable, and free of work on the default listening path.
Do not add a charting dependency for either issue before a project-owned canvas or SVG spike demonstrates a concrete shortfall.

## Power, Memory, And Mobile Safari

The default budget is zero filter sample operations and zero filter allocations when all sections are off.
With all three sections enabled, processing is three biquads per detector frame: bounded `O(frame length)` work with six delay samples and a reusable output buffer per active chain.
The implementation must avoid allocating one full frame per section; use at most one reusable 4,096-sample scratch buffer beyond the capture frame.

Target these measured budgets on the oldest supported iPhone and a representative low-end Android device:

- Active filtering adds no more than 1 ms p95 main-thread time per processed 4,096-sample frame.
- Filtering adds less than 2 MiB retained heap after a five-minute listening run.
- Default listening shows no statistically meaningful CPU increase against the all-filters-off baseline.
- A static response graph performs no animation and no recurring timer work after drawing.
- A #49 live monitor caps drawing at 10 frames per second, pauses while hidden, and falls back to 5 frames per second when a measured frame misses its budget.

The present capture adapter polls an `AnalyserNode` from `requestAnimationFrame`, so filtering remains on the main thread and may pause when a tab is hidden.
Mobile Safari can suspend an `AudioContext` during interruption or backgrounding, ignore requested media constraints, and use hardware-dependent sample rates.
Implementation testing must therefore cover context resume, phone-call or route interruption where practical, stop/start reset, page visibility, orientation, wired and Bluetooth input changes, and both 44.1 kHz and 48 kHz coefficient calculation.
Do not treat desktop Safari emulation as the mobile Safari acceptance result.

## Test And Review Gates

Source implementation for this design should proceed in stages and remain blocked until it is reviewed with #49:

1. Extract pure coefficient and response functions, then preserve the existing `MainsHumFilter` behavior through the chain boundary.
2. Add independent high-pass and low-pass sections, allocation-free bypass, reset semantics, preference validation, and migration.
3. Add accessible live controls and global session bypass without visualization.
4. Measure real-device mobile behavior and detector outcomes with voice, low brass or generated low fundamentals, strings, and synthetic noise.
5. Add the lazy static response graph only if usability review shows that text and controls are insufficient.
6. Integrate an optional spectrum overlay only through #49 after its independent performance and accessibility review.

Deterministic unit tests must generate signals at multiple sample rates and assert response in decibels after settling.
Cover cutoff response, passbands, stopbands, the 50/60 Hz notch, nearby B1, low instrument fundamentals, high fundamentals and harmonics, mixed rumble/hum/hiss plus tone, every filter combination, frame-boundary continuity, coefficient changes, global and independent bypass identity, reset, invalid preferences, and legacy migration.
Use tolerances derived from the designed response rather than exact floating-point samples.

Browser tests must cover keyboard operation, touch-sized layout at 320 px, screen-reader names/descriptions, live updates during capture, persistence failure, reload restoration, immediate bypass, visualization lazy loading, and complete cleanup on stop.
Performance tests must compare off versus all-on processing and verify that a closed advanced disclosure schedules no rendering work.

Manual acceptance requires headphones or muted output to avoid feedback, generated tones plus real voice/instruments, real 50/60 Hz noise where available, VoiceOver on iOS Safari, keyboard-only desktop use, and a low-power or thermal observation of at least five minutes.

## References

- [GitHub issue #54](https://github.com/akofink/live-staff/issues/54)
- [GitHub issue #49](https://github.com/akofink/live-staff/issues/49)
- [MDN: `BiquadFilterNode`](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode)
- [MDN: `AudioContext.sampleRate`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/sampleRate)
- [MDN: MediaTrack constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints)
- [International Electrotechnical Commission: World plugs](https://www.iec.ch/world-plugs)
