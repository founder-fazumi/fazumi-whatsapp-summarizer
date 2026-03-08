import { defineConfig, devices } from "@playwright/test";
import { getPlaywrightBaseUrl } from "./lib/testing/playwright";

const baseURL = getPlaywrightBaseUrl();
const useWebServer =
  !process.env.CI && process.env.PLAYWRIGHT_NO_SERVER !== "1";

export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/**/*.spec.ts", "tests/playwright/**/*.spec.ts"],
  timeout: 240_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["html", { open: "never" }], ["line"]] : "line",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-testid",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 960 },
      },
    },
  ],
  webServer: useWebServer
    ? {
        command: "pnpm dev",
        env: {
          ...process.env,
          PLAYWRIGHT_TEST: "1",
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});



