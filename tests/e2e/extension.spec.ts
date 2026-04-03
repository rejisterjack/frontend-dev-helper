import { expect, test } from './fixtures';
import { getChromeExtensionId } from './extension-helpers';

/**
 * E2E tests for FrontendDevHelper extension
 *
 * Requires a built extension and `FDH_EXTENSION_PATH` (see `playwright.config.ts`).
 */

test.describe('Extension Popup', () => {
  test.beforeAll(() => {
    test.skip(
      !process.env.FDH_EXTENSION_PATH?.trim(),
      'Set FDH_EXTENSION_PATH to the unpacked extension directory (e.g. dist/)'
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('domcontentloaded');
  });

  test('popup loads successfully', async ({ page }) => {
    const id = await getChromeExtensionId(page.context());
    await page.goto(`chrome-extension://${id}/index.html`);
    await expect(page.locator('text=FrontendDevHelper')).toBeVisible();
  });

  test('all tools are listed in popup', async ({ page }) => {
    const id = await getChromeExtensionId(page.context());
    await page.goto(`chrome-extension://${id}/index.html`);
    
    // Check that all tools are present
    const tools = [
      'DOM Outliner',
      'Spacing Visualizer',
      'Font Inspector',
      'Color Picker',
      'Pixel Ruler',
      'Breakpoint Overlay',
      'CSS Inspector',
      'Contrast Checker',
      'Flex/Grid Visualizer',
      'Z-Index Visualizer',
      'Tech Detector',
    ];
    
    for (const tool of tools) {
      await expect(page.locator(`text=${tool}`)).toBeVisible();
    }
  });

  test('tool toggle switches work', async ({ page }) => {
    const id = await getChromeExtensionId(page.context());
    await page.goto(`chrome-extension://${id}/index.html`);
    
    // Find the first tool card and click its toggle
    const firstToggle = page.locator('[role="switch"]').first();
    await firstToggle.click();
    
    // Verify the toggle state changed
    await expect(firstToggle).toHaveAttribute('aria-checked', 'true');
    
    // Toggle back
    await firstToggle.click();
    await expect(firstToggle).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Content Script Tools', () => {
  test.beforeAll(() => {
    test.skip(
      !process.env.FDH_EXTENSION_PATH?.trim(),
      'Set FDH_EXTENSION_PATH to the unpacked extension directory (e.g. dist/)'
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('domcontentloaded');
  });

  test('DOM Outliner injects outline styles', async ({ page }) => {
    await page.evaluate(async () => {
      await chrome.runtime.sendMessage({ type: 'PESTICIDE_ENABLE' });
    });
    await page.waitForTimeout(400);
    const hasOutlineStyles = await page.evaluate(() => document.getElementById('pesticide-outlines') !== null);
    expect(hasOutlineStyles).toBe(true);
  });
});
