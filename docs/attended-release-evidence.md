# Optional Device Notes

## Purpose

This harness is an optional local notepad for a device session that is already happening.
It is not a release gate, and it does not require thermal, battery, screen-reader, or route testing.
It does not automate a pass, request microphone access, capture or persist microphone audio, inspect network traffic, or upload evidence.
Every result is a human note and defaults to `not-run`.

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
Older notes in [1.0-candidate.md](release-evidence/1.0-candidate.md) are history for the commits they name.
They are not a checklist of missing work.

The report is saved only in the harness origin's `localStorage`.
Export both JSON and Markdown after each device session and review the files before committing any evidence.
The report structure is checked before export.
`npm test` covers report validation and Markdown serialization.

Do not include notification content, account information, stable device identifiers, private URLs, or unrelated network traffic in notes or screenshots.
Reports should identify a device by model, OS, browser, input route, and relevant display mode, not by a person's name, serial number, advertising identifier, or full user-agent string.

## If You Happen To Try a Device

Note the device, browser, and what you actually tried.
A short listen is enough.
Do not run a 30-minute thermal or battery session, and do not treat a missing screen-reader pass as unfinished work.
Unavailable scenarios are just unavailable.
Do not mark them as failures of a requirement that no longer exists.

## Not a Gate

Issues #71, #72, and #77 are closed.
Do not reopen them because a device note is missing.
An exported `blocked`, `fail`, or `not-run` row is a note, not a release blocker.
