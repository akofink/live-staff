# Music Theory and Transposition

## Conventions

Use scientific pitch notation: middle C is C4.
Detected frequency maps first to a concert MIDI pitch.
A4 is MIDI 69 and is fixed at 440 Hz in the shipped app.

## Pitch Terms

- Sounding pitch: the frequency detected from the microphone.
- Concert pitch: the note represented by that sounding frequency.
- Written pitch: the note shown in the selected instrument's part.

## Transposition Convention

Each instrument stores `writtenToConcertSemitones`.
It means:

```text
concertMidi = writtenMidi + writtenToConcertSemitones
writtenMidi = concertMidi - writtenToConcertSemitones
```

For a B-flat trumpet, written C sounds concert B-flat, so `writtenToConcertSemitones` is `-2`.
For an E-flat alto saxophone, written C sounds concert E-flat, so it is `-9`.
These examples are preserved by unit tests for the shipped instrument catalog.

## Instrument Data

Instrument definitions are data, not conditional UI behavior.
Each definition must include an identifier, display name, clef, transposition interval, practical ranges when known, and an accidental preference when useful.
The domain catalog includes concert pitch, B-flat clarinet, E-flat alto saxophone, B-flat tenor saxophone, B-flat trumpet, F horn, trombone, tuba, violin, viola, cello, and double bass.
The current compact UI exposes concert pitch, B-flat clarinet, B-flat trumpet, E-flat alto saxophone, and F horn.
Definitions are immutable and use written MIDI ranges, inclusive at both ends, when a practical range is supplied.
The generic concert-pitch definition has no range because it represents a notation mode rather than a physical instrument.

## Supported Instruments

| Instrument | Clef | Written-to-concert semitones |
| --- | --- | ---: |
| Concert pitch | Treble | 0 |
| B-flat clarinet | Treble | -2 |
| E-flat alto saxophone | Treble | -9 |
| B-flat tenor saxophone | Treble | -14 |
| B-flat trumpet | Treble | -2 |
| F horn | Treble | -7 |
| Trombone | Bass | 0 |
| Tuba | Bass | 0 |
| Violin | Treble | 0 |
| Viola | Alto | 0 |
| Cello | Bass | 0 |
| Double bass | Bass | -12 |

## Clefs

The persistent grand staff renders treble and bass clefs for all current display pitches.
Alto and tenor clef support is deferred but must fit the domain model.

## Enharmonic Spelling

The first release uses a deterministic chromatic spelling map with sharp or flat preference.
Instrument defaults can inform that preference.
Key-aware and contextual spelling are explicitly later work.
