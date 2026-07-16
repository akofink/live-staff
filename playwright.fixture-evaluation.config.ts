import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "fixture-evaluation.spec.ts",
  timeout: 60_000,
  use: {
    browserName: "chromium",
    headless: true,
  },
  webServer: {
    command: "vite --host 127.0.0.1 --port 4173",
    port: 4173,
    reuseExistingServer: false,
  },
});
