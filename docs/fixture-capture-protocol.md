# Fixture Capture Protocol

## Boundary

This protocol is an optional method for a recording the maintainer explicitly requests.
It is not current work, and it does not require a capture matrix.
Issue #82 is closed.
The CLI reads only local files, makes no network requests, never requests microphone permission, and is absent from the production entry graph.
Do not place names, contact details, precise addresses, serial numbers, account identifiers, or unrelated speech in a manifest or recording.

## Manifest And Validation

Create one new fixture-set directory per materially different instrument, performer, device, microphone path, distance, room condition, or sample rate.
Do not retrofit the current piano fixture set or alter its bytes or labels.
Use [`tests/fixtures/manifest.schema.json`](../tests/fixtures/manifest.schema.json) as the version 1 structural contract and the CLI as the authoritative validator for cross-field, media, uniqueness, and file-integrity constraints.
Expected concert pitch, MIDI number, measured reference frequency, independent verification method, verifier, and verification time are explicit manifest values and must never be parsed from filenames or supplied by the detector under evaluation.

Each performance take has exactly two immutable assets: one lossless master and one AAC-LC/M4A file from the same take.
The manifest records byte count and lowercase SHA-256 for each original.
The validator reads and hashes the files and uses local `ffprobe` to confirm the declared container, codec/profile, sample rate, channels, and decodability, but never writes or transforms them.
Install FFmpeg locally before validation if `ffprobe` is unavailable.
Run:

```sh
npm run fixtures:validate -- tests/fixtures/<set>/manifest.json
npm run fixtures:validate -- tests/fixtures/<set>/manifest.json --checklist capture-checklist.md
```

The second form exports a local Markdown checklist after validation.
Commit the manifest and recordings only after consent and manual privacy review; validation cannot detect personal content in free text or audio.

## Capture Workflow

1. Obtain explicit project-use and public-repository consent before recording and assign anonymous set-local performer, verifier, and instrument identifiers.
2. Record the instrument family and non-personal make/model description, capture device, microphone, input path, measured microphone distance, room description and condition, and actual 44.1 or 48 kHz sample rate.
3. Have the performer identify the played concert note and attest the take list.
4. Independently verify each note with a hardware tuner, strobe tuner, or calibrated reference instrument and record the observed reference frequency before detector evaluation.
5. Capture lossless and AAC outputs from the same uninterrupted take at the requested dynamic and distance, either with simultaneous recorders or by encoding the AAC derivative from the immutable lossless master.
6. Preserve attack, sustain, decay, room sound, and codec behavior exactly after the declared capture or AAC-derivation step.
Do not subsequently normalize, trim, denoise, EQ, relabel, re-encode, or exclude an asset because of its result.
7. Copy originals into a new fixture-set directory, record byte counts and SHA-256 values, then make the originals read-only in the operator archive.
8. Decode both files with the named/versioned decoder to normalized little-endian interleaved Float32 PCM, align only by whole-frame cross-correlation, and report source and decoded hashes, channels, both decoded frame counts, comparison start frame, compared frame count, signed AAC offset, peak absolute sample difference, and RMS sample difference.
A positive `aacOffsetFromLosslessFrames` means the compared AAC window begins that many frames later than the lossless comparison start; a negative value means it begins earlier.
Do not claim AAC samples should hash-identically to lossless samples.
9. Validate the manifest, review the exported checklist, and inspect staged files for personal or unrelated audio before commit.

## Withdrawn Matrix

The old multi-instrument, multi-path, multi-distance matrix is withdrawn.
Do not recreate it, and do not log unavailable paths as if the matrix were still required.
The [retired note](release-evidence/82-remaining-capture-matrix.md) replaces that list.

## Evidence Integration

The current evaluator remains a regression check for the frozen piano corpus.
It does not wait on new recordings.
Issues #71 and #77 are closed and do not own follow-up evidence.
