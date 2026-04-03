import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test as base, chromium, expect } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';

const extensionDist = process.env.FDH_EXTENSION_PATH?.trim();
const extensionAbs = extensionDist ? path.resolve(extensionDist) : '';

/**
 * MV3 extensions need `chromium.launchPersistentContext` with `--load-extension`.
 * Use an isolated user data dir per worker so parallel runs do not clobber the same profile.
 */
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({ browser }, use) => {
    const browserName = browser.browserType().name();

    if (browserName === 'chromium' && extensionAbs) {
      const userDataDir = path.join(os.tmpdir(), 'fdh-pw-ext', randomUUID());
      fs.mkdirSync(userDataDir, { recursive: true });
      const context = await chromium.launchPersistentContext(userDataDir, {
        // MV3 extensions require headed Chromium; on Linux CI run `xvfb-run -a pnpm run test:e2e`.
        headless: process.env.FDH_EXTENSION_E2E_HEADLESS === '1',
        args: [
          `--disable-extensions-except=${extensionAbs}`,
          `--load-extension=${extensionAbs}`,
        ],
      });
      await use(context);
      await context.close();
      return;
    }

    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
});

export { expect };
