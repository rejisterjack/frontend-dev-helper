/**
 * usePresets — Preset management hook
 *
 * Manages built-in presets, user presets, and their
 * apply / save / delete operations. Loads initial user
 * presets on mount.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ToolId } from '../../constants';
import type { ToolsState } from '../../types';
import { applyBuiltinPreset, applyUserPreset } from '../../utils/apply-preset';
import { logger } from '../../utils/logger';
import type { UserToolPreset } from '../../utils/storage';
import {
  addUserToolPreset,
  getAllToolStates,
  getUserToolPresets,
  removeUserToolPreset,
} from '../../utils/storage';

interface UsePresetsOptions {
  toolsState: ToolsState;
  setToolsState: React.Dispatch<React.SetStateAction<ToolsState>>;
}

export interface UsePresetsReturn {
  userPresets: UserToolPreset[];
  handleApplyPreset: (presetId: string) => Promise<void>;
  handleApplyUserPreset: (presetId: string) => Promise<void>;
  handleSaveUserPreset: () => Promise<void>;
  handleDeleteUserPreset: (id: string) => Promise<void>;
}

export function usePresets({ toolsState, setToolsState }: UsePresetsOptions): UsePresetsReturn {
  const [userPresets, setUserPresets] = useState<UserToolPreset[]>([]);

  // Load initial user presets on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const presets = await getUserToolPresets();
        if (!cancelled) setUserPresets(presets);
      } catch (err) {
        logger.error('Failed to load user presets:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyPreset = useCallback(async (presetId: string) => {
    const ok = await applyBuiltinPreset(presetId);
    if (ok) {
      const all = await getAllToolStates();
      setToolsState(all);
    }
  }, [setToolsState]);

  const handleApplyUserPreset = useCallback(async (presetId: string) => {
    const ok = await applyUserPreset(presetId);
    if (ok) {
      const all = await getAllToolStates();
      setToolsState(all);
    }
  }, [setToolsState]);

  const handleSaveUserPreset = useCallback(async () => {
    const name = window.prompt('Name this preset');
    if (!name?.trim()) return;
    const toolIds = (Object.entries(toolsState) as [ToolId, { enabled?: boolean }][])
      .filter(([, s]) => s.enabled)
      .map(([id]) => id);
    if (toolIds.length === 0) {
      window.alert('Enable at least one tool first.');
      return;
    }
    const created = await addUserToolPreset(name.trim(), toolIds);
    if (created) {
      setUserPresets(await getUserToolPresets());
    }
  }, [toolsState]);

  const handleDeleteUserPreset = useCallback(async (id: string) => {
    await removeUserToolPreset(id);
    setUserPresets(await getUserToolPresets());
  }, []);

  return {
    userPresets,
    handleApplyPreset,
    handleApplyUserPreset,
    handleSaveUserPreset,
    handleDeleteUserPreset,
  };
}
