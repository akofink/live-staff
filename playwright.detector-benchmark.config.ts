import { defineConfig } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4175);
export default defineConfig({ testDir: "./tests/browser", testMatch: "detector-benchmark.spec.ts", timeout: 120_000,
  outputDir: "test-results/playwright-detector-benchmark",
  use: { browserName: "chromium", headless: true, baseURL: `http://127.0.0.1:${port}` },
  webServer: { command: `vite --host 127.0.0.1 --port ${port}`, env: { VITE_BASE_PATH: "/" }, port, reuseExistingServer: false } });
