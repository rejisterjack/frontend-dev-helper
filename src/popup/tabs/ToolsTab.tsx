/**
 * ToolsTab — The tools tab content
 *
 * Composes SearchBar, PresetBar, ToolGrid and
 * the recommended-tools / advanced-toggle sections.
 * Self-manages keyboard navigation through search results.
 */

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolId } from '../../constants';
import { TOOL_METADATA } from '../../constants';
import type { ToolsState } from '../../types';
import type { UserToolPreset } from '../../utils/storage';
import { setUiPrefs } from '../../utils/storage';
import { PresetBar } from '../components/PresetBar';
import { SearchBar } from '../components/SearchBar';
import { ToolGrid, filterCategories } from '../components/ToolGrid';

interface ToolsTabProps {
  toolsState: ToolsState;
  showAdvancedTools: boolean;
  setShowAdvancedTools: React.Dispatch<React.SetStateAction<boolean>>;
  recommendedIds: ToolId[];
  userPresets: UserToolPreset[];
  onToggleTool: (toolId: ToolId, enabled: boolean) => void;
  onApplyPreset: (presetId: string) => void;
  onApplyUserPreset: (presetId: string) => void;
  onSaveUserPreset: () => void;
  onDeleteUserPreset: (id: string) => void;
  onOpenSettings: (toolId: ToolId) => void;
  onOpenPanel: (toolId: ToolId) => void;
}

export const ToolsTab: React.FC<ToolsTabProps> = ({
  toolsState,
  showAdvancedTools,
  setShowAdvancedTools,
  recommendedIds,
  userPresets,
  onToggleTool,
  onApplyPreset,
  onApplyUserPreset,
  onSaveUserPreset,
  onDeleteUserPreset,
  onOpenSettings,
  onOpenPanel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedSearchIndex, setFocusedSearchIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toolCardRefs = useRef<Map<ToolId, HTMLDivElement>>(new Map());

  // Reset focused search index when search query or advanced toggle change
  useEffect(() => {
    setFocusedSearchIndex(-1);
  }, [searchQuery, showAdvancedTools]);

  /**
   * Compute flat list of visible tool IDs for keyboard navigation
   */
  const flatToolIds = useMemo(() => {
    const filtered = filterCategories(searchQuery, showAdvancedTools);
    const ids: ToolId[] = [];
    for (const category of filtered) {
      for (const toolId of category.tools) {
        ids.push(toolId);
      }
    }
    return ids;
  }, [searchQuery, showAdvancedTools]);

  /**
   * Handle arrow key navigation in search input
   */
  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (flatToolIds.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedSearchIndex((prev) => {
          const next = Math.min(prev + 1, flatToolIds.length - 1);
          const toolId = flatToolIds[next];
          toolCardRefs.current.get(toolId)?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedSearchIndex((prev) => {
          if (prev <= 0) {
            searchInputRef.current?.focus();
            return -1;
          }
          const next = prev - 1;
          const toolId = flatToolIds[next];
          toolCardRefs.current.get(toolId)?.focus();
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const toolId = flatToolIds[focusedSearchIndex];
        if (toolId) {
          const state = toolsState[toolId];
          onToggleTool(toolId, !state?.enabled);
        }
      }
    },
    [flatToolIds, focusedSearchIndex, toolsState, onToggleTool]
  );

  /**
   * Tool card ref callback for keyboard navigation
   */
  const toolCardRefCallback = useCallback(
    (toolId: ToolId) => (el: HTMLDivElement | null) => {
      if (el) {
        toolCardRefs.current.set(toolId, el);
      } else {
        toolCardRefs.current.delete(toolId);
      }
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleResetFocus = useCallback(() => {
    setFocusedSearchIndex(-1);
  }, []);

  return (
    <div className="box-border h-full min-h-0 w-full min-w-0 max-w-full space-y-3 overflow-x-hidden overflow-y-auto p-3">
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        flatToolIds={flatToolIds}
        focusedSearchIndex={focusedSearchIndex}
        onKeyDown={handleSearchKeyDown}
        toolCardRefs={toolCardRefs}
        onResetFocus={handleResetFocus}
      />

      {/* Advanced Toggle */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAdvancedTools}
            onChange={(e) => {
              const next = e.target.checked;
              setShowAdvancedTools(next);
              void setUiPrefs({ showAdvancedTools: next });
            }}
            className="rounded border-slate-700 bg-[#111827] text-primary-500 focus:ring-primary-500 transition-colors"
          />
          Show all tools
        </label>
        <span className="text-[10px] text-slate-500">
          Starter set when off · search always finds everything
        </span>
      </div>

      {/* Recommended tools for this page */}
      {recommendedIds.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
            Suggested for this page
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendedIds.map((id) => {
              const meta = TOOL_METADATA[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => void onToggleTool(id, true)}
                  className="text-[11px] px-2 py-1 rounded-md bg-[#111827] border border-slate-700 text-slate-300 hover:border-primary-500/50 hover:text-white transition-colors"
                >
                  {meta.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Presets */}
      <PresetBar
        userPresets={userPresets}
        onApplyPreset={onApplyPreset}
        onApplyUserPreset={onApplyUserPreset}
        onSaveUserPreset={onSaveUserPreset}
        onDeleteUserPreset={onDeleteUserPreset}
      />

      {/* Tool Grid */}
      <ToolGrid
        toolsState={toolsState}
        searchQuery={searchQuery}
        showAdvancedTools={showAdvancedTools}
        onToggleTool={onToggleTool}
        onOpenSettings={onOpenSettings}
        onOpenPanel={onOpenPanel}
        flatToolIds={flatToolIds}
        focusedSearchIndex={focusedSearchIndex}
        toolCardRefCallback={toolCardRefCallback}
        onClearSearch={handleClearSearch}
      />

      {/* Pro Tips Section */}
      <div className="mt-4 p-3 bg-[#111827]/30 rounded-lg border border-slate-700/50">
        <h4 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
          <span>💡</span>
          Pro Tip
        </h4>
        <p className="text-[11px] text-slate-400">
          Use{' '}
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl+Shift+F</kbd>{' '}
          to open the popup,{' '}
          <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">/</kbd> to search
          tools.
        </p>
      </div>
    </div>
  );
};

export default ToolsTab;
