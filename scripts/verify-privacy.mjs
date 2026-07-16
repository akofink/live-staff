import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const telemetryPattern = /(?:static\.cloudflareinsights\.com|\/cdn-cgi\/rum(?:[/?"']|$)|google-analytics\.com|googletagmanager\.com|plausible\.io|api\.segment\.io|browser\.sentry-cdn\.com|sentry\.io|static\.hotjar\.com|clarity\.ms)/i;
const scriptSourcePattern = /<script\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;

export function assertPrivateContent(content, source, pageUrl) {
  if (telemetryPattern.test(content)) {
    throw new Error(`${source} contains a telemetry endpoint.`);
  }

  for (const match of content.matchAll(scriptSourcePattern)) {
    const scriptUrl = new URL(match[1] ?? match[2] ?? match[3], pageUrl);

    if (scriptUrl.origin !== pageUrl.origin) {
      throw new Error(`${source} loads an executable third-party script: ${scriptUrl.href}`);
    }
  }
}

async function artifactFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? artifactFiles(path) : [path];
    }),
  );

  return files.flat();
}

export async function verifyArtifact(directory) {
  const files = await artifactFiles(resolve(directory));
  const textFiles = files.filter((file) => /\.(?:css|html|js|json|mjs)$/i.test(file));

  await Promise.all(
    textFiles.map(async (file) => {
      assertPrivateContent(await readFile(file, "utf8"), file, new URL("https://artifact.invalid/"));
    }),
  );
}

async function main() {
  const [directory] = process.argv.slice(2);

  if (!directory) {
    throw new Error("Usage: node scripts/verify-privacy.mjs <artifact-directory>");
  }

  await verifyArtifact(directory);
  console.log("Artifact privacy verification passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
