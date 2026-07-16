import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "fixture-evaluation.spec.ts",
  timeout: 60_000,
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://127.0.0.1:4173",
  },
  webServer: {
    command: "vite --host 127.0.0.1 --port 4173",
    env: { VITE_BASE_PATH: "/" },
    port: 4173,
    reuseExistingServer: false,
  },
});
