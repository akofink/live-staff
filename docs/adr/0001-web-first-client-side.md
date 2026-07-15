# ADR 0001: Web-First, Client-Side Product

## Status

Accepted

## Context

The product must be immediately accessible, free, privacy-preserving, and viable without account or infrastructure work.

## Decision

Build a static TypeScript web application that performs microphone analysis in the browser.
Do not introduce a backend, accounts, cloud storage, or server-side audio analysis for the core product.

## Consequences

Audio stays on the user's device and static hosting is sufficient.
Browser compatibility and local resource management become first-class concerns.
