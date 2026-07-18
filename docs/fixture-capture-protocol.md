# Fixture Capture Protocol

## Boundary

This protocol prepares reusable tooling for issue [#82](https://github.com/akofink/live-staff/issues/82).
It does not add recordings or physical evidence.
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

## Required Capture Matrix

The physical follow-up needs the following exact minimum matrix.
For every cell, record three independently verified notes spanning the source's usable low, middle, and high range, including the detector's lower bound near B-flat1 when the instrument can produce it.
Capture two takes per note at quiet, medium, and loud dynamics, at 0.5 m and 2 m, in both quiet and HVAC/fan conditions.
Each take requires a same-take lossless/AAC pair and decoder-consistency report.

| Instrument source | Minimum distinct sources or performers |
| --- | ---: |
| Acoustic piano | 2 pianos and 2 performers |
| Voice | 2 performers |
| Woodwind | 1 performer |
| Brass | 1 performer |
| Bowed string | 1 performer |
| Plucked string | 1 performer |

Repeat that instrument matrix across phone built-in, laptop built-in, wired external, and Bluetooth capture paths where each path is supported.
For every supported device/path combination, capture one complete quiet-room, medium-dynamic, 0.5 m subset at both 44.1 and 48 kHz.
Record unsupported sample rates or paths as unavailable in the operator log rather than fabricating or converting files.

## Evidence Integration

Future evaluator reports must stratify results by instrument family and source, expected reference frequency, fundamental-to-strongest-partial ratio, SNR, onset versus sustain window, frame size, room condition, dynamic, distance, sample rate, codec, device, microphone, and capture path.
Fundamental-to-partial ratio and SNR are derived analysis values, not capture labels, and must preserve the analysis method and window coordinates in the report.
The current evaluator remains a frozen baseline for the existing corpus until validated manifests and physical recordings land.
Issue #77 owns detector behavior; issue #71 owns attended physical-device evidence.
