# Product Vision

## Problem

Musicians often need to connect a sound they produce with a note name, staff position, and the distinction between written and concert pitch.
Existing tools commonly prioritize tuning, score reading, or notation authoring rather than that immediate connection.

## Product

Live Staff is a focused browser utility: select an instrument, start listening, play one note, and see the appropriate written notation live.
It is not intended to be a digital audio workstation, a generic chromatic tuner, a lesson platform, or a notation editor.

## Primary Users

- Beginner instrumentalists learning note names and staff positions.
- Experienced musicians learning a new instrument, clef, or transposition system.
- Players of transposing instruments who need written and concert pitch together.

## Differentiation

The product's central promise is: "Show me what I am currently playing as written music for my instrument."
It is instrument-aware, private, free, immediate, and does not require an account.

## Principles

- Reading first, tuning second: staff notation is primary and cents are secondary.
- Immediate feedback: a stable played note should feel connected to its display.
- Instrument-aware notation: sounding, concert, and written pitch are distinct concepts.
- Client-side by default: microphone audio remains on the device.
- Small but complete: a polished utility is better than an incomplete platform.
- Portable core logic: music logic remains independent from React and browser infrastructure.

## Long-Term Opportunities

Potential future directions include clef learning, transposition exercises, MIDI input, teacher tools, context-aware spelling, and native packaging.
They do not justify expanding the initial scope before the core microphone-to-staff experience is reliable.
