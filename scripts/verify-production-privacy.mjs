import { chromium } from "playwright";

const productionUrl = "https://live-staff.akofink.com/";
const telemetryPattern = /(?:static\.cloudflareinsights\.com|\/cdn-cgi\/rum(?:[/?]|$)|google-analytics\.com|googletagmanager\.com|plausible\.io|api\.segment\.io|browser\.sentry-cdn\.com|sentry\.io|static\.hotjar\.com|clarity\.ms)/i;
const executableResourceTypes = new Set(["script", "worker", "sharedworker"]);
const failures = [];
const productionOrigin = new URL(productionUrl).origin;
const browser = await chromium.launch();
const page = await browser.newPage();

page.on("request", (request) => {
  const requestUrl = request.url();

  if (telemetryPattern.test(requestUrl)) {
    failures.push(`Telemetry request: ${request.method()} ${requestUrl}`);
  }

  if (
    executableResourceTypes.has(request.resourceType()) &&
    new URL(requestUrl).origin !== productionOrigin
  ) {
    failures.push(`Third-party executable request: ${request.resourceType()} ${requestUrl}`);
  }
});

try {
  const response = await page.goto(productionUrl, { waitUntil: "networkidle", timeout: 30_000 });

  if (!response?.ok()) {
    throw new Error(`Production page returned ${response?.status() ?? "no response"}.`);
  }

  if (new URL(page.url()).origin !== productionOrigin) {
    throw new Error(`Production page redirected away from ${productionOrigin}: ${page.url()}`);
  }

  await page.waitForTimeout(3_000);
} finally {
  await browser.close();
}

if (failures.length > 0) {
  throw new Error(`Production privacy verification failed:\n${failures.join("\n")}`);
}

console.log(`Browser privacy verification passed for ${productionUrl}`);
