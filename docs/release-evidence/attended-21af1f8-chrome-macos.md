# Live Staff Attended Release Evidence

- Build SHA: `21af1f889ac3473fac2fe6511cf65eb09f442dfa`
- App URL: https://live-staff.akofink.com/
- Started: 2026-07-22T22:33:00Z
- Updated: 2026-07-22T22:52:00Z
- Device: MacBook Air \(M2, 16 GB\)
- OS: macOS 26.5.2 \(25F84\)
- Browser: Google Chrome 150.0.7871.129
- Input route: Built-in MacBook Air microphone; site and macOS permission were reported allowed by the operator, but capture was denied
- Viewport: Desktop Chrome controlled through Chrome DevTools; 320 by 720 CSS px emulation was active during network inspection and is not physical-mobile evidence
- Assistive technology: Chrome accessibility tree only; no screen reader
- Sustained duration: 19 minutes
- Battery: not isolated to not isolated
- Thermal observation: No active capture; no battery, thermal, or memory claim

This report contains attended human observations. No result was inferred automatically.

| Area | Instruction | Attended and unavailable scenarios recorded | Result | Notes and limitations |
| --- | --- | --- | --- | --- |
| Layout | Inspect portrait and landscape at a CSS viewport of at least 320 px, then 200% zoom or the platform large-text setting. Confirm no required control, status, history, or staff alternative is clipped or obscured. | yes | blocked | Desktop content and semantic text remained available. The controlled bridge reported a 320 by 720 CSS px emulation during network inspection, but 200 percent zoom and direct visual clipping inspection were not attended, so layout is not passed. |
| Microphone | From an idle page, activate Start listening. Confirm this user action causes the only permission prompt and listening starts after permission is granted. | yes | blocked | Start was activated by a user action and the app entered Requesting microphone access. After the operator reported allowing Chrome microphone permission, a fresh production load and Start attempt still ended with Microphone access was denied. Allow access and try again. Focus returned to Start. Capture did not start. |
| Pitch and history | Use a named live voice, instrument, or generated acoustic tone. Record expected and displayed notes in Notes, and confirm current note and recent history update together. Do not generalize accuracy beyond observations. | yes | blocked | No Chrome microphone capture started, so no live source, notation, history, or accuracy observation exists. |
| Transposition | Select B-flat trumpet while using the same concert source. Confirm the written note is one whole step above concert pitch and the pitch reference identifies the concert note. | yes | blocked | No active Chrome source was available to compare concert and written pitch. |
| Calibration | While listening in a quiet room, run room-noise calibration. Confirm understandable status, session-only behavior, and continued response to a louder pitched source. | yes | blocked | Calibration remained unavailable without active capture. |
| Filters | Add and edit a filter, compare enabled and bypassed behavior, reset it, and verify all controls remain operable without a pointer. | yes | blocked | No enabled-versus-bypassed audio comparison was possible without capture. |
| Signal monitor | Enable the opt-in waveform and spectrum monitor while listening, inspect it, then disable it. Confirm the app remains responsive and the diagnostic display stops immediately. | yes | blocked | The active signal monitor could not be exercised without capture. |
| Microphone | Stop listening and confirm the browser or operating-system microphone indicator clears. | yes | blocked | No Chrome track or operating-system microphone indicator became active, so release could not be tested. |
| Lifecycle | While listening, background or switch away from the browser, then return. Confirm the app explains the pause and one explicit action resumes without a duplicate permission request. | yes | blocked | No active Chrome capture session existed to background and recover. |
| Lifecycle | While listening, lock and unlock the device. Record the resulting state and whether one clear recovery action works. | yes | blocked | No active Chrome capture session existed to lock and recover. |
| Lifecycle | Cause an available operating-system audio interruption, such as a call or another audio session. Record the resulting state and recovery behavior. | yes | blocked | No active Chrome capture or controllable operating-system interruption was available. |
| Lifecycle | Revoke site microphone permission during or between sessions. Confirm the error and recovery guidance are accurate and no microphone remains active. | yes | blocked | The denied state and recovery guidance were observed, but permission could not first produce active capture, so revocation from an allowed session was not tested. |
| Lifecycle | Change among each available built-in, wired, Bluetooth, or external input route and remove an external input. Record unsupported scenarios as blocked, not passed. | yes | blocked | Only the built-in input was available and no active Chrome capture existed. Wired, Bluetooth, external-input removal, and route switching were not performed. |
| Accessibility | Navigate from page start without a pointer. Confirm logical focus order, visible focus, native names, units, values, disabled states, and disclosure states. | yes | blocked | Start retained focus after denial and the accessibility tree exposed native semantics. A complete pointer-free traversal, direct visible-focus inspection, and 200 percent zoom check were not attended. |
| Accessibility | With the named VoiceOver or TalkBack configuration, confirm idle, permission, listening, silence or uncertain input, detected note, denial, device loss, and recovery messages are announced once and remain understandable. Confirm raw SVG is not read. | yes | blocked | No VoiceOver or other screen reader was used. Accessibility-tree output is not screen-reader evidence. |
| Privacy | Inspect the browser network log from before Start through Stop and local preference changes. Fail for any audio, detection, preference, profile, analytics, telemetry, or third-party executable request. Record request observations without private URLs or identifiers. | yes | blocked | Initial production requests were inspected through DevTools, but active capture never started and the operator could not attend a cleared network log from Start through Stop and preference changes. Active-capture privacy remains unverified. |
| Sustained performance | Run at least 30 minutes with filters and monitor enabled. Record duration, battery start/end, thermal observation, memory when available, responsiveness, and any dropped or frozen display. | yes | blocked | No active Chrome capture or 30-minute run occurred. Battery, thermal, active memory, responsiveness, and display continuity remain unmeasured. |
