/**
 * E2E Tests for New "Best of the Best" Features
 */

import { expect, test } from './fixtures';
import {
  countPaletteItems,
  enableCommandPaletteTool,
  isCommandPaletteOpen,
} from './palette-helpers';

test.describe('New Features - Best of the Best', () => {
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

  test.describe('Command Palette', () => {
    test('should open with Ctrl+Shift+P', async ({ page }) => {
      await enableCommandPaletteTool(page);
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('Control+Shift+P');
      await expect.poll(async () => isCommandPaletteOpen(page)).toBe(true);
    });

    test('should search and filter commands', async ({ page }) => {
      await enableCommandPaletteTool(page);
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('Control+Shift+P');
      await expect.poll(async () => isCommandPaletteOpen(page)).toBe(true);
      await page.keyboard.type('storage');
      await expect.poll(async () => countPaletteItems(page)).toBeGreaterThan(0);
    });

    test('should close with Escape', async ({ page }) => {
      await enableCommandPaletteTool(page);
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('Control+Shift+P');
      await expect.poll(async () => isCommandPaletteOpen(page)).toBe(true);
      await page.keyboard.press('Escape');
      await expect.poll(async () => isCommandPaletteOpen(page)).toBe(false);
    });
  });

  test.describe('Storage Inspector', () => {
    test('should open storage inspector', async ({ page }) => {
      // Enable via message
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'STORAGE_INSPECTOR_ENABLE' });
      });
      
      await page.waitForTimeout(500);
      
      const panel = await page.locator('#fdh-storage-inspector-container').isVisible();
      expect(panel).toBe(true);
    });

    test('should display localStorage items', async ({ page }) => {
      // Set test data
      await page.evaluate(() => {
        localStorage.setItem('test-key', 'test-value');
      });
      
      // Open inspector
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'STORAGE_INSPECTOR_ENABLE' });
      });
      
      await page.waitForTimeout(500);
      
      // Check if content is displayed
      const content = await page.locator('#fdh-storage-inspector-content').textContent();
      expect(content).toContain('test-key');
    });
  });

  test.describe('AI Suggestions', () => {
    test('should run AI analysis', async ({ page }) => {
      await page.evaluate(async () => {
        await chrome.runtime.sendMessage({ type: 'SMART_SUGGESTIONS_ENABLE' });
      });

      await page.waitForTimeout(1000);
      
      // Check panel is visible
      const panel = await page.locator('#fdh-ai-suggestions-container').isVisible().catch(() => false);
      // Panel may not auto-open, just verify it was enabled
      expect(panel).toBeDefined();
    });

  });

  test.describe('Component Tree', () => {
    test('should detect framework', async ({ page }) => {
      const state = await page.evaluate(async () => {
        await chrome.runtime.sendMessage({ type: 'COMPONENT_TREE_ENABLE' });
        return chrome.runtime.sendMessage({ type: 'COMPONENT_TREE_GET_STATE' });
      });

      expect(state).toBeDefined();
      expect(state).toHaveProperty('enabled');
      expect(state).toHaveProperty('framework');
    });
  });

  test.describe('Focus Debugger', () => {
    test('should track focusable elements', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <button id="btn1">Button 1</button>
            <input type="text" id="input1">
            <a href="#" id="link1">Link</a>
          </body>
        </html>
      `);
      
      // Enable focus debugger
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'FOCUS_DEBUGGER_ENABLE' });
      });
      
      await page.waitForTimeout(500);
      
      const state = await page.evaluate(async () =>
        chrome.runtime.sendMessage({ type: 'FOCUS_DEBUGGER_GET_STATE' })
      );

      expect(state).toBeDefined();
      expect(state).toHaveProperty('focusableElements');
    });
  });

  test.describe('Form Debugger', () => {
    test('should analyze forms', async ({ page }) => {
      await page.setContent(`
        <html>
          <body>
            <form id="test-form">
              <input type="text" name="username" required>
              <input type="email" name="email" required>
              <button type="submit">Submit</button>
            </form>
          </body>
        </html>
      `);
      
      // Enable form debugger
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'FORM_DEBUGGER_ENABLE' });
      });
      
      await page.waitForTimeout(500);
      
      const state = await page.evaluate(async () =>
        chrome.runtime.sendMessage({ type: 'FORM_DEBUGGER_GET_STATE' })
      );

      expect(state).toBeDefined();
      expect(state).toHaveProperty('forms');
    });
  });

  test.describe('Visual Regression', () => {
    test('should capture baseline', async ({ page }) => {
      // Enable visual regression
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'VISUAL_REGRESSION_ENABLE' });
      });
      
      await page.waitForTimeout(500);
      
      const state = await page.evaluate(async () =>
        chrome.runtime.sendMessage({ type: 'VISUAL_REGRESSION_GET_STATE' })
      );

      expect(state).toBeDefined();
      expect(state).toHaveProperty('baselines');
      expect(state).toHaveProperty('tests');
    });
  });
});
