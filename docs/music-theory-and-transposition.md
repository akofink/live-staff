# Music Theory and Transposition

## Conventions

Use scientific pitch notation: middle C is C4.
Detected frequency maps first to a concert MIDI pitch.
A4 is MIDI 69 and defaults to 440 Hz, with a configurable reference.

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
These examples must be preserved by unit tests when the instrument catalog is introduced.

## Instrument Data

Instrument definitions are data, not conditional UI behavior.
Each definition must include an identifier, display name, clef, transposition interval, practical ranges when known, and an accidental preference when useful.
The first catalog should prioritize concert pitch, B-flat clarinet, alto saxophone, tenor saxophone, B-flat trumpet, F horn, trombone, tuba, violin, viola, cello, and double bass.

## Clefs

Treble and bass clefs are initial requirements.
Alto and tenor clef support is deferred but must fit the domain model.

## Enharmonic Spelling

The first release uses a deterministic chromatic spelling map with sharp or flat preference.
Instrument defaults can inform that preference.
Key-aware and contextual spelling are explicitly later work.
