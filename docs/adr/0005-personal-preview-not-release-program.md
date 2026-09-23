# ADR 0005: Personal Preview, Not a Release Program

## Status

Accepted

## Context

The repository grew a version 1.0 hardening program: attended device matrices, screen-reader certification, thermal and battery runs, a 32-cell recording corpus, and a dedicated release review.
That program treated a personal static site as a product launch.
The maintainer does not want a numbered 1.0 release as current work.
If a concrete problem shows up later, including heat or battery cost, it can be fixed then.
Ordinary changes should stay efficient without a premature optimization campaign.

## Decision

Live Staff remains an unversioned personal preview.
Do not block ordinary changes on a 1.0 review, a device-evidence matrix, thermal or battery measurement, screen-reader certification, or a new recording corpus.
Keep the privacy promise, the automated checks that already exist, and an honest statement of the detector's limits.
A numbered release, a new recording set, or a detector research pass happens only when the maintainer asks for that specific work.

## Consequences

Issues #71, #72, #77, #82, and #98 are closed as not planned.
They are not current work and should not be reopened as gates.
Historical evidence notes stay in the repository as history.
The capture kit and matrix are optional references, not an acceptance target.
The existing build budget and privacy checks remain practical guards, not a launch checklist.
