import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const audioName = /\.(wav|caf|m4a|aac|flac)$/i;

export async function assetStats(root) {
  const directory = resolve(root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (!entry.isFile() || !audioName.test(entry.name)) continue;
    const bytes = await readFile(resolve(directory, entry.name));
    files.push({
      path: entry.name,
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }

  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

export function formatAssetStats(files) {
  return files.map((file) => `${file.path}\t${file.bytes}\t${file.sha256}`).join("\n");
}

async function main() {
  const root = process.argv[2];
  if (!root) throw new Error("Usage: npm run fixtures:stats -- <fixture-set-dir>");
  const files = await assetStats(root);
  if (files.length === 0) throw new Error(`No audio assets found in ${root}`);
  console.log(formatAssetStats(files));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
