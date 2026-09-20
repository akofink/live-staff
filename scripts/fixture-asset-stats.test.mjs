import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { assetStats, formatAssetStats } from "./fixture-asset-stats.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

test("prints sorted audio byte counts and sha256 values", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "live-staff-stats-"));
  await writeFile(resolve(directory, "b.m4a"), "aac-b");
  await writeFile(resolve(directory, "a.wav"), "lossless-a");
  await writeFile(resolve(directory, "notes.md"), "ignore me");
  const files = await assetStats(directory);
  assert.deepEqual(files, [
    { path: "a.wav", bytes: 10, sha256: hash("lossless-a") },
    { path: "b.m4a", bytes: 5, sha256: hash("aac-b") },
  ]);
  assert.match(formatAssetStats(files), /^a\.wav\t10\t[a-f0-9]{64}\nb\.m4a\t5\t[a-f0-9]{64}$/);
});

test("rejects a directory with no audio assets from the CLI contract", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "live-staff-stats-empty-"));
  await writeFile(resolve(directory, "manifest.json"), "{}");
  const files = await assetStats(directory);
  assert.deepEqual(files, []);
});
