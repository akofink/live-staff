# Release Policy

## Scope

Live Staff releases are static client-side builds published through GitHub Pages.
They add no telemetry, backend, account, audio upload, or operational service.
Microphone audio, frames, and detections remain in the browser and are never persisted or transmitted.

## Practical Checks

This is a personal preview, not a launch checklist.
See [ADR 0005](adr/0005-personal-preview-not-release-program.md).
Run the automated checks that match the change.
The usual set is `npm run lint`, `npm test`, `npm run build`, `npm run test:privacy`, and `npm run verify:privacy`.
Audio or detector changes also use `npm run evaluate:fixtures` and `npm run evaluate:performance` when those commands already cover the change.

Synthetic checks cover chromatic pitches from Bb1 at 58.27 Hz through B5 at 987.77 Hz.
The frozen piano fixtures are a regression corpus, not a claim that every real instrument is detected correctly.
Changed music logic needs a focused unit test.
Changed browser behavior needs a browser test for the behavior that changed.

A manual listen, a phone viewport, or a screen-reader pass is welcome when it is easy.
None of those is required before an ordinary change lands.
Do not schedule thermal, battery, sustained-performance, route-matrix, or capture-corpus work.

## Release Evidence

Pages publishes `main`.
There is no current numbered release.
A pull request should say what changed and which checks ran.
Do not invent outstanding manual validation as follow-up work.

CI checks that the built `dist` artifact contains no known telemetry endpoint or third-party executable script.
The fixture evaluator keeps the single-piano regression floor and publishes every estimate or absence.
That floor is a regression guard, not a product-accuracy promise.

## Performance And Accessibility

The production entry JavaScript, measured from the files referenced by `dist/index.html` after `gzip`, must not exceed 100 KB.
The notation renderer is a separate chunk, but the current idle page requests it to draw the persistent empty staff.
`npm run build` enforces this budget and reports its measured size.
Aim for a responsive start or stop control and a stable displayed note about 100 to 250 ms after a pitch settles.
The staff may finish drawing after the text alternative updates, but it must remain labeled and render without a layout shift that obscures controls.
Do not land a change that blocks interaction during analysis, makes the staff or listening control unusable at 320 px, relies on color alone, or loses keyboard access.
The build budget is a practical size guard, not a launch review.
Investigate a budget failure or a large unexpected increase before merging, and note an accepted exception in the pull request.

## Pages Deployment And Rollback

GitHub Pages deploys the `dist` artifact produced from `main` by the existing deploy workflow.
Before upload, the workflow verifies the artifact contains no telemetry endpoint or third-party executable script.
After Pages deploys, it opens `https://live-staff.akofink.com/` in Chromium and fails on telemetry or third-party executable requests.
The post-deploy check intentionally does not use the GitHub Pages deployment URL because the public privacy promise applies to the custom domain.
It does not start listening or request microphone permission, so audio remains local to user-initiated browser capture.
Cloudflare configuration is outside this repository and can inject analytics after GitHub Pages publishes a clean artifact.
If the check detects Cloudflare Insights or `/cdn-cgi/rum`, the Cloudflare administrator must disable Web Analytics for `live-staff.akofink.com`, remove any equivalent Zaraz or HTML rewrite injection rule, purge the affected cache, and redeploy.
Merge after the relevant CI workflow succeeds.
A quick look at the published URL is enough for a user-visible change.
If a release is unsafe or materially broken, revert the offending commit on `main` and allow Pages to deploy the reverted build.
For an urgent static recovery, use the existing manual Pages workflow only for a previously verified commit; follow with a revert or fix commit so `main` remains the deployed source of truth.

## Offline And Update Contract

A loaded page keeps working if the network drops.
A new visit or reload still needs a connection, and the app is not an installable PWA.
This bounded contract avoids persistent application caches while preserving the utility during an interrupted connection.

The production build must not register a service worker or populate Cache Storage.
Automated browser coverage takes a loaded page offline, exercises listening and preferences without requests, verifies Cache Storage remains empty, then restores the network and proves that reload uses normal requests for the document and content-hashed assets rather than service-worker responses.
Ordinary updates and rollback deployments therefore use the host's standard HTTP cache validation; there is no install, activate, stale-cache cleanup, or client migration phase that can indefinitely pin a release.
If a future requirement adds reloadable offline support, it requires a separate architecture decision covering versioned first-party resources, atomic activation, stale-cache removal, rollback compatibility, failure recovery, and equivalent privacy checks before release.

## Dependencies And Security

Review Dependabot updates when convenient.
For a dependency or GitHub Actions update, inspect the changelog and license and run the automated checks that match the risk.
Do not add a dependency that sends data off-device or requires a service without an explicit product decision.
Address security fixes on the latest `main` version under `SECURITY.md`.

## Versioning And Cadence

The `0.0.0` package version is not a public compatibility promise.
The deployed site is an unversioned preview.
Do not cut `1.0.0` unless the maintainer explicitly asks for a numbered release.
Publish a privacy, security, or correctness fix when it is ready, not on a calendar.

## Public Known Limitations

When describing Live Staff publicly, say that it is for one dominant sustained pitched source in limited background noise.
It is not polyphonic recognition, automatic instrument recognition, score following, or a substitute for a tuner, teacher, or professional transcription workflow.
The in-repository autocorrelation detector is a proof of concept.
It can miss or misplace notes, including octave errors on the frozen piano set.
That is a known limitation, not an open research assignment.
The preview is usable in current browsers that provide Web Audio and microphone access.
Missing a formal device matrix does not make the site unsupported.
