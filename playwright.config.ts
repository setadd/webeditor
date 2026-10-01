import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.EDITOR_TEST_PORT || 5174);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  timeout: 30000,
  expect: { timeout: 5000 },
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    channel: process.env.PLAYWRIGHT_CHANNEL || "msedge",
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
