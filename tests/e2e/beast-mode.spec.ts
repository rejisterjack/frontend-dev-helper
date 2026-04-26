/**
 * E2E: Beast Mode tools (Container Query, View Transitions, Scroll Animations).
 * Requires built extension: FDH_EXTENSION_PATH=dist/ pnpm test:e2e
 */

import { expect, test } from './fixtures';

test.describe('Beast Mode tools', () => {
  test.beforeAll(() => {
    test.skip(
      !process.env.FDH_EXTENSION_PATH?.trim(),
      'Set FDH_EXTENSION_PATH to the unpacked extension directory (e.g. dist/)'
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
  });

  test('Container Query Inspector enables and returns state', async ({ page }) => {
    const res = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'CONTAINER_QUERY_INSPECTOR_ENABLE' }, resolve);
        })
    );
    expect(res).toMatchObject({ success: true, active: true });

    const state = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'CONTAINER_QUERY_INSPECTOR_GET_STATE' }, resolve);
        })
    );
    expect(state).toMatchObject({ success: true });
    expect((state as { state?: { enabled?: boolean } }).state).toMatchObject({ enabled: true });
  });

  test('View Transitions Debugger returns state', async ({ page }) => {
    const res = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'VIEW_TRANSITIONS_DEBUGGER_ENABLE' }, resolve);
        })
    );
    expect(res).toMatchObject({ success: true, active: true });

    const state = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'VIEW_TRANSITIONS_DEBUGGER_GET_STATE' }, resolve);
        })
    );
    expect(state).toMatchObject({ success: true });
    expect((state as { state?: { supported?: boolean } }).state).toBeDefined();
  });

  test('Scroll Animations Debugger returns summary', async ({ page }) => {
    const res = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'SCROLL_ANIMATIONS_DEBUGGER_ENABLE' }, resolve);
        })
    );
    expect(res).toMatchObject({ success: true, active: true });

    const summary = await page.evaluate(
      () =>
        new Promise<Record<string, unknown>>((resolve) => {
          chrome.runtime.sendMessage({ type: 'SCROLL_ANIMATIONS_DEBUGGER_GET_SUMMARY' }, resolve);
        })
    );
    expect(summary).toMatchObject({ success: true });
    expect((summary as { summary?: unknown }).summary).toBeDefined();
  });
});
