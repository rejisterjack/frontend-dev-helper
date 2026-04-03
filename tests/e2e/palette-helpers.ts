import type { Page } from '@playwright/test';

/** Enables the in-page command palette listener (required before Ctrl/Cmd+Shift+P works). */
export async function enableCommandPaletteTool(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await chrome.runtime.sendMessage({ type: 'COMMAND_PALETTE_ENABLE' });
  });
}

export async function isCommandPaletteOpen(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const host = document.getElementById('fdh-command-palette-container');
    if (!host?.shadowRoot) return false;
    return host.shadowRoot.querySelector('#fdh-command-palette-modal') !== null;
  });
}

export async function countPaletteItems(page: Page): Promise<number> {
  return page.evaluate(() => {
    const host = document.getElementById('fdh-command-palette-container');
    if (!host?.shadowRoot) return 0;
    return host.shadowRoot.querySelectorAll('.fdh-command-palette-item').length;
  });
}
