# ADR 0003: Replaceable Pitch Detector

## Status

Accepted

## Context

Pitch-detector quality, maintenance, performance, and device behavior need real-world evaluation.

## Decision

Expose pitch detection through a small domain interface that returns raw estimates.
Keep stabilization separate from detection and do not couple product logic to a detector library.

## Consequences

A detector can be benchmarked or replaced without changing transposition or UI behavior.
The adapter must clearly document its confidence semantics.
