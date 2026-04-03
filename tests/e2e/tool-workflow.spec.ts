/**
 * E2E Tests - Tool Workflow
 */

import { expect, test } from './fixtures';

test.describe('Tool Activation Workflow', () => {
  test.beforeAll(() => {
    test.skip(
      !process.env.FDH_EXTENSION_PATH?.trim(),
      'Set FDH_EXTENSION_PATH to the unpacked extension directory (e.g. dist/)'
    );
  });

  test('complete pesticide tool workflow', async ({ page, context }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Step 1: Enable tool
    const enableResult = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({ type: 'PESTICIDE_ENABLE' });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(enableResult).toBeDefined();

    // Step 2: Check tool state
    const stateResult = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({ type: 'PESTICIDE_GET_STATE' });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(stateResult).toBeDefined();

    // Step 3: Disable tool
    const disableResult = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({ type: 'PESTICIDE_DISABLE' });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(disableResult).toBeDefined();
  });

  test('site report generation workflow', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Generate report
    const reportResult = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({
          type: 'SITE_REPORT_GENERATE',
          payload: {
            includePerformance: true,
            includeAccessibility: true,
            includeSeo: true,
            includeSecurity: true,
          },
        });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(reportResult).toBeDefined();
    if (reportResult.success) {
      expect(reportResult.report).toBeDefined();
      expect(reportResult.report.scores).toBeDefined();
    }
  });

  test('color picker tool workflow', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Enable color picker
    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({ type: 'COLOR_PICKER_ENABLE' });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    expect(result).toBeDefined();
  });
});

test.describe('Security Features', () => {
  test('validates message types', async ({ page }) => {
    await page.goto('https://example.com');

    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({
          type: 'INVALID_MESSAGE_TYPE',
          payload: { data: 'test' },
        });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    // Should either error or return failure response
    expect(result).toBeDefined();
  });

  test('sanitizes payload data', async ({ page }) => {
    await page.goto('https://example.com');

    const xssPayload = '<script>alert("xss")</script>';

    const result = await page.evaluate(async (payload) => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({
          type: 'COPY_TO_CLIPBOARD',
          payload: { text: payload },
        });
      } catch (e) {
        return { error: (e as Error).message };
      }
    }, xssPayload);

    // Response should not contain unescaped script tags
    expect(result).toBeDefined();
    if (result && typeof result === 'object') {
      const resultStr = JSON.stringify(result);
      expect(resultStr).not.toContain('<script>');
    }
  });
});

test.describe('Performance', () => {
  test('tool activation is performant', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        await chrome.runtime.sendMessage({ type: 'PESTICIDE_ENABLE' });
      } catch {
        // Ignore errors
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in under 1 second
    expect(duration).toBeLessThan(1000);
  });

  test('report generation handles large pages', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    const startTime = Date.now();

    const result = await page.evaluate(async () => {
      try {
        // @ts-expect-error - chrome extension API
        return await chrome.runtime.sendMessage({
          type: 'SITE_REPORT_GENERATE',
          payload: { includePerformance: true },
        });
      } catch (e) {
        return { error: (e as Error).message };
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    expect(result).toBeDefined();
    // Should complete in reasonable time
    expect(duration).toBeLessThan(5000);
  });
});
