# Remaining #82 Capture Matrix

Status: every cell below is **remaining**.
Date: 2026-09-20.
Commit: `ded54f73984fac1a1f709cec826089c960f50a37`.
This matrix does not include fixture recordings.
It does not claim #82, #71, or 1.0 completion.

Use the [fixture capture kit](../fixture-capture-kit.md) and the [fixture capture protocol](../fixture-capture-protocol.md) with this list.
Do not treat the frozen piano AAC corpus as a filled cell.

## Frozen Corpus Exclusion

`tests/fixtures/piano-iphone-16-pro-macbook-air-m2/` remains an immutable single-piano AAC baseline.
It has no v1 manifest, no lossless master, and filename-derived expected pitch.
Preserve its bytes and labels unchanged.
Count of matrix cells filled by that set: **0**.

## Cell Definition

One cell is one distinct source slot crossed with one capture path.

Minimum distinct source slots:

| Source slot | Family | Distinct sources or performers required |
| --- | --- | --- |
| `piano-1` | piano | First of two pianos and two performers |
| `piano-2` | piano | Second of two pianos and two performers |
| `voice-1` | voice | First of two performers |
| `voice-2` | voice | Second of two performers |
| `woodwind-1` | woodwind | One performer |
| `brass-1` | brass | One performer |
| `bowed-string-1` | bowed-string | One performer |
| `plucked-string-1` | plucked-string | One performer |

`piano-1` and `piano-2` must use two pianos and two performers.
Do not fill both piano slots with one piano or one performer.

Capture paths:

- `phone-built-in`
- `laptop-built-in`
- `wired-external`
- `bluetooth`

If a path cannot be used with the available hardware, record that cell as **unavailable** in the operator log.
Do not convert, upsample, downsample, or re-route a different path to fake the cell.

## Per-Cell Take Recipe

A matrix cell is complete only when every required fixture-set directory for that source and path exists.
The manifest schema records one distance, room condition, path, and sample rate per directory, so a cell is several directories rather than one file.

For every **remaining** cell whose path is supported, capture the primary matrix at the device's actual native sample rate, which must be 44100 or 48000 Hz.

Primary directories, one per distance and room:

| Directory slice | Distance | Room condition | Takes in that directory |
| --- | ---: | --- | ---: |
| native-rate 0.5 m quiet | 0.5 m | quiet | 18 |
| native-rate 0.5 m HVAC/fan | 0.5 m | hvac-or-fan | 18 |
| native-rate 2 m quiet | 2 m | quiet | 18 |
| native-rate 2 m HVAC/fan | 2 m | hvac-or-fan | 18 |

Each of those 18-take directories contains:

- 3 independently verified concert notes spanning the source's usable low, middle, and high range
- Include the detector lower bound near B-flat1 when that source can produce it
- 2 takes per note
- 3 dynamics: quiet, medium, loud

That is 4 directories x 18 takes = **72 takes**.
Each take is one lossless file plus one AAC-LC/M4A file from the same take, so **144 media files**, plus one decoder-consistency report per take.

Other-rate subset:

- If both 44100 and 48000 Hz are supported on that device/path, add one directory at the other rate, 0.5 m, quiet room, medium dynamic only
- That directory is 3 notes x 2 takes = **6 takes**
- If the other rate is not supported, log it as unavailable rather than converting files

Each take still needs independent pitch verification, provenance, hashes, and decoder comparison.

## Remaining Cells

All 32 cells are remaining.

| Cell ID | Source slot | Family | Capture path | Primary 72-take matrix | Other-rate 6-take subset | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `piano-1-phone-built-in` | piano-1 | piano | phone-built-in | remaining | remaining or unavailable | remaining |
| `piano-1-laptop-built-in` | piano-1 | piano | laptop-built-in | remaining | remaining or unavailable | remaining |
| `piano-1-wired-external` | piano-1 | piano | wired-external | remaining | remaining or unavailable | remaining |
| `piano-1-bluetooth` | piano-1 | piano | bluetooth | remaining | remaining or unavailable | remaining |
| `piano-2-phone-built-in` | piano-2 | piano | phone-built-in | remaining | remaining or unavailable | remaining |
| `piano-2-laptop-built-in` | piano-2 | piano | laptop-built-in | remaining | remaining or unavailable | remaining |
| `piano-2-wired-external` | piano-2 | piano | wired-external | remaining | remaining or unavailable | remaining |
| `piano-2-bluetooth` | piano-2 | piano | bluetooth | remaining | remaining or unavailable | remaining |
| `voice-1-phone-built-in` | voice-1 | voice | phone-built-in | remaining | remaining or unavailable | remaining |
| `voice-1-laptop-built-in` | voice-1 | voice | laptop-built-in | remaining | remaining or unavailable | remaining |
| `voice-1-wired-external` | voice-1 | voice | wired-external | remaining | remaining or unavailable | remaining |
| `voice-1-bluetooth` | voice-1 | voice | bluetooth | remaining | remaining or unavailable | remaining |
| `voice-2-phone-built-in` | voice-2 | voice | phone-built-in | remaining | remaining or unavailable | remaining |
| `voice-2-laptop-built-in` | voice-2 | voice | laptop-built-in | remaining | remaining or unavailable | remaining |
| `voice-2-wired-external` | voice-2 | voice | wired-external | remaining | remaining or unavailable | remaining |
| `voice-2-bluetooth` | voice-2 | voice | bluetooth | remaining | remaining or unavailable | remaining |
| `woodwind-1-phone-built-in` | woodwind-1 | woodwind | phone-built-in | remaining | remaining or unavailable | remaining |
| `woodwind-1-laptop-built-in` | woodwind-1 | woodwind | laptop-built-in | remaining | remaining or unavailable | remaining |
| `woodwind-1-wired-external` | woodwind-1 | woodwind | wired-external | remaining | remaining or unavailable | remaining |
| `woodwind-1-bluetooth` | woodwind-1 | woodwind | bluetooth | remaining | remaining or unavailable | remaining |
| `brass-1-phone-built-in` | brass-1 | brass | phone-built-in | remaining | remaining or unavailable | remaining |
| `brass-1-laptop-built-in` | brass-1 | brass | laptop-built-in | remaining | remaining or unavailable | remaining |
| `brass-1-wired-external` | brass-1 | brass | wired-external | remaining | remaining or unavailable | remaining |
| `brass-1-bluetooth` | brass-1 | brass | bluetooth | remaining | remaining or unavailable | remaining |
| `bowed-string-1-phone-built-in` | bowed-string-1 | bowed-string | phone-built-in | remaining | remaining or unavailable | remaining |
| `bowed-string-1-laptop-built-in` | bowed-string-1 | bowed-string | laptop-built-in | remaining | remaining or unavailable | remaining |
| `bowed-string-1-wired-external` | bowed-string-1 | bowed-string | wired-external | remaining | remaining or unavailable | remaining |
| `bowed-string-1-bluetooth` | bowed-string-1 | bowed-string | bluetooth | remaining | remaining or unavailable | remaining |
| `plucked-string-1-phone-built-in` | plucked-string-1 | plucked-string | phone-built-in | remaining | remaining or unavailable | remaining |
| `plucked-string-1-laptop-built-in` | plucked-string-1 | plucked-string | laptop-built-in | remaining | remaining or unavailable | remaining |
| `plucked-string-1-wired-external` | plucked-string-1 | plucked-string | wired-external | remaining | remaining or unavailable | remaining |
| `plucked-string-1-bluetooth` | plucked-string-1 | plucked-string | bluetooth | remaining | remaining or unavailable | remaining |

If every path and both sample rates are supported, the minimum is 32 x 72 primary takes plus 32 x 6 other-rate takes, which is 2496 takes.
Log unavailable paths and rates instead of creating substitute files.

## Suggested Capture Order

This order does not shrink the matrix.

1. Complete `piano-1` on the first supported path, including decoder reports and a validated manifest.
2. Repeat `piano-1` on each additional supported path, logging unsupported paths.
3. Capture `piano-2` with the second piano and second performer.
4. Capture `voice-1` and `voice-2`.
5. Capture `woodwind-1`, `brass-1`, `bowed-string-1`, and `plucked-string-1`.
6. Add other-rate subsets only where the second rate is actually supported.

## Unavailable Log Template

Record unavailable cells in the operator archive, not as passing evidence.

```text
cellId:
sourceSlot:
capturePath:
sampleRateHz:
reason:
hardwarePresent:
loggedAt:
loggedByAnonymousId:
```

An unavailable log is durable evidence of a limitation.
It is not a filled cell.

## Completion Rule

Do not close issue #82 while any supported cell is remaining or while any remaining cell lacks independent verification, lossless/AAC pairing, hashes, decoder comparison, consent, and privacy review.
Do not close issue #71 or issue #72 from this matrix.
