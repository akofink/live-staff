import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const budgetBytes = 100 * 1024;
const distDirectory = resolve("dist");
const html = await readFile(resolve(distDirectory, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);

if (scripts.length === 0) {
  throw new Error("The production entry HTML does not reference a JavaScript module.");
}

function getOutputPath(script) {
  const pathname = new URL(script, "https://live-staff.invalid").pathname;
  const assetsIndex = pathname.indexOf("/assets/");

  if (assetsIndex === -1) {
    throw new Error(`The production entry script is not a Vite asset: ${script}`);
  }

  return resolve(distDirectory, `.${pathname.slice(assetsIndex)}`);
}

const initialBytes = (
  await Promise.all(
    scripts.map(async (script) => gzipSync(await readFile(getOutputPath(script))).byteLength),
  )
).reduce((total, size) => total + size, 0);

console.log(`Initial JavaScript: ${(initialBytes / 1024).toFixed(1)} KB gzip (budget: 100 KB)`);

if (initialBytes > budgetBytes) {
  throw new Error(`Initial JavaScript exceeds the ${budgetBytes / 1024} KB gzip budget.`);
}
