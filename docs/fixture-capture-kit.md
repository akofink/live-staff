# Fixture Capture Kit

This kit is the operator workflow for issue [#82](https://github.com/akofink/live-staff/issues/82).
It does not add recordings.
It does not mark any capture-matrix cell complete.
It does not claim detector accuracy, physical-device support, screen-reader coverage, or 1.0 completion.

The [fixture capture protocol](fixture-capture-protocol.md) remains the contract.
Use this kit to run that contract without inventing labels from filenames or detector output.

## Do Not Capture From This Kit

- Do not start an attended recording session from an unattended agent.
- Do not retrofit, rename, normalize, trim, denoise, EQ, relabel, re-encode, or replace files in `tests/fixtures/piano-iphone-16-pro-macbook-air-m2/`.
- Do not derive expected concert pitch, MIDI number, or reference frequency from a filename or from Live Staff.
- Do not convert an unsupported sample rate or capture path into a substitute file.
- Do not place names, contact details, precise addresses, serial numbers, account identifiers, or unrelated speech in a manifest, checklist, or recording.

The existing piano corpus is a frozen AAC-only baseline.
It has no v1 manifest and no lossless pair, so it fills **zero** cells of the remaining matrix.

## Remaining Work

The exact remaining capture matrix is [82-remaining-capture-matrix.md](release-evidence/82-remaining-capture-matrix.md).
Every listed cell is remaining as of commit `ded54f7`.
A cell is complete only when its primary take recipe is present, independently verified, manifest-validated, and reviewed for consent and privacy.
Unsupported hardware is logged as unavailable.
It is not fabricated.

## Files In This Kit

| File | Use |
| --- | --- |
| [Remaining capture matrix](release-evidence/82-remaining-capture-matrix.md) | Exact remaining cells and the per-cell take recipe |
| [Manifest template](../tests/fixtures/templates/manifest.template.json) | Copy into a **new** fixture-set directory and replace every example value |
| [Template notes](../tests/fixtures/templates/README.md) | Field-by-field fill instructions |
| [Manifest schema](../tests/fixtures/manifest.schema.json) | Version 1 structural contract |
| `npm run fixtures:stats` | Print filename, byte count, and SHA-256 for audio files in a set directory |
| `npm run fixtures:validate` | Authoritative validator for a filled manifest |

## Session Checklist

Complete this list once per new fixture-set directory.
One directory is one instrument source, performer, device, microphone path, distance, room condition, and sample rate.
A remaining matrix cell needs four such directories at the native sample rate, plus a fifth other-rate directory when that rate is supported.

- [ ] Confirm issue #82 is still the owner of this capture and that this directory is **not** the frozen piano set.
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

## First Cell Versus Complete Matrix

The remaining matrix is the acceptance target for #82.
If hardware or performers arrive in stages, finish and validate one complete cell, meaning all required directories for that source and path, rather than scattering incomplete takes.
An incomplete directory may exist privately, but it does not fill a matrix cell and should not be described as #82 progress in a release record.

## Related Evidence

Issue #77 owns detector behavior.
Issue #71 owns attended physical-device evidence.
This kit supplies recordings those issues can later use.
It does not close them.
