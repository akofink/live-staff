import { readFile, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
const files = Object.fromEntries(await Promise.all(["control", "candidates"].map(async (name) => {
  const bytes = await readFile(`test-results/detector-bundles/${name}.js`);
  return [name, { minifiedBytes: bytes.length, gzipBytes: gzipSync(bytes).length }];
})));
await writeFile("test-results/detector-bundle-cost.json", `${JSON.stringify({
  productionImportDeltaBytes: 0,
  productionImportDeltaBasis: "Benchmark candidates are not reachable from the production entry graph; this is structural, not a candidate-integration build measurement.",
  isolatedViteOxcEntries: files,
}, null, 2)}\n`);
