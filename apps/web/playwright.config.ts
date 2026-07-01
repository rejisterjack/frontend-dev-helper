import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the apps/web smoke tests.
 *
 * Scope: high-level smoke coverage only. Unit/integration tests live
 * elsewhere (planned). These tests boot the dev server, then exercise the
 * most user-visible paths: landing load, auth gate, login form, signup form,
 * 404.
 *
 * Run locally:  bun run --filter=web test:e2e
 * Run in CI:    triggered by .github/workflows/web-e2e.yml
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:7393",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Boot the Next.js dev server automatically when running locally. In CI we
  // typically point at a preview URL instead (set E2E_BASE_URL).
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:7393",
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
      },
});
