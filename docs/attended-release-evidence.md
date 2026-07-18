# Attended Release Evidence Harness

## Purpose

The developer-only attended harness makes physical-device and assistive-technology observations consistent and exportable.
It does not automate a pass, request microphone access, capture or persist microphone audio, inspect network traffic, or upload evidence.
Every result is a human attestation and defaults to `not-run`.
Before selecting a result, the operator must attest that the check was attended and every unavailable scenario was recorded; this does not claim a blocked scenario was performed.

## Start The Harness

Run the following from the repository checkout whose commit will be tested:

```sh
npm ci
npm run evidence:attended
```

The command injects the checkout SHA and serves the harness on the local network.
Open the printed network URL ending in `/release-evidence.html` on the device under test.
If the device cannot reach the development host, use the harness on the inspecting desktop and enter the physical device details there.
Confirm that the App URL names the exact deployed candidate, then use **Open app in a new tab**.

The report is saved only in the harness origin's `localStorage`.
Export both JSON and Markdown after each device session and review the files before committing any evidence.
The versioned report structure and required attestations are validated before export; `npm test` deterministically tests invalid-report rejection and Markdown serialization.

Do not include notification content, account information, stable device identifiers, private URLs, or unrelated network traffic in notes or screenshots.
Reports should identify a device by model, OS, browser, input route, and relevant display mode, not by a person's name, serial number, advertising identifier, or full user-agent string.

## Required Sessions

### iOS Or iPadOS Safari

Use a physical iPhone or iPad with current Safari.
Record portrait and landscape layout, Safari microphone permission UI, start and stop indicators, background/resume, screen lock, an available OS audio interruption, permission revocation, and every available wired, Bluetooth, or external route change.
Use Safari Web Inspector to inspect network activity from before Start through Stop and preference changes.
Run at least 30 minutes with filters and the opt-in monitor enabled, recording battery endpoints, thermal observation, responsiveness, display continuity, and Web Inspector memory information when available.

### Android Chrome

Use representative physical Android hardware with current Chrome.
Record the device display mode and CSS viewport, then perform the same core, lifecycle, route, privacy, and sustained checks.
Use Chrome remote debugging for the network log and memory information when available.
Record unavailable interruption or route scenarios as `blocked`, never `pass`.

### Desktop Safari And Chrome

Run separate attended sessions in current Safari and current Chrome on physical desktop hardware.
Exercise a real microphone, keyboard-only navigation, visible focus, 200% zoom, start and stop, history, transposition, calibration, filters and bypass, monitor opt-in, privacy network inspection, and each available input route.
Browser automation or an emulated mobile viewport does not replace these sessions.

### VoiceOver And TalkBack

Name the screen reader, version, browser, OS, and device in each report.
With VoiceOver on Apple hardware and TalkBack on Android hardware, navigate without a pointer and attest each state named by the screen-reader check.
Do not mark a screen-reader result from DOM inspection, an accessibility tree snapshot, or another automated signal.
Record duplicate, missing, delayed, or unclear announcements as failures with exact wording when safe.

### Sustained Thermal And Battery

Begin from a recorded battery percentage and power state.
Run active microphone capture for at least 30 minutes with filters and the signal monitor enabled, without connecting power unless that is the declared test condition.
Record end battery percentage, duration, device temperature in plain observational terms, operating-system thermal warnings, responsiveness, display freezes, dropped updates, and memory data when available.
Do not convert subjective temperature observations into unsupported measurements.

## Evidence Decision

Keep issue [#71](https://github.com/akofink/live-staff/issues/71) open until required physical-device, screen-reader, sustained-performance, and active-capture privacy reports exist and have been reviewed.
Issue [#77](https://github.com/akofink/live-staff/issues/77) blocks detector accuracy claims and final accuracy validation.
After #77 is resolved and deployed, retest the affected commit rather than carrying forward prior pitch observations.
An exported `blocked`, `fail`, or `not-run` row is durable evidence of a limitation, not evidence that the requirement passed.
