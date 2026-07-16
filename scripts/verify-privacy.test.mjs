import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import { verifyArtifact } from "./verify-privacy.mjs";

async function createArtifact(files) {
  const directory = await mkdtemp(resolve(tmpdir(), "live-staff-privacy-"));

  await Promise.all(
    Object.entries(files).map(async ([path, content]) => {
      const outputPath = resolve(directory, path);
      await mkdir(resolve(outputPath, ".."), { recursive: true });
      await writeFile(outputPath, content);
    }),
  );

  return directory;
}

test("accepts a first-party static artifact", async () => {
  const directory = await createArtifact({
    "index.html": '<script type="module" src="/assets/app.js"></script>',
    "assets/app.js": "console.log('local only');",
  });

  await verifyArtifact(directory);
});

test("rejects telemetry endpoints in emitted files", async () => {
  const directory = await createArtifact({
    "index.html": "<main></main>",
    "assets/app.js": 'fetch("https://static.cloudflareinsights.com/beacon.min.js")',
  });

  await assert.rejects(verifyArtifact(directory), /telemetry endpoint/);
});

test("rejects third-party executable scripts", async () => {
  const directory = await createArtifact({
    "index.html": '<script src="https://example.com/app.js"></script>',
  });

  await assert.rejects(verifyArtifact(directory), /third-party script/);
});
