/**
 * Single entry for enabling/disabling tools on a tab: storage, exclusivity, content ENABLE/DISABLE.
 * Used by popup, command palette (via background), keyboard shortcuts, and TOGGLE_TOOL.
 */

import type { ToolId } from '@/constants';
import { getToolMessageType } from '@/constants/tool-messages';
import { getExclusivePeers } from '@/constants/overlay-exclusions';
import { getToolState, setToolState } from '@/utils/storage';
import { logger } from '@/utils/logger';

export async function applyToolEnabledInTab(
  tabId: number,
  toolId: ToolId,
  enabled: boolean
): Promise<void> {
  if (enabled) {
    for (const peer of getExclusivePeers(toolId)) {
      const st = await getToolState(peer);
      if (st?.enabled) {
        try {
          await setToolState(peer, { enabled: false, settings: st.settings ?? {} });
          const dm = getToolMessageType(peer, 'DISABLE');
          if (dm) {
            try {
              await chrome.tabs.sendMessage(tabId, { type: dm });
            } catch (err) {
              logger.error('[tool-toggle] Failed to disable exclusive peer on tab', peer, err);
            }
          }
        } catch (err) {
          logger.error('[tool-toggle] Failed to turn off exclusive peer', peer, err);
        }
      }
    }
  }

  const cur = await getToolState(toolId);
  await setToolState(toolId, {
    enabled,
    settings: cur?.settings ?? {},
  });

  const messageType = getToolMessageType(toolId, enabled ? 'ENABLE' : 'DISABLE');
  if (messageType) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: messageType });
    } catch (err) {
      logger.error('[tool-toggle] Failed to send tool message:', err);
    }
  }
}

export async function toggleToolInTab(tabId: number, toolId: ToolId): Promise<boolean> {
  const cur = await getToolState(toolId);
  const next = !(cur?.enabled ?? false);
  await applyToolEnabledInTab(tabId, toolId, next);
  return next;
}
