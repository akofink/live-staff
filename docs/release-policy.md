# Release Policy

## Scope

Live Staff releases are static client-side builds published through GitHub Pages.
They add no telemetry, backend, account, audio upload, or operational service.
Microphone audio, frames, and detections remain in the browser and are never persisted or transmitted.

## Milestone Exit Gates

Each roadmap milestone is complete only when its scoped behavior has tests and the full automated gate passes after `npm ci`: `npm run lint`, `npm test`, `npm run build`, `npm run test:privacy`, `npm run verify:privacy`, `npm run evaluate:fixtures`, and `npm run evaluate:performance`.
Audio, music-domain, notation, privacy, or UI changes also require the applicable evidence below before release.

| Milestone | Exit gate |
| --- | --- |
| Audio and stable detection | Synthetic evidence covers every chromatic pitch from Bb1 at 58.27 Hz through B5 at 987.77 Hz within 20 cents with zero octave errors or reviewed false positives; the worst-aligned modeled two-frame stable display reaches 160 ms. Recorded fixtures remain a corpus regression gate, not a general accuracy claim. |
| Notation and instruments | Known concert-to-written examples, clef placement, accidentals, ranges, and labels have automated coverage. |
| Public proof of concept | Permission, listening, silence, failure, and stop states are understandable; at least one current desktop and one current mobile browser have manual evidence. |
| 1.0 hardening | All 1.0 requirements in the product specification are implemented, supported-browser/device evidence is current, accessibility and performance gates pass, and known limitations are published. |

## Release Evidence

Every release records the version, commit, linked issues, automated results, and outstanding manual validation in its pull request or release notes.

Required automated evidence is a clean lockfile install and the full CI gate.
The CI gate verifies the built `dist` artifact contains no known telemetry endpoint or third-party executable script.
The fixture evaluator enforces the reviewed single-piano regression floor and publishes every estimate or absence.
CI retains its machine-readable JSON as the `detector-evidence` workflow artifact.
Supported-range accuracy comes only from deterministic synthetic evidence until representative project-owned instrument and device recordings exist.
Changed domain logic needs focused unit coverage.
Changed browser behavior needs browser tests for permission, start and stop, interruption, preferences, and responsive layout when that behavior is available.

Required manual evidence for an audio or UI release is:

- Current Chrome or Chromium desktop and current Safari on iOS or iPadOS, when available.
- A 320 px-wide phone viewport plus a tablet or desktop viewport.
- Keyboard-only operation, visible focus, text alternatives for the note and states, and a screen-reader check of permission, listening, silence, and error announcements.
- Voice, a generated tone or piano, and a transposing instrument when available; record the instrument, browser, device, and any known detector limits.
- Microphone permission is requested only from the start action, stopping releases tracks and context, and browser developer tools show no audio, detection, preference, or analytics network request.

## Performance And Accessibility

The production entry JavaScript, measured from the files referenced by `dist/index.html` after `gzip`, must not exceed 100 KB.
The notation renderer is a separate chunk, but the current idle page requests it to draw the persistent empty staff.
`npm run build` enforces this budget and reports its measured size.
The release target is a responsive start or stop control within 100 ms of input and a stable displayed note about 100 to 250 ms after a pitch settles on the tested devices.
The staff may finish drawing after the text alternative updates, but it must remain labeled and render without a layout shift that obscures controls.
Reject a release that blocks interaction during analysis, makes the primary staff or listening control unusable at 320 px, relies on color alone, loses keyboard access, or disregards reduced-motion preferences.
The production browser check at a 320 px viewport records the idle staff request and render, accessible staff label, and listening-control status update within the 100 ms interaction budget.
Record the build budget report and browser evidence for the initial app render, accessible staff label, and start or stop responsiveness in release evidence.
Investigate a new bundle-size warning, budget failure, or material increase before publishing; document an accepted exception and its reason in release evidence.

## Pages Deployment And Rollback

GitHub Pages deploys the `dist` artifact produced from `main` by the existing deploy workflow.
Before upload, the workflow verifies the artifact contains no telemetry endpoint or third-party executable script.
After Pages deploys, it opens `https://live-staff.akofink.com/` in Chromium and fails on telemetry or third-party executable requests.
The post-deploy check intentionally does not use the GitHub Pages deployment URL because the public privacy promise applies to the custom domain.
It does not start listening or request microphone permission, so audio remains local to user-initiated browser capture.
Cloudflare configuration is outside this repository and can inject analytics after GitHub Pages publishes a clean artifact.
If the check detects Cloudflare Insights or `/cdn-cgi/rum`, the Cloudflare administrator must disable Web Analytics for `live-staff.akofink.com`, remove any equivalent Zaraz or HTML rewrite injection rule, purge the affected cache, and redeploy.
Release only after the corresponding CI workflow succeeds, then smoke-test the published URL for load, start, stop, and the privacy copy.
If a release is unsafe or materially broken, revert the offending commit on `main` and allow Pages to deploy the reverted build.
For an urgent static recovery, use the existing manual Pages workflow only for a previously verified commit; follow with a revert or fix commit so `main` remains the deployed source of truth.

## Offline And Update Contract

Version 1.0 supports continued use after a successful online load loses its network connection.
It does not support a new visit or reload while offline and is not an installable PWA.
This bounded contract avoids persistent application caches while preserving the utility during an interrupted connection.

The production build must not register a service worker or populate Cache Storage.
Automated browser coverage takes a loaded page offline, exercises listening and preferences without requests, verifies Cache Storage remains empty, then restores the network and proves that reload uses normal requests for the document and content-hashed assets rather than service-worker responses.
Ordinary updates and rollback deployments therefore use the host's standard HTTP cache validation; there is no install, activate, stale-cache cleanup, or client migration phase that can indefinitely pin a release.
If a future requirement adds reloadable offline support, it requires a separate architecture decision covering versioned first-party resources, atomic activation, stale-cache removal, rollback compatibility, failure recovery, and equivalent privacy checks before release.

## Dependencies And Security

Review Dependabot updates weekly and before a release.
For every dependency or GitHub Actions update, inspect the changelog and license, run the full automated gate, and manually retest affected browser or audio behavior.
Do not add a dependency that sends data off-device or requires a service without an explicit product decision.
Address security fixes on the latest `main` version under `SECURITY.md`.

## Versioning And Cadence

The current `0.0.0` package version is development-only and is not a public compatibility promise.
No semantic release has been cut yet; the deployed site remains an unversioned preview while `package.json` is `0.0.0`.
Before `1.0.0`, use semantic versioning with `0.MINOR.0` for additive, user-visible milestones and `0.MINOR.PATCH` for compatible fixes, documentation, and dependency-only releases.
Treat a breaking change during `0.x` as a new minor version and document the migration or behavior change.
Release when a milestone gate is met, not on a fixed calendar; group low-risk fixes into a regular cadence when practical and publish urgent privacy, security, or correctness fixes promptly.
Cut `1.0.0` only after the 1.0 hardening gate and a dedicated release review confirm the product specification, privacy promise, support evidence, and limitations.

## Public Known Limitations

Public release notes and the app documentation must state that Live Staff is for one dominant sustained pitched source in limited background noise.
It is not polyphonic recognition, automatic instrument recognition, score following, or a substitute for a tuner, teacher, or professional transcription workflow.
The in-repository autocorrelation detector is a proof-of-concept implementation and is not a production-grade guarantee across every instrument, range, room, or mobile browser.
Supported browsers and devices are only those with current recorded manual validation.

## Currently Unmet 1.0 Gates

- [Issue #67](https://github.com/akofink/live-staff/issues/67) must complete interruption and lifecycle recovery.
- [Issue #71](https://github.com/akofink/live-staff/issues/71) must record current real-device, accessibility, privacy, and sustained-performance evidence.
- [Issue #72](https://github.com/akofink/live-staff/issues/72) owns the final versioned release review after these gates close.
