# Release Policy

## Scope

Live Staff releases are static client-side builds published through GitHub Pages.
They add no telemetry, backend, account, audio upload, or operational service.
Microphone audio, frames, and detections remain in the browser and are never persisted or transmitted.

## Milestone Exit Gates

Each roadmap milestone is complete only when its scoped behavior has tests and the full automated gate passes: `npm run lint`, `npm test`, and `npm run build`.
Audio, music-domain, notation, privacy, or UI changes also require the applicable evidence below before release.

| Milestone | Exit gate |
| --- | --- |
| Audio and stable detection | Synthetic-signal and fixture results cover supported ranges, silence, uncertainty, and stabilization; a sustained tone normally reaches a stable display in 100 to 250 ms. |
| Notation and instruments | Known concert-to-written examples, clef placement, accidentals, ranges, and labels have automated coverage. |
| Public proof of concept | Permission, listening, silence, failure, and stop states are understandable; at least one current desktop and one current mobile browser have manual evidence. |
| 1.0 hardening | All 1.0 requirements in the product specification are implemented, supported-browser/device evidence is current, accessibility and performance gates pass, and known limitations are published. |

## Release Evidence

Every release records the version, commit, linked issues, automated results, and outstanding manual validation in its pull request or release notes.

Required automated evidence is a clean lockfile install and the full CI gate.
The CI gate runs `npm run verify:privacy` against the deployed artifact and fails if it contains telemetry markers.
Changed domain logic needs focused unit coverage.
Changed browser behavior needs browser tests for permission, start and stop, interruption, preferences, and responsive layout when that behavior is available.

Required manual evidence for an audio or UI release is:

- Current Chrome or Chromium desktop and current Safari on iOS or iPadOS, when available.
- A 320 px-wide phone viewport plus a tablet or desktop viewport.
- Keyboard-only operation, visible focus, text alternatives for the note and states, and a screen-reader check of permission, listening, silence, and error announcements.
- Voice, a generated tone or piano, and a transposing instrument when available; record the instrument, browser, device, and any known detector limits.
- Microphone permission is requested only from the start action, stopping releases tracks and context, and browser developer tools show no audio, detection, preference, or analytics network request.

## Performance And Accessibility

The release target is responsive controls and a stable displayed note about 100 to 250 ms after a pitch settles on the tested devices.
Reject a release that blocks interaction during analysis, makes the primary staff or listening control unusable at 320 px, relies on color alone, loses keyboard access, or disregards reduced-motion preferences.
Review the production-build output on every release.
Investigate a new bundle-size warning or material increase before publishing; document an accepted increase and its reason in release evidence.

## Pages Deployment And Rollback

GitHub Pages deploys the `dist` artifact produced from `main` by the existing deploy workflow.
Release only after the corresponding CI workflow succeeds, then smoke-test the published URL for load, start, stop, and the privacy copy.
After deployment, the Pages workflow fetches its reported production URL and fails when the HTML contains a telemetry marker or loads an executable third-party script.
It also opens the deployed URL in Chromium, waits for delayed client instrumentation, inspects loaded scripts, and fails on a telemetry request or a failed document, script, or stylesheet request.
The browser check does not start listening or request microphone access.
Cloudflare can vary injected content by browser or edge cache, so a clean `curl` response is not sufficient privacy evidence.
If it detects Cloudflare Insights or `/cdn-cgi/rum`, the custom-domain administrator must disable Web Analytics for `live-staff.akofink.com` in Cloudflare Analytics and Logs > Web Analytics, remove any equivalent Zaraz or HTML Rewrite injection rule, and purge the `https://live-staff.akofink.com/` cache entry or the full zone cache before redeploying.
The custom-domain build must use `VITE_BASE_PATH=/`; `/live-staff/` is the project-site path and its assets return 404 from the custom-domain origin.
The repository cannot remove an injector that runs after the `dist` artifact is uploaded.
If a release is unsafe or materially broken, revert the offending commit on `main` and allow Pages to deploy the reverted build.
For an urgent static recovery, use the existing manual Pages workflow only for a previously verified commit; follow with a revert or fix commit so `main` remains the deployed source of truth.

## Dependencies And Security

Review Dependabot updates weekly and before a release.
For every dependency or GitHub Actions update, inspect the changelog and license, run the full automated gate, and manually retest affected browser or audio behavior.
Do not add a dependency that sends data off-device or requires a service without an explicit product decision.
Address security fixes on the latest `main` version under `SECURITY.md`.

## Versioning And Cadence

The current `0.0.0` package version is development-only and is not a public compatibility promise.
The first published proof of concept is `0.1.0`.
Before `1.0.0`, use semantic versioning with `0.MINOR.0` for additive, user-visible milestones and `0.MINOR.PATCH` for compatible fixes, documentation, and dependency-only releases.
Treat a breaking change during `0.x` as a new minor version and document the migration or behavior change.
Release when a milestone gate is met, not on a fixed calendar; group low-risk fixes into a regular cadence when practical and publish urgent privacy, security, or correctness fixes promptly.
Cut `1.0.0` only after the 1.0 hardening gate and a dedicated release review confirm the product specification, privacy promise, support evidence, and limitations.

## Public Known Limitations

Public release notes and the app documentation must state that Live Staff is for one dominant sustained pitched source in limited background noise.
It is not polyphonic recognition, automatic instrument recognition, score following, or a substitute for a tuner, teacher, or professional transcription workflow.
The in-repository autocorrelation detector is a proof-of-concept implementation and is not a production-grade guarantee across every instrument, range, room, or mobile browser.
Supported browsers and devices are only those with current recorded manual validation.
