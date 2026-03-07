import { defineConfig, devices } from "@playwright/test";
import { getPlaywrightBaseUrl, getPlaywrightDevServerCommand } from "./lib/testing/playwright";

const baseURL = getPlaywrightBaseUrl();
const shouldManageWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== "1";

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
  webServer: shouldManageWebServer
    ? {
        command: getPlaywrightDevServerCommand(),
        env: {
          ...process.env,
          PLAYWRIGHT_TEST: "1",
        },
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      }
    : undefined,
});



