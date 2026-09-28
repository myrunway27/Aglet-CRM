import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Mock providers: no credentials or network needed. Run `npm run build` first.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    env: { CATALOG_PROVIDER: "mock", OCR_PROVIDER: "mock", OFFERS_PROVIDER: "mock", FX_PROVIDER: "mock", CRON_SECRET: "e2e-cron-secret", AUTH_LIMIT_PER_MINUTE: "100", SCAN_LIMIT_PER_MINUTE: "100" },
    timeout: 60_000,
  },
});
