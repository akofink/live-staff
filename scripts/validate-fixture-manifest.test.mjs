import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { captureChecklist, validateManifest } from "./validate-fixture-manifest.mjs";

const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function fixture(overrides = {}) {
  const directory = await mkdtemp(resolve(tmpdir(), "live-staff-manifest-"));
  await writeFile(resolve(directory, "take.wav"), "lossless"); await writeFile(resolve(directory, "take.m4a"), "aac");
  const manifest = {
    schemaVersion: 1, setId: "test-set", capturedAt: "2026-07-18T12:00:00Z",
    instrument: { family: "piano", makeModel: "Test piano", identifier: "instrument-1" }, performer: { anonymousId: "performer-1", confirmedPerformedNotes: true },
    capture: { device: "Test device", microphone: "Built-in", path: "phone-built-in", distanceMeters: 1, sampleRateHz: 48000 }, room: { description: "Test room", condition: "quiet" },
    consent: { projectUseGranted: true, publicRepositoryGranted: true, confirmedAt: "2026-07-18T12:00:00Z", confirmedByAnonymousId: "performer-1" },
    takes: [{ takeId: "take-1", expected: { concertPitch: "A3", concertMidi: 57, referenceFrequencyHz: 220, verificationMethod: "hardware-tuner", verifiedAt: "2026-07-18T12:00:00Z", verifiedByAnonymousId: "verifier-1" }, dynamic: "medium", provenance: { originalCapture: "Recorder originals from one simultaneous take", pairingMethod: "simultaneous-recorders", processing: "none" }, files: [
      { role: "lossless", path: "take.wav", container: "wav", codec: "pcm-s24le", sampleRateHz: 48000, channels: 1, bytes: 8, sha256: hash("lossless") },
      { role: "aac", path: "take.m4a", container: "m4a", codec: "aac-lc", sampleRateHz: 48000, channels: 1, bytes: 3, sha256: hash("aac") },
    ] }],
    decoderConsistency: [{ takeId: "take-1", decoder: "Browser AudioContext", decoderVersion: "test", losslessSourceSha256: hash("lossless"), aacSourceSha256: hash("aac"), pcmFormat: "f32le-interleaved-normalized", channels: 1, losslessDecodedSha256: "a".repeat(64), aacDecodedSha256: "b".repeat(64), sampleRateHz: 48000, losslessDecodedFrames: 100, aacDecodedFrames: 100, comparisonStartFrame: 0, comparedFrames: 100, aacOffsetFromLosslessFrames: 0, alignmentMethod: "whole-frame-cross-correlation", peakAbsoluteDifference: 0.1, rmsDifference: 0.01, notes: "AAC is lossy." }], ...overrides,
  };
  const path = resolve(directory, "manifest.json"); await writeFile(path, JSON.stringify(manifest)); return { path, manifest };
}

const probe = async (path) => path.endsWith(".wav") ? { format: "wav", codec: "pcm_s24le", profile: "", sampleRateHz: 48000, channels: 1 } : { format: "mov,mp4,m4a,3gp,3g2,mj2", codec: "aac", profile: "LC", sampleRateHz: 48000, channels: 1 };
test("validates strict paired files and immutable hashes", async () => { const { path } = await fixture(); assert.equal((await validateManifest(path, probe)).takes.length, 1); });
test("rejects bytes changed after the manifest was recorded", async () => { const { path } = await fixture(); await writeFile(resolve(path, "../take.m4a"), "changed"); await assert.rejects(validateManifest(path, probe), /bytes does not match/); });
test("rejects missing independent decoder evidence", async () => { const { path } = await fixture({ decoderConsistency: [] }); await assert.rejects(validateManifest(path, probe), /one report per take/); });
test("rejects unknown fields", async () => { const { path } = await fixture({ inferredFromFilename: true }); await assert.rejects(validateManifest(path, probe), /unknown field/); });
test("rejects contradictory pitch evidence", async () => { const { path, manifest } = await fixture(); manifest.takes[0].expected.concertMidi = 58; await writeFile(path, JSON.stringify(manifest)); await assert.rejects(validateManifest(path, probe), /concertPitch and concertMidi disagree/); });
test("rejects media metadata that differs from the file", async () => { const { path } = await fixture(); const wrongProbe = async () => ({ format: "wav", codec: "pcm_s16le", profile: "", sampleRateHz: 44100, channels: 2 }); await assert.rejects(validateManifest(path, wrongProbe), /does not match ffprobe/); });
test("exports a deterministic operator checklist", async () => { const { path } = await fixture(); const manifest = await validateManifest(path, probe); assert.match(captureChecklist(manifest), /do not derive it from a filename/); assert.match(captureChecklist(manifest), /take-1: confirm A3 at 220 Hz/); });
