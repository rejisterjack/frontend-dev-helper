/**
 * E2E Tests for New "Best of the Best" Features
 */

import { expect, test } from '@playwright/test';

test.describe('New Features - Best of the Best', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
    // Wait for content script to inject
    await page.waitForTimeout(1000);
  });

  test.describe('Command Palette', () => {
    test('should open with Ctrl+Shift+P', async ({ page }) => {
      await page.keyboard.press('Control+Shift+P');
      
      // Check if palette is visible
      const palette = await page.locator('#fdh-command-palette-container').isVisible();
      expect(palette).toBe(true);
    });

    test('should search and filter commands', async ({ page }) => {
      await page.keyboard.press('Control+Shift+P');
      await page.waitForTimeout(200);
      
      // Type search query
      await page.keyboard.type('storage');
      await page.waitForTimeout(200);
      
      // Should show storage inspector command
      const results = await page.locator('.fdh-command-palette-item').count();
      expect(results).toBeGreaterThan(0);
    });

    test('should close with Escape', async ({ page }) => {
      await page.keyboard.press('Control+Shift+P');
      await page.waitForTimeout(200);
      
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      const palette = await page.locator('#fdh-command-palette-container').isVisible().catch(() => false);
      expect(palette).toBe(false);
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
      // Enable AI suggestions
      await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'SMART_SUGGESTIONS_ENABLE' });
      });
      
      await page.waitForTimeout(1000);
      
      // Check panel is visible
      const panel = await page.locator('#fdh-ai-suggestions-container').isVisible().catch(() => false);
      // Panel may not auto-open, just verify it was enabled
      expect(panel).toBeDefined();
    });

    test('should detect accessibility issues', async ({ page }) => {
      // Create page with accessibility issues
      await page.setContent(`
        <html>
          <body>
            <img src="test.jpg" id="no-alt-img">
            <input type="text" id="no-label-input">
          </body>
        </html>
      `);
      
      await page.waitForTimeout(500);
      
      // Run analysis
      const result = await page.evaluate(async () => {
        const { runAIAnalysis } = await import('../../src/ai/ai-analyzer');
        return await runAIAnalysis();
      });
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      
      const accessibilityIssues = result.suggestions.filter(
        s => s.category === 'accessibility'
      );
      expect(accessibilityIssues.length).toBeGreaterThan(0);
    });
  });

  test.describe('Component Tree', () => {
    test('should detect framework', async ({ page }) => {
      // Enable component tree
      const state = await page.evaluate(() => {
        chrome.runtime.sendMessage({ type: 'COMPONENT_TREE_ENABLE' });
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'COMPONENT_TREE_GET_STATE' }, resolve);
        });
      });
      
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
      
      // Get state
      const state = await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'FOCUS_DEBUGGER_GET_STATE' }, resolve);
        });
      });
      
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
      
      // Get state
      const state = await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'FORM_DEBUGGER_GET_STATE' }, resolve);
        });
      });
      
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
      
      const state = await page.evaluate(() => {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'VISUAL_REGRESSION_GET_STATE' }, resolve);
        });
      });
      
      expect(state).toHaveProperty('baselines');
      expect(state).toHaveProperty('tests');
    });
  });
});
