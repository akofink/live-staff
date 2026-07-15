# ADR 0002: Canonical Concert Pitch

## Status

Accepted

## Context

Transposing instruments can create incorrect results when conversions are chained from one written notation to another.

## Decision

Convert detected frequency to concert MIDI immediately after stabilization.
Calculate every written or target-instrument pitch independently from that concert MIDI value.

## Consequences

Transposition is easier to reason about and test.
The `writtenToConcertSemitones` sign convention must remain documented and covered by tests.
