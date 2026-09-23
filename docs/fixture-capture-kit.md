# Fixture Capture Kit

This kit is retired as current work.
Issue #82 is closed, and the capture matrix is not an acceptance target.
Use these notes only if the maintainer explicitly asks for a new recording.
Do not start a capture session from this document.

The [fixture capture protocol](fixture-capture-protocol.md) describes an optional method, not a contract that must be completed.

## Do Not Capture From This Kit

- Do not start an attended recording session from an unattended agent.
- Do not retrofit, rename, normalize, trim, denoise, EQ, relabel, re-encode, or replace files in `tests/fixtures/piano-iphone-16-pro-macbook-air-m2/`.
- Do not derive expected concert pitch, MIDI number, or reference frequency from a filename or from Live Staff.
- Do not convert an unsupported sample rate or capture path into a substitute file.
- Do not place names, contact details, precise addresses, serial numbers, account identifiers, or unrelated speech in a manifest, checklist, or recording.

The existing piano corpus is a frozen AAC-only baseline.
Leave it unchanged.
It does not need a lossless pair or a matrix cell.

## Not Remaining Work

The old matrix is [withdrawn](release-evidence/82-remaining-capture-matrix.md).
No cell is remaining.
Do not log unavailable hardware, and do not treat a missing recording as incomplete release work.

## Files In This Kit

| File | Use |
| --- | --- |
| [Retired matrix note](release-evidence/82-remaining-capture-matrix.md) | States that the old cell list is withdrawn |
| [Manifest template](../tests/fixtures/templates/manifest.template.json) | Copy into a **new** fixture-set directory and replace every example value |
| [Template notes](../tests/fixtures/templates/README.md) | Field-by-field fill instructions |
| [Manifest schema](../tests/fixtures/manifest.schema.json) | Version 1 structural contract |
| `npm run fixtures:stats` | Print filename, byte count, and SHA-256 for audio files in a set directory |
| `npm run fixtures:validate` | Authoritative validator for a filled manifest |

## Optional Checklist

Use this list only after an explicit request for a new recording.
Do not start it from this kit.
One directory is one instrument source, performer, device, microphone path, distance, room condition, and sample rate.
A remaining matrix cell needs four such directories at the native sample rate, plus a fifth other-rate directory when that rate is supported.

- [ ] Confirm the maintainer explicitly asked for this recording and that this directory is **not** the frozen piano set.
- [ ] Obtain explicit project-use and public-repository consent before recording.
- [ ] Assign anonymous set-local identifiers for the performer, verifier, and instrument.
- [ ] Record the instrument family and a non-personal make/model description.
- [ ] Record capture device, microphone, path, measured distance in meters, room description, room condition, and the actual 44100 or 48000 Hz sample rate.
- [ ] Confirm a hardware tuner, strobe tuner, or calibrated reference instrument is available before the first take.
- [ ] Confirm a same-take lossless and AAC pairing method: simultaneous recorders, or AAC encoded from an immutable lossless master.
- [ ] Create `tests/fixtures/<set-id>/` and copy `tests/fixtures/templates/manifest.template.json` to `manifest.json` in that directory.
- [ ] Replace every example value in `manifest.json` with observed values.
- [ ] Do not add a take whose expected pitch came from a filename, this app, or an unattended detector.

## Take Checklist

Complete this list for every take.

- [ ] Performer identifies the concert note before the take is kept.
- [ ] Independent verifier measures reference frequency with the declared method and records it before any detector evaluation.
- [ ] Concert pitch, concert MIDI, and reference frequency agree; the validator rejects a disagreement over 100 cents.
- [ ] Capture the requested dynamic and the measured distance in the declared room condition.
- [ ] Keep attack, sustain, decay, room sound, and codec behavior.
- [ ] Produce exactly one lossless master and one AAC-LC/M4A file from that uninterrupted take.
- [ ] After the declared capture or AAC-derivation step, do not normalize, trim, denoise, EQ, relabel, re-encode, or drop the take to improve metrics.
- [ ] Copy originals into the fixture-set directory and make the operator-archive originals read-only.
- [ ] Run `npm run fixtures:stats -- tests/fixtures/<set-id>` and copy byte counts and SHA-256 values into the manifest.
- [ ] Decode both files with a named, versioned decoder to normalized little-endian interleaved Float32 PCM.
- [ ] Align only by whole-frame cross-correlation.
- [ ] Record source hashes, decoded hashes, channels, both decoded frame counts, comparison start frame, compared frame count, signed AAC offset, peak absolute sample difference, and RMS sample difference.
- [ ] A positive `aacOffsetFromLosslessFrames` means the compared AAC window begins that many frames later than the lossless comparison start.

Suggested local decode after FFmpeg is installed:

```sh
ffmpeg -hide_banner -i take-lossless.wav -f f32le -acodec pcm_f32le take-lossless.f32
ffmpeg -hide_banner -i take.m4a -f f32le -acodec pcm_f32le take-aac.f32
```

Keep those PCM dumps in the operator archive if useful.
Do not commit decoded PCM unless a later reviewed decision says otherwise.

## Validation Checklist

- [ ] `ffprobe` is installed and can read both assets.
- [ ] `npm run fixtures:validate -- tests/fixtures/<set-id>/manifest.json` succeeds.
- [ ] Optionally export a take list with `npm run fixtures:validate -- tests/fixtures/<set-id>/manifest.json --checklist capture-checklist.md` and review it.
- [ ] Inspect staged audio and free text for personal or unrelated content.
- [ ] Confirm the frozen piano set is unmodified.
- [ ] Commit the new set only after consent and privacy review.

The validator cannot detect personal content in free text or audio.
Human review remains required.

## Not Current Work

Do not finish a cell, fill a matrix, or describe a recording as release progress.
Issues #71, #77, and #82 are closed.
A future recording needs a new, explicit request.
