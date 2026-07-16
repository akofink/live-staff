import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: "performance.spec.ts",
  timeout: 60_000,
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: `http://127.0.0.1:${port}`,
  },
  webServer: {
    command: `npm run build && vite preview --host 127.0.0.1 --port ${port}`,
    env: { VITE_BASE_PATH: "/" },
    port,
    reuseExistingServer: false,
  },
});
