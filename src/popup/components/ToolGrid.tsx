/**
 * ToolGrid — Tool category grid with expandable sections
 *
 * Renders filtered tool categories with expand/collapse
 * toggles and individual tool cards.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ToolId } from '../../constants';
import { TOOL_IDS, TOOL_METADATA } from '../../constants';
import type { ToolMeta, ToolsState } from '../../types';
import { isStarterTool } from '../../utils/tool-catalog';
import { ColorLegend } from './ColorLegend';
import { ToolCard } from './ToolCard';

// ============================================
// Tool Categories Configuration
// ============================================

const TOOL_CATEGORIES: Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  tools: ToolId[];
}> = [
  {
    id: 'inspection',
    name: 'Inspection',
    icon: '🔍',
    color: '#3b82f6',
    tools: [
      TOOL_IDS.DOM_OUTLINER,
      TOOL_IDS.SPACING_VISUALIZER,
      TOOL_IDS.FONT_INSPECTOR,
      TOOL_IDS.TECH_DETECTOR,
      TOOL_IDS.ACCESSIBILITY_AUDIT,
      TOOL_IDS.ELEMENT_INSPECTOR,
      TOOL_IDS.SMART_ELEMENT_PICKER,
      TOOL_IDS.FRAMEWORK_DEVTOOLS,
    ],
  },
  {
    id: 'css',
    name: 'CSS & Design',
    icon: '🎨',
    color: '#ec4899',
    tools: [
      TOOL_IDS.COLOR_PICKER,
      TOOL_IDS.CONTRAST_CHECKER,
      TOOL_IDS.LAYOUT_VISUALIZER,
      TOOL_IDS.ZINDEX_VISUALIZER,
      TOOL_IDS.CSS_INSPECTOR,
      TOOL_IDS.CSS_EDITOR,
      TOOL_IDS.CSS_SCANNER,
      TOOL_IDS.CSS_VARIABLE_INSPECTOR,
      TOOL_IDS.ANIMATION_INSPECTOR,
      TOOL_IDS.GRID_OVERLAY,
      TOOL_IDS.DESIGN_SYSTEM_VALIDATOR,
      // Beast Mode: Next-Gen Features
      TOOL_IDS.CONTAINER_QUERY_INSPECTOR,
      TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER,
      TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER,
    ],
  },
  {
    id: 'responsive',
    name: 'Responsive',
    icon: '📱',
    color: '#06b6d4',
    tools: [TOOL_IDS.RESPONSIVE_BREAKPOINT, TOOL_IDS.RESPONSIVE_PREVIEW, TOOL_IDS.PIXEL_RULER],
  },
  {
    id: 'performance',
    name: 'Performance',
    icon: '⚡',
    color: '#f59e0b',
    tools: [TOOL_IDS.NETWORK_ANALYZER, TOOL_IDS.FLAME_GRAPH, TOOL_IDS.PERFORMANCE_BUDGET],
  },
  {
    id: 'ai',
    name: 'AI & Analysis',
    icon: '🤖',
    color: '#8b5cf6',
    tools: [TOOL_IDS.SMART_SUGGESTIONS, TOOL_IDS.SITE_REPORT],
  },
  {
    id: 'utility',
    name: 'Utilities',
    icon: '🛠️',
    color: '#6366f1',
    tools: [
      TOOL_IDS.COMMAND_PALETTE,
      TOOL_IDS.SESSION_RECORDER,
      TOOL_IDS.SCREENSHOT_STUDIO,
      TOOL_IDS.STORAGE_INSPECTOR,
      TOOL_IDS.COMPONENT_TREE,
      TOOL_IDS.VISUAL_REGRESSION,
      TOOL_IDS.FOCUS_DEBUGGER,
      TOOL_IDS.FORM_DEBUGGER,
      TOOL_IDS.MEASUREMENT_TOOL,
    ],
  },
];

// ============================================
// Tool Metadata with Colors
// ============================================

const TOOL_META_OVERRIDES: Record<ToolId, { color: string }> = {
  [TOOL_IDS.DOM_OUTLINER]: { color: '#f97316' },
  [TOOL_IDS.SPACING_VISUALIZER]: { color: '#8b5cf6' },
  [TOOL_IDS.FONT_INSPECTOR]: { color: '#3b82f6' },
  [TOOL_IDS.COLOR_PICKER]: { color: '#ec4899' },
  [TOOL_IDS.PIXEL_RULER]: { color: '#f59e0b' },
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: { color: '#06b6d4' },
  [TOOL_IDS.CSS_INSPECTOR]: { color: '#10b981' },
  [TOOL_IDS.CONTRAST_CHECKER]: { color: '#84cc16' },
  [TOOL_IDS.LAYOUT_VISUALIZER]: { color: '#8b5cf6' },
  [TOOL_IDS.ZINDEX_VISUALIZER]: { color: '#f43f5e' },
  [TOOL_IDS.TECH_DETECTOR]: { color: '#0ea5e9' },
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: { color: '#a855f7' },
  [TOOL_IDS.SITE_REPORT]: { color: '#f43f5e' },
  [TOOL_IDS.CSS_EDITOR]: { color: '#ec4899' },
  [TOOL_IDS.SCREENSHOT_STUDIO]: { color: '#14b8a6' },
  [TOOL_IDS.ANIMATION_INSPECTOR]: { color: '#f59e0b' },
  [TOOL_IDS.RESPONSIVE_PREVIEW]: { color: '#06b6d4' },
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: { color: '#8b5cf6' },
  [TOOL_IDS.NETWORK_ANALYZER]: { color: '#22c55e' },
  [TOOL_IDS.COMMAND_PALETTE]: { color: '#6366f1' },
  [TOOL_IDS.STORAGE_INSPECTOR]: { color: '#0891b2' },
  [TOOL_IDS.FOCUS_DEBUGGER]: { color: '#ea580c' },
  [TOOL_IDS.FORM_DEBUGGER]: { color: '#7c3aed' },
  [TOOL_IDS.COMPONENT_TREE]: { color: '#16a34a' },
  [TOOL_IDS.FLAME_GRAPH]: { color: '#dc2626' },
  [TOOL_IDS.VISUAL_REGRESSION]: { color: '#db2777' },
  [TOOL_IDS.SMART_SUGGESTIONS]: { color: '#f59e0b' },
  [TOOL_IDS.ELEMENT_INSPECTOR]: { color: '#6366f1' },
  [TOOL_IDS.MEASUREMENT_TOOL]: { color: '#64748b' },
  [TOOL_IDS.GRID_OVERLAY]: { color: '#475569' },
  [TOOL_IDS.CSS_SCANNER]: { color: '#64748b' },
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: { color: '#a855f7' },
  [TOOL_IDS.SMART_ELEMENT_PICKER]: { color: '#06b6d4' },
  [TOOL_IDS.SESSION_RECORDER]: { color: '#ef4444' },
  [TOOL_IDS.PERFORMANCE_BUDGET]: { color: '#f97316' },
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: { color: '#14b8a6' },
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: { color: '#c026d3' },
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: { color: '#7c3aed' },
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: { color: '#0d9488' },
};

/** Generate tool metadata for popup */
export function getToolMeta(toolId: ToolId): ToolMeta {
  const meta = TOOL_METADATA[toolId];
  const override = TOOL_META_OVERRIDES[toolId];
  return {
    ...meta,
    color: override?.color || '#6366f1',
  };
}

/** Export category config for shared use */
export { TOOL_CATEGORIES };

/** Filter categories by search query and advanced mode */
export function filterCategories(
  searchQuery: string,
  showAdvancedTools: boolean
): Array<{
  id: string;
  name: string;
  icon: string;
  color: string;
  tools: ToolId[];
}> {
  const q = searchQuery.trim();
  if (!q) {
    if (!showAdvancedTools) {
      return TOOL_CATEGORIES.map((cat) => ({
        ...cat,
        tools: cat.tools.filter((id) => isStarterTool(id)),
      })).filter((c) => c.tools.length > 0);
    }
    return TOOL_CATEGORIES;
  }

  const query = q.toLowerCase();
  return TOOL_CATEGORIES.map((category) => ({
    ...category,
    tools: category.tools.filter((toolId) => {
      const meta = getToolMeta(toolId);
      return (
        meta.name.toLowerCase().includes(query) ||
        meta.description.toLowerCase().includes(query) ||
        toolId.toLowerCase().includes(query)
      );
    }),
  })).filter((category) => category.tools.length > 0);
}

interface ToolGridProps {
  toolsState: ToolsState;
  searchQuery: string;
  showAdvancedTools: boolean;
  onToggleTool: (toolId: ToolId, enabled: boolean) => void;
  onOpenSettings: (toolId: ToolId) => void;
  onOpenPanel: (toolId: ToolId) => void;
  /** Flat list of currently visible tool IDs for keyboard navigation */
  flatToolIds: ToolId[];
  /** Currently focused index (-1 = none focused) */
  focusedSearchIndex: number;
  /** Ref callback for tool card DOM elements */
  toolCardRefCallback: (toolId: ToolId) => (el: HTMLDivElement | null) => void;
  /** Callback to clear search query */
  onClearSearch: () => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  toolsState,
  searchQuery,
  showAdvancedTools,
  onToggleTool,
  onOpenSettings,
  onOpenPanel,
  flatToolIds,
  focusedSearchIndex,
  toolCardRefCallback,
  onClearSearch,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(TOOL_CATEGORIES.map((c) => c.id))
  );

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const filteredCategories = useMemo(
    () => filterCategories(searchQuery, showAdvancedTools),
    [searchQuery, showAdvancedTools]
  );

  return (
    <>
      {filteredCategories.map((category) => (
        <div key={category.id} className="space-y-2">
          {/* Category Header */}
          <button
            type="button"
            onClick={() => toggleCategory(category.id)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{category.icon}</span>
              <span className="font-medium text-sm text-slate-200">{category.name}</span>
              <span className="text-xs text-slate-500">({category.tools.length})</span>
            </div>
            <svg
              className={`w-4 h-4 text-slate-500 transition-transform ${
                expandedCategories.has(category.id) ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Category Tools */}
          {expandedCategories.has(category.id) && (
            <div className="space-y-2 pl-2">
              {category.tools.map((toolId, index) => {
                const meta = getToolMeta(toolId);
                const state = toolsState[toolId] || { enabled: false };
                return (
                  <React.Fragment key={toolId}>
                    <ToolCard
                      ref={toolCardRefCallback(toolId)}
                      toolId={toolId}
                      name={meta.name}
                      description={meta.description}
                      icon={meta.icon}
                      enabled={state.enabled}
                      hasSettings={meta.hasSettings}
                      color={meta.color}
                      shortcut={meta.shortcut}
                      onToggle={(enabled) => onToggleTool(toolId, enabled)}
                      onSettingsClick={() => onOpenSettings(toolId)}
                      onView={
                        (
                          [
                            TOOL_IDS.SMART_SUGGESTIONS,
                            TOOL_IDS.VISUAL_REGRESSION,
                            TOOL_IDS.FLAME_GRAPH,
                            TOOL_IDS.COMPONENT_TREE,
                          ] as ToolId[]
                        ).includes(toolId)
                          ? () => onOpenPanel(toolId)
                          : undefined
                      }
                      animationDelay={`stagger-${index + 1}`}
                      isSearchFocused={focusedSearchIndex === flatToolIds.indexOf(toolId)}
                    />
                    {/* Show color legend below DOM Outliner when enabled */}
                    {toolId === TOOL_IDS.DOM_OUTLINER && state.enabled && (
                      <div className="animate-fade-in stagger-1">
                        <ColorLegend />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-sm font-medium">No tools match your search</p>
          <p className="text-xs mt-1">Try a different keyword or press Escape to clear</p>
          <button
            type="button"
            onClick={onClearSearch}
            className="mt-3 text-xs text-primary- hover:text-primary- transition-colors"
          >
            Clear search
          </button>
        </div>
      )}
    </>
  );
};

export default ToolGrid;
