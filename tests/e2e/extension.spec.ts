import { test, expect } from '@playwright/test';

/**
 * E2E tests for FrontendDevHelper extension
 * 
 * Note: These tests require the extension to be built first.
 * Run `npm run build` before running these tests.
 */

test.describe('Extension Popup', () => {
  test('popup loads successfully', async ({ page }) => {
    // Load the popup HTML directly
    await page.goto(`file://${process.cwd()}/dist/index.html`);
    
    // Check that the popup title is visible
    await expect(page.locator('text=FrontendDevHelper')).toBeVisible();
  });

  test('all tools are listed in popup', async ({ page }) => {
    await page.goto(`file://${process.cwd()}/dist/index.html`);
    
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
    await page.goto(`file://${process.cwd()}/dist/index.html`);
    
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
  test.beforeEach(async ({ page }) => {
    // Load a test page
    await page.goto('https://example.com');
  });

  test('DOM Outliner injects outline styles', async ({ page }) => {
    // Simulate enabling the DOM Outliner
    await page.evaluate(() => {
      // @ts-ignore
      if (window.pesticide) {
        // @ts-ignore
        window.pesticide.enable();
      }
    });
    
    // Check if outline styles are injected
    const hasOutlineStyles = await page.evaluate(() => {
      const style = document.getElementById('pesticide-style');
      return style !== null;
    });
    
    expect(hasOutlineStyles).toBeTruthy();
  });
});
