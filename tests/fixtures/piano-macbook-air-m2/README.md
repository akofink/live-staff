# Piano Fixtures: MacBook Air M2

## Purpose

These project-owned recordings provide realistic detector-validation inputs beyond synthetic tones.
They intentionally preserve the original room, instrument, microphone, attack, decay, and AAC encoding characteristics.

## Recording Context

- Instrument: Steinway A3 grand piano.
- Environment: residential one-bedroom apartment.
- Microphone: default built-in microphone on a MacBook Air M2.
- Capture: QuickTime Player audio recording.
- Format: mono AAC in an M4A container at 48 kHz.
- Performance: one sustained concert-pitch piano note per file.
- Processing: none after recording.

## Fixture Contract

The filename is the expected concert pitch using scientific pitch notation with `bb` for B-flat.
Fixtures include natural attack and decay; tests should assess stable analysis windows rather than assume the whole recording has one reliable pitch.
Do not replace, normalize, trim, noise-reduce, re-encode, or otherwise transform a fixture in place.
Add a new named fixture set when testing a materially different recording condition.

## Checksums

SHA-256 checksums preserve the identity of the raw recordings.

| File | Expected pitch | Duration | SHA-256 |
| --- | --- | ---: | --- |
| `a4.m4a` | A4 | 4.031 s | `15092689916ae899d84a0d4dc8c95b9dbbedc381d7912c0c48cebf9ce41b2d1f` |
| `bb2.m4a` | Bb2 | 4.969 s | `0b122734c95e1260c8e47cd3f024e06fdcdb28aa4f42a22073ec79972eac8d72` |
| `bb3.m4a` | Bb3 | 4.713 s | `8593e02604d229862d89222ec710f571133378d96680955092b705d4cb57b337` |
| `c2.m4a` | C2 | 4.031 s | `5e45ba70e2859b2c020377aa76cbc6cdc71594fb3ab8c57d1ecf252f82b8fccf` |
| `c3.m4a` | C3 | 3.967 s | `0b4a741fc62fdce91c6163cefecf5eb7fbe455b1a8a22910e8a9aa00e5f353d0` |
| `c4.m4a` | C4 | 5.012 s | `7517be22c850dcda5dd1775527b14432b0dfff6d75eb4c07aa4c23e1c310b387` |
| `c5.m4a` | C5 | 4.031 s | `e96c638a437f72e032060612ec9e5782f708c682e66e649b0f4c8bdfb26157b8` |
| `c6.m4a` | C6 | 5.268 s | `ff7925c9acc9f0e015d72fc043e187172db45c8e854bbf8ff6079765521d4b14` |
| `e4.m4a` | E4 | 4.073 s | `c96362e76cae656d3f051778cd77d7cd660e384b6ff3b2ecfcb4ec52a058aa94` |
| `f2.m4a` | F2 | 3.647 s | `6769d380190d01d5a414a63e101813c62e11bbe2a1353f8b3fb19a01768c7d94` |
| `f3.m4a` | F3 | 5.055 s | `ed5e9ad963fa8b2b7cdfde818eac166a6e15520221da0adcbbd8db8217d78b98` |
| `g5.m4a` | G5 | 4.116 s | `96d55b88ea9589017341749fe0e0cbec065b459d56c442ae9907ea53c5af67c9` |
