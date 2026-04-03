/**
 * Apply a built-in tool preset: disable everything, then enable the preset's tools.
 * Works from popup, content (command palette), or background contexts with extension permissions.
 */

import type { ToolId } from '@/constants';
import { getToolMessageType } from '@/constants/tool-messages';
import { BUILTIN_TOOL_PRESETS } from '@/utils/tool-catalog';
import { logger } from '@/utils/logger';
import {
  clearAllStates,
  getAllToolStates,
  getUserToolPresets,
  setToolState,
} from '@/utils/storage';

/**
 * Disable all tools in storage, then enable exactly `toolIds` on the active tab.
 */
export async function applyToolIdsPreset(toolIds: ToolId[]): Promise<boolean> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'DISABLE_ALL_TOOLS' });
    } catch {
      // Tab may not have a content script yet
    }

    await clearAllStates();
    const base = await getAllToolStates();

    for (const toolId of Object.keys(base) as ToolId[]) {
      await setToolState(toolId, {
        enabled: false,
        settings: base[toolId]?.settings ?? {},
      });
    }

    for (const toolId of toolIds) {
      await setToolState(toolId, {
        enabled: true,
        settings: base[toolId]?.settings ?? {},
      });
      const msg = getToolMessageType(toolId, 'ENABLE');
      if (msg) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: msg });
        } catch (e) {
          logger.warn(`[apply-preset] ENABLE failed for ${toolId}:`, e);
        }
      }
    }

    return true;
  } catch (error) {
    logger.error('[apply-preset] Failed:', error);
    return false;
  }
}

export async function applyBuiltinPreset(presetId: string): Promise<boolean> {
  const preset = BUILTIN_TOOL_PRESETS.find((p) => p.id === presetId);
  if (!preset) return false;
  return applyToolIdsPreset(preset.toolIds);
}

export async function applyUserPreset(presetId: string): Promise<boolean> {
  const presets = await getUserToolPresets();
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return false;
  return applyToolIdsPreset(preset.toolIds);
}
