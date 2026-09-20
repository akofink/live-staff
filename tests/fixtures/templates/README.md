# Fixture Manifest Template

Copy `manifest.template.json` into a **new** fixture-set directory.
Never copy it into `tests/fixtures/piano-iphone-16-pro-macbook-air-m2/`.
Never commit the template values as if they were a real capture.

Replace every example value with observed evidence before validation.

## Required Replacements

- `setId` must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and should identify family, source slot, path, and sample rate.
- `capturedAt` and every `verifiedAt` / `confirmedAt` value must be real ISO-8601 timestamps.
- `instrument.family` must be one of `piano`, `voice`, `woodwind`, `brass`, `bowed-string`, or `plucked-string`.
- `instrument.makeModel` and `instrument.identifier` must be non-personal.
- `capture.path` must be one of `phone-built-in`, `laptop-built-in`, `wired-external`, or `bluetooth`.
- `capture.sampleRateHz` must be the actual 44100 or 48000 Hz rate, not a converted rate.
- `room.condition` must be `quiet` or `hvac-or-fan`.
- `takes[].expected.concertPitch` uses scientific pitch notation such as `A3` or `Bb1`.
- `takes[].expected.concertMidi` must agree with that pitch.
- `takes[].expected.referenceFrequencyHz` must come from a hardware tuner, strobe tuner, or calibrated reference instrument.
- `takes[].expected.verificationMethod` must be one of those three methods.
- `takes[].provenance.pairingMethod` is `simultaneous-recorders` with `processing: "none"`, or `aac-from-lossless-master` with `processing: "aac-encoded-from-lossless-master"`.
- Each take has exactly two files, one `lossless` and one `aac`.
- `files[].bytes` and `files[].sha256` must match the files on disk.
- `decoderConsistency` has one report per take, and source hashes must match the take files.

Run `npm run fixtures:stats -- tests/fixtures/<set-id>` to fill byte counts and SHA-256 values.
Run `npm run fixtures:validate -- tests/fixtures/<set-id>/manifest.json` only after the audio files exist.

The template's zero hashes, `bytes: 1`, and example pitch are invalid for a real take.
They exist so the file is complete JSON, not so it can pass validation.
