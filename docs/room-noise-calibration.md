# Room Noise Calibration

## Decision

Live Staff offers an explicit, session-only room-noise calibration while listening.
The user stays quiet for 12 detector frames, about 960 ms at the current 80 ms detector cadence.
The resulting RMS floor is held only in memory and is cleared when listening stops.
If the measured floor is below the detector's existing minimum RMS, calibration remains bypassed because the detector already rejects that room level.

After calibration, a detector estimate opens the gate at twice the measured RMS floor, approximately 6 dB above the room level.
An open gate closes below 1.5 times the floor, approximately 3.5 dB, to avoid flicker during a decaying note.
The gate does not alter PCM, frequency, confidence, concert pitch, or note range.
Before explicit calibration it returns the original detector result without scanning the frame.

## Evidence

Deterministic 4,096-sample mixtures combine a seeded broadband component, a steady 73 Hz fan tone, and representative harmonic-rich fundamentals.
The calibrated gate reduced the steady fan result from one detection per evaluated frame to zero.
It retained four of four tested fundamentals: B1 at 61.74 Hz, E2 at 82.41 Hz, A2 at 110 Hz, and D3 at 146.83 Hz.
Detected frequencies remained within 1 Hz of the source.

The calibration itself adds about 960 ms of explicit setup time and intentionally emits no note during that interval.
Normal stabilization still requires two accepted detector frames, about 160 ms at the current cadence.
Calibration skips pitch detection and performs only one 4,096-sample RMS pass per frame.
The active gate performs the same single pass and allocates no arrays or retained per-frame objects.
Its retained state is five numbers and one boolean, well below the 2 MiB mobile budget.
The existing detector remains the dominant CPU cost because it evaluates normalized autocorrelation across hundreds of lags.

The synthetic tests exercise the same sample count and 48 kHz rate commonly reported by MacBook microphones.
The thresholds are ratios rather than device-specific absolute levels, so 44.1 kHz and mobile microphone gain do not change gate behavior.
Real iOS Safari and Android hardware were not available in this worktree, so thermal behavior and automatic-gain differences remain a manual production acceptance item.

## Tradeoffs

A note less than 6 dB above the calibrated room level may remain hidden until it becomes louder.
This is preferable to silently enabling a broad high-pass filter that could remove legitimate bass fundamentals.
Users can recalibrate after the room or microphone changes, or stop and restart listening to return to the unchanged detector default.
Calibration is intentionally not persisted because microphone placement, hardware gain, and room noise vary between sessions and devices.
