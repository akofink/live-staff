import { chromium } from '@playwright/test';

const [url] = process.argv.slice(2);

if (!url) {
  throw new Error('Usage: node scripts/verify-production-privacy.mjs <production-url>');
}

const blockedRequestPattern = /(?:static\.cloudflareinsights\.com|\/cdn-cgi\/rum(?:\?|$)|google-analytics|googletagmanager|plausible\.io|segment\.com|sentry\.io|hotjar\.com|clarity\.ms)/i;
const failedResourceTypes = new Set(['document', 'script', 'stylesheet']);
const failures = [];
const browser = await chromium.launch();
const page = await browser.newPage();

page.on('request', (request) => {
  if (blockedRequestPattern.test(request.url())) {
    failures.push(`Telemetry request: ${request.method()} ${request.url()}`);
  }
});

page.on('response', (response) => {
  if (response.status() >= 400 && failedResourceTypes.has(response.request().resourceType())) {
    failures.push(`Failed ${response.request().resourceType()} response: ${response.status()} ${response.url()}`);
  }
});

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForTimeout(3_000);

  const scripts = await page.locator('script[src]').evaluateAll((elements) =>
    elements.map((element) => element.src),
  );

  for (const script of scripts) {
    if (blockedRequestPattern.test(script)) {
      failures.push(`Telemetry script: ${script}`);
    }
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  throw new Error(`Production privacy verification failed:\n${failures.join('\n')}`);
}

console.log('Browser production privacy verification passed.');
