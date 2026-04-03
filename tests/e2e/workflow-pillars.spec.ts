/**
 * End-to-end smoke tests for core workflow pillars (layout, a11y, performance, responsive, capture).
 * Requires the extension to be loaded in the Playwright Chromium context (same as other e2e specs).
 */

import { expect, test } from './fixtures';

test.describe('Workflow pillars', () => {
  test.beforeAll(() => {
    test.skip(
      !process.env.FDH_EXTENSION_PATH?.trim(),
      'Set FDH_EXTENSION_PATH to the unpacked extension directory (e.g. dist/)'
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
  });

  test('layout: flex/grid visualizer injects layout styles', async ({ page }) => {
    await page.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'LAYOUT_VISUALIZER_ENABLE' });
    });
    await page.waitForTimeout(400);
    const hasStyles = await page.evaluate(() => !!document.getElementById('fdh-layout-styles'));
    expect(hasStyles).toBe(true);
  });

  test('accessibility: audit panel can be enabled', async ({ page }) => {
    await page.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'ACCESSIBILITY_AUDIT_ENABLE' });
    });
    await page.waitForTimeout(400);
    const panel = await page.locator('.fdh-accessibility-panel').isVisible().catch(() => false);
    expect(panel).toBe(true);
  });

  test('performance: network analyzer panel mounts', async ({ page }) => {
    await page.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'NETWORK_ANALYZER_ENABLE' });
    });
    await page.waitForTimeout(400);
    const mounted = await page.evaluate(() => !!document.getElementById('fdh-network-analyzer'));
    expect(mounted).toBe(true);
  });

  test('responsive: breakpoint overlay appears', async ({ page }) => {
    await page.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'BREAKPOINT_OVERLAY_ENABLE' });
    });
    await page.waitForTimeout(400);
    const overlay = await page.evaluate(() => !!document.getElementById('fdh-breakpoint-overlay'));
    expect(overlay).toBe(true);
  });

  test('capture: screenshot studio container can mount', async ({ page }) => {
    await page.evaluate(() => {
      chrome.runtime.sendMessage({ type: 'SCREENSHOT_STUDIO_ENABLE' });
    });
    await page.waitForTimeout(600);
    const studio = await page
      .locator('.fdh-screenshot-studio-container')
      .isVisible()
      .catch(() => false);
    expect(studio).toBe(true);
  });
});
