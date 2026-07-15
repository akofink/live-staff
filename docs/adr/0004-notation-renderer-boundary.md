# ADR 0004: Replaceable Notation Renderer

## Status

Accepted

## Context

An established notation library may accelerate correct staff rendering, while a specialized SVG renderer may later offer a smaller and more responsive single-note experience.

## Decision

Adopt notation rendering behind an adapter interface.
Prototype an established maintained library before considering custom SVG.

## Consequences

Renderer-library details stay out of music logic and React components.
The project can evaluate bundle size, ergonomics, and continuous-update behavior with a technical spike.
