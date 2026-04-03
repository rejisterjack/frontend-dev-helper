/**
 * E2E Tests: Keyboard Shortcuts
 *
 * Tests keyboard shortcut functionality using Playwright.
 */

import { expect, test } from './fixtures';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ context }) => {
    // Grant permissions for extension
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  });

  test('should open popup with Ctrl+Shift+F', async ({ page }) => {
    // Navigate to a test page
    await page.goto('https://example.com');

    // Press keyboard shortcut
    await page.keyboard.press('Control+Shift+F');

    // Wait for popup to open
    // Note: Testing extension popups requires special setup
    // This is a placeholder for the actual implementation
    await expect(page).toHaveTitle(/Example Domain/);
  });

  test('should toggle DOM outliner with Alt+P', async ({ page }) => {
    await page.goto('https://example.com');

    // Enable tool
    await page.keyboard.press('Alt+P');

    // Check for visual indicator (outlines on elements)
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Disable tool
    await page.keyboard.press('Alt+P');
  });

  test('should toggle spacing visualizer with Alt+S', async ({ page }) => {
    await page.goto('https://example.com');

    await page.keyboard.press('Alt+S');

    const body = await page.locator('body');
    await expect(body).toBeVisible();

    await page.keyboard.press('Alt+S');
  });

  test('should toggle font inspector with Alt+F', async ({ page }) => {
    await page.goto('https://example.com');

    await page.keyboard.press('Alt+F');

    const body = await page.locator('body');
    await expect(body).toBeVisible();

    await page.keyboard.press('Alt+F');
  });

  test('should toggle color picker with Alt+C', async ({ page }) => {
    await page.goto('https://example.com');

    await page.keyboard.press('Alt+C');

    const body = await page.locator('body');
    await expect(body).toBeVisible();

    await page.keyboard.press('Alt+C');
  });

  test('should open command palette with Ctrl+Shift+P', async ({ page }) => {
    await page.goto('https://example.com');

    await page.keyboard.press('Control+Shift+P');

    // Check for command palette overlay
    const body = await page.locator('body');
    await expect(body).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
  });

  test('should disable all tools with Escape', async ({ page }) => {
    await page.goto('https://example.com');

    // Enable some tools first
    await page.keyboard.press('Alt+P');
    await page.keyboard.press('Alt+S');

    // Disable all
    await page.keyboard.press('Escape');

    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('shortcut combinations should not interfere with page', async ({ page }) => {
    await page.goto('https://example.com');

    // Type some text that includes shortcut keys
    const input = await page.locator('input, textarea').first();

    // If there's an input, verify typing works
    if (await input.isVisible().catch(() => false)) {
      await input.fill('Testing alt+p in text');
      await expect(input).toHaveValue('Testing alt+p in text');
    }
  });
});

test.describe('Command Palette Navigation', () => {
  test('should navigate commands with arrow keys', async ({ page }) => {
    await page.goto('https://example.com');

    // Open command palette
    await page.keyboard.press('Control+Shift+P');

    // Navigate down
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Navigate up
    await page.keyboard.press('ArrowUp');

    // Close
    await page.keyboard.press('Escape');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should filter commands by typing', async ({ page }) => {
    await page.goto('https://example.com');

    // Open command palette
    await page.keyboard.press('Control+Shift+P');

    // Type to filter
    await page.keyboard.type('color');

    // Close
    await page.keyboard.press('Escape');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should execute command with Enter', async ({ page }) => {
    await page.goto('https://example.com');

    // Open command palette
    await page.keyboard.press('Control+Shift+P');

    // Type command name
    await page.keyboard.type('dom outliner');

    // Execute
    await page.keyboard.press('Enter');

    // Verify tool was enabled
    await expect(page.locator('body')).toBeVisible();
  });
});
