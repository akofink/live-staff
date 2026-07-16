import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const telemetryPattern = /(?:cloudflareinsights|google-analytics|googletagmanager|plausible\.io|segment\.com|sentry\.io|hotjar\.com|clarity\.ms|analytics|telemetry|beacon)/i;
const scriptSourcePattern = /<script\b[^>]*\bsrc=(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>/gi;

function assertPrivateContent(content, source, pageUrl) {
  if (telemetryPattern.test(content)) {
    throw new Error(`${source} contains a telemetry marker.`);
  }

  if (!pageUrl) {
    return;
  }

  for (const match of content.matchAll(scriptSourcePattern)) {
    const scriptUrl = new URL(match[1] ?? match[2] ?? match[3], pageUrl);

    if (scriptUrl.origin !== pageUrl.origin) {
      throw new Error(`${source} loads an executable third-party script: ${scriptUrl.href}`);
    }
  }
}

async function verifyArtifact(directory) {
  const indexPath = resolve(directory, 'index.html');
  assertPrivateContent(await readFile(indexPath, 'utf8'), indexPath, new URL('https://artifact.invalid'));
}

async function verifyProduction(url) {
  let response;

  try {
    response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30_000) });
  } catch (error) {
    throw new Error(`Could not fetch production page ${url}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`Production page returned ${response.status}: ${response.url}`);
  }

  assertPrivateContent(await response.text(), response.url, new URL(response.url));
}

const [artifactDirectory, productionUrl] = process.argv.slice(2);

if (!artifactDirectory) {
  throw new Error('Usage: node scripts/verify-privacy.mjs <artifact-directory> [production-url]');
}

await verifyArtifact(artifactDirectory);

if (productionUrl) {
  await verifyProduction(productionUrl);
}

console.log('Privacy verification passed.');
