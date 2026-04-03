/**
 * Optional fixed badge: active tool names, disable-all. Updates on TOOL_STATE_CHANGED (throttled).
 */

import { MESSAGE_TYPES, TOOL_METADATA, type ToolId } from '@/constants';
import { getAllToolStates, getUiPrefs } from '@/utils/storage';
import { logger } from '@/utils/logger';

const HUD_ID = 'fdh-active-tools-hud';
let hudRoot: HTMLDivElement | null = null;
let throttleTimer: ReturnType<typeof setTimeout> | null = null;
let messageListener: ((m: { type: string }) => void) | null = null;

function buildHudHtml(activeIds: ToolId[]): string {
  if (activeIds.length === 0) {
    return `<div style="font-size:11px;opacity:.75">No tools active</div>`;
  }
  const labels = activeIds.map((id) => TOOL_METADATA[id]?.name ?? id).join(' · ');
  return `
    <div style="font-weight:600;font-size:11px;margin-bottom:4px;color:#e2e8f0">Active</div>
    <div style="font-size:11px;line-height:1.35;color:#cbd5e1;max-width:220px">${labels}</div>
    <button type="button" id="fdh-hud-disable" style="margin-top:8px;width:100%;padding:4px 8px;border-radius:6px;border:1px solid #475569;background:#1e293b;color:#f8fafc;font-size:11px;cursor:pointer">Disable all</button>
  `;
}

async function refreshHud(): Promise<void> {
  if (!hudRoot) return;
  const states = await getAllToolStates();
  const activeIds = (Object.entries(states) as [ToolId, { enabled?: boolean }][])
    .filter(([, s]) => s.enabled)
    .map(([id]) => id);
  hudRoot.innerHTML = buildHudHtml(activeIds);
  hudRoot.querySelector('#fdh-hud-disable')?.addEventListener('click', () => {
    void chrome.runtime
      .sendMessage({ type: MESSAGE_TYPES.DISABLE_ALL_ON_ACTIVE_TAB })
      .catch(() => {});
  });
}

function scheduleRefresh(): void {
  if (throttleTimer) clearTimeout(throttleTimer);
  throttleTimer = setTimeout(() => {
    throttleTimer = null;
    void refreshHud();
  }, 120);
}

export async function initActiveToolsHudIfEnabled(): Promise<void> {
  const prefs = await getUiPrefs();
  if (!prefs.showActiveToolsHud) return;
  if (document.getElementById(HUD_ID)) return;

  hudRoot = document.createElement('div');
  hudRoot.id = HUD_ID;
  hudRoot.style.cssText = `
    position: fixed;
    right: 12px;
    bottom: 12px;
    z-index: 2147483646;
    max-width: 240px;
    padding: 10px 12px;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(148, 163, 184, 0.35);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    font-family: system-ui, sans-serif;
    pointer-events: auto;
  `;
  document.body.appendChild(hudRoot);
  await refreshHud();

  messageListener = (message: { type: string }) => {
    if (message.type === MESSAGE_TYPES.TOOL_STATE_CHANGED) {
      scheduleRefresh();
    }
  };
  chrome.runtime.onMessage.addListener(messageListener);
  logger.log('[FDH] Active tools HUD on');
}

export function teardownActiveToolsHud(): void {
  if (messageListener) {
    chrome.runtime.onMessage.removeListener(messageListener);
    messageListener = null;
  }
  hudRoot?.remove();
  hudRoot = null;
}
