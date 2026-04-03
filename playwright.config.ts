import { defineConfig, devices } from '@playwright/test';

const extensionE2E = !!process.env.FDH_EXTENSION_PATH?.trim();

/** Specs that call `chrome.*` from a normal web page (requires `FDH_EXTENSION_PATH` + persistent context — see `tests/e2e/fixtures.ts`). */
const CHROMIUM_EXTENSION_SPECS = [
  '**/workflow-pillars.spec.ts',
  '**/new-features.spec.ts',
  '**/tool-workflow.spec.ts',
  '**/extension-load.spec.ts',
  '**/extension.spec.ts',
];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !extensionE2E,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: extensionE2E ? 1 : process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: CHROMIUM_EXTENSION_SPECS,
    },
  ],
});
