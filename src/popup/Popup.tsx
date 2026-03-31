/**
 * FrontendDevHelper - Tabbed Popup Component
 *
 * New tabbed interface with:
 * - Tools Tab: Categorized tool cards
 * - Performance Tab: Performance metrics
 * - Inspector Tab: Element inspection
 * - Settings Tab: Quick settings
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AISuggestions } from '../components/AISuggestions';
import { ComponentTree } from '../components/ComponentTree';
import { FlameGraph } from '../components/FlameGraph';
import { VisualRegression } from '../components/VisualRegression';
import { TOOL_IDS, TOOL_METADATA, type ToolId } from '../constants';
import { DEFAULT_FEATURE_TOGGLES } from '../types';
import type { ToolMeta, ToolsState } from '../types';
import { logger } from '../utils/logger';
import { clearAllStates, getAllToolStates, setToolState } from '../utils/storage';
import { ColorLegend } from './components/ColorLegend';
import { TabBar } from './components/TabBar';
import { ToolCard } from './components/ToolCard';
import { InspectorTab } from './tabs/InspectorTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { SettingsTab } from './tabs/SettingsTab';
import './popup.css';

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
};

/** Generate tool metadata for popup */
function getToolMeta(toolId: ToolId): ToolMeta {
  const meta = TOOL_METADATA[toolId];
  const override = TOOL_META_OVERRIDES[toolId];
  return {
    ...meta,
    color: override?.color || '#6366f1',
  };
}

// ============================================
// Message Type Mapping (Unified System)
// ============================================

/**
 * Maps ToolId to the message prefix used by content script handlers.
 */
const TOOL_MESSAGE_PREFIXES: Record<ToolId, string> = {
  [TOOL_IDS.DOM_OUTLINER]: 'PESTICIDE',
  [TOOL_IDS.SPACING_VISUALIZER]: 'SPACING',
  [TOOL_IDS.FONT_INSPECTOR]: 'FONT_INSPECTOR',
  [TOOL_IDS.COLOR_PICKER]: 'COLOR_PICKER',
  [TOOL_IDS.PIXEL_RULER]: 'PIXEL_RULER',
  [TOOL_IDS.RESPONSIVE_BREAKPOINT]: 'BREAKPOINT_OVERLAY',
  [TOOL_IDS.CSS_INSPECTOR]: 'CSS_INSPECTOR',
  [TOOL_IDS.CSS_EDITOR]: 'CSS_EDITOR',
  [TOOL_IDS.CONTRAST_CHECKER]: 'CONTRAST_CHECKER',
  [TOOL_IDS.LAYOUT_VISUALIZER]: 'LAYOUT_VISUALIZER',
  [TOOL_IDS.ZINDEX_VISUALIZER]: 'ZINDEX_VISUALIZER',
  [TOOL_IDS.TECH_DETECTOR]: 'TECH_DETECTOR',
  [TOOL_IDS.ACCESSIBILITY_AUDIT]: 'ACCESSIBILITY_AUDIT',
  [TOOL_IDS.SITE_REPORT]: 'SITE_REPORT',
  [TOOL_IDS.SCREENSHOT_STUDIO]: 'SCREENSHOT_STUDIO',
  [TOOL_IDS.ANIMATION_INSPECTOR]: 'ANIMATION_INSPECTOR',
  [TOOL_IDS.RESPONSIVE_PREVIEW]: 'RESPONSIVE_PREVIEW',
  [TOOL_IDS.DESIGN_SYSTEM_VALIDATOR]: 'DESIGN_SYSTEM_VALIDATOR',
  [TOOL_IDS.NETWORK_ANALYZER]: 'NETWORK_ANALYZER',
  [TOOL_IDS.COMMAND_PALETTE]: 'COMMAND_PALETTE',
  [TOOL_IDS.STORAGE_INSPECTOR]: 'STORAGE_INSPECTOR',
  [TOOL_IDS.FOCUS_DEBUGGER]: 'FOCUS_DEBUGGER',
  [TOOL_IDS.FORM_DEBUGGER]: 'FORM_DEBUGGER',
  [TOOL_IDS.COMPONENT_TREE]: 'COMPONENT_TREE',
  [TOOL_IDS.FLAME_GRAPH]: 'FLAME_GRAPH',
  [TOOL_IDS.VISUAL_REGRESSION]: 'VISUAL_REGRESSION',
  [TOOL_IDS.SMART_SUGGESTIONS]: 'SMART_SUGGESTIONS',
  [TOOL_IDS.ELEMENT_INSPECTOR]: 'INSPECTOR',
  [TOOL_IDS.MEASUREMENT_TOOL]: 'MEASUREMENT',
  [TOOL_IDS.GRID_OVERLAY]: 'GRID',
  [TOOL_IDS.CSS_SCANNER]: 'CSS_SCANNER',
  [TOOL_IDS.CSS_VARIABLE_INSPECTOR]: 'CSS_VARIABLE_INSPECTOR',
  [TOOL_IDS.SMART_ELEMENT_PICKER]: 'SMART_ELEMENT_PICKER',
  [TOOL_IDS.SESSION_RECORDER]: 'SESSION_RECORDER',
  [TOOL_IDS.PERFORMANCE_BUDGET]: 'PERFORMANCE_BUDGET',
  [TOOL_IDS.FRAMEWORK_DEVTOOLS]: 'FRAMEWORK_DEVTOOLS',
  [TOOL_IDS.CONTAINER_QUERY_INSPECTOR]: 'CONTAINER_QUERY_INSPECTOR',
  [TOOL_IDS.VIEW_TRANSITIONS_DEBUGGER]: 'VIEW_TRANSITIONS_DEBUGGER',
  [TOOL_IDS.SCROLL_ANIMATIONS_DEBUGGER]: 'SCROLL_ANIMATIONS_DEBUGGER',
};

/**
 * Generates the message type for a tool action.
 */
function getToolMessageType(toolId: ToolId, action: 'ENABLE' | 'DISABLE'): string {
  const prefix = TOOL_MESSAGE_PREFIXES[toolId];
  if (!prefix) {
    logger.warn(`Unknown tool ID: ${toolId}`);
    return '';
  }
  return `${prefix}_${action}`;
}

/** Extension version - read from manifest */
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

// ============================================
// Main Popup Component
// ============================================

export const Popup: React.FC = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState<'tools' | 'performance' | 'inspector' | 'settings'>(
    'tools'
  );

  // Tool states (using unified ToolId)
  const [toolsState, setToolsState] = useState<ToolsState>({} as ToolsState);
  const [isLoading, setIsLoading] = useState(true);

  // UI states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    // Default to all expanded
    return new Set(TOOL_CATEGORIES.map((c) => c.id));
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Panel state for React component integration
  const [openPanel, setOpenPanel] = useState<ToolId | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  // Load initial state from service worker (not content script)
  useEffect(() => {
    const loadState = async () => {
      try {
        // Get all tool states from service worker via storage
        const states = await getAllToolStates();
        setToolsState(states);
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to load state:', err);
        setIsLoading(false);
      }
    };

    loadState();

    // Listen for state changes from service worker
    const handleMessage = (message: { type: string; payload?: Record<string, unknown> }) => {
      if (message.type === 'TOOL_STATE_CHANGED') {
        const toolId = message.payload?.toolId as ToolId | undefined;
        const enabled = message.payload?.enabled as boolean | undefined;
        if (toolId && typeof enabled === 'boolean') {
          setToolsState((prev) => ({
            ...prev,
            [toolId]: { ...prev[toolId], enabled },
          }));
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  /**
   * Toggle a tool on/off
   */
  const handleToggleTool = useCallback(async (toolId: ToolId, enabled: boolean) => {
    // Update local state
    setToolsState((prev) => ({
      ...prev,
      [toolId]: { ...prev[toolId], enabled },
    }));

    // Persist to storage
    try {
      await setToolState(toolId, { enabled, settings: toolsState[toolId]?.settings || {} });
    } catch (err) {
      logger.error('Failed to persist tool state:', err);
    }

    // Send message to content script via service worker
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const messageType = getToolMessageType(toolId, enabled ? 'ENABLE' : 'DISABLE');
    if (!messageType) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: messageType });
    } catch (err) {
      logger.error('Failed to send message:', err);
    }
  }, [toolsState]);

  /**
   * Open settings for a tool
   */
  const handleOpenSettings = useCallback((toolId: ToolId) => {
    const url = chrome.runtime.getURL(`options.html#tool=${toolId}`);
    chrome.tabs.create({ url });
  }, []);

  /**
   * Open panel for a tool (for React component integration)
   */
  const handleOpenPanel = useCallback(async (toolId: ToolId) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      setCurrentTabUrl(tab.url);
    }
    setOpenPanel(toolId);
  }, []);

  /**
   * Reset all tools
   */
  const handleResetAll = useCallback(async () => {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      setTimeout(() => setShowResetConfirm(false), 3000);
      return;
    }

    // Reset state to defaults using DEFAULT_FEATURE_TOGGLES
    const resetState = {} as ToolsState;
    for (const toolId of Object.values(TOOL_IDS)) {
      const defaultEnabled = DEFAULT_FEATURE_TOGGLES[toolId] ?? false;
      resetState[toolId] = { enabled: defaultEnabled, settings: {} };
    }

    setToolsState(resetState);
    setShowResetConfirm(false);

    // Send batch disable message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'DISABLE_ALL_TOOLS' });
      } catch (err) {
        logger.error('Failed to send DISABLE_ALL_TOOLS:', err);
      }
    }

    // Clear storage
    try {
      await clearAllStates();
    } catch (err) {
      logger.error('Failed to clear storage:', err);
    }
  }, [showResetConfirm]);

  /**
   * Toggle category expansion
   */
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

  /**
   * Get count of active tools
   */
  const activeToolsCount = useMemo(
    () => Object.values(toolsState).filter((s) => s?.enabled).length,
    [toolsState]
  );

  /**
   * Filter tools based on search query
   */
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return TOOL_CATEGORIES;

    const query = searchQuery.toLowerCase().trim();
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
  }, [searchQuery]);

  /**
   * Handle keyboard shortcut to focus search
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && searchInputRef.current === document.activeElement) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="w-[420px] min-h-[300px] bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="w-[420px] bg-slate-900 text-slate-100 flex flex-col h-[580px]">
        {/* Header */}
        <header className="popup-header px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg
                aria-hidden="true"
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
            </div>

            <div>
              <h1 className="font-bold text-sm logo-text">FrontendDevHelper</h1>
              <p className="text-[10px] text-slate-400">
                {activeToolsCount > 0 ? (
                  <span className="text-emerald-400">
                    {activeToolsCount} tool{activeToolsCount !== 1 ? 's' : ''} active
                  </span>
                ) : (
                  'All tools disabled'
                )}
              </p>
            </div>
          </div>

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleResetAll}
            className={`
              btn-icon text-xs px-2 w-auto gap-1
              ${
                showResetConfirm
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }
            `}
            title={showResetConfirm ? 'Click again to confirm' : 'Reset all tools'}
          >
            {showResetConfirm ? (
              <>
                <span>⚠️</span>
                <span>Confirm</span>
              </>
            ) : (
              <svg
                aria-hidden="true"
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        </header>

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeTab === 'tools' && (
            <div className="h-full overflow-y-auto p-3 space-y-3">
              {/* Search Bar */}
              <div className="relative sticky top-0 z-10">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    aria-hidden="true"
                    className="h-4 w-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tools..."
                  aria-label="Search tools"
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg pl-9 pr-9 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    title="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                ) : (
                  <kbd className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
                      /
                    </span>
                  </kbd>
                )}
              </div>

              {/* Tool Categories */}
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
                              toolId={toolId}
                              name={meta.name}
                              description={meta.description}
                              icon={meta.icon}
                              enabled={state.enabled}
                              hasSettings={meta.hasSettings}
                              color={meta.color}
                              shortcut={meta.shortcut}
                              onToggle={(enabled) => handleToggleTool(toolId, enabled)}
                              onSettingsClick={() => handleOpenSettings(toolId)}
                              onView={
                                (
                                  [
                                    TOOL_IDS.SMART_SUGGESTIONS,
                                    TOOL_IDS.VISUAL_REGRESSION,
                                    TOOL_IDS.FLAME_GRAPH,
                                    TOOL_IDS.COMPONENT_TREE,
                                  ] as ToolId[]
                                ).includes(toolId)
                                  ? () => handleOpenPanel(toolId)
                                  : undefined
                              }
                              animationDelay={`stagger-${index + 1}`}
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
                    onClick={() => setSearchQuery('')}
                    className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Clear search
                  </button>
                </div>
              )}

              {/* Pro Tips Section */}
              <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
                <h4 className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                  <span>💡</span>
                  Pro Tip
                </h4>
                <p className="text-[11px] text-slate-400">
                  Use{' '}
                  <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">
                    Ctrl+Shift+F
                  </kbd>{' '}
                  to open the popup,{' '}
                  <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">/</kbd> to search
                  tools.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'performance' && <PerformanceTab />}
          {activeTab === 'inspector' && <InspectorTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>

        {/* Footer */}
        <footer className="popup-footer px-3 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">v{EXTENSION_VERSION}</span>
            <span className="text-slate-600">•</span>
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-0.5"
            >
              <svg aria-hidden="true" className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              GitHub
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              onClick={() => {
                const url = chrome.runtime.getURL('options.html');
                chrome.tabs.create({ url });
              }}
            >
              Full Settings
            </button>
            <span className="text-slate-600">•</span>
            <a
              href="https://github.com/rejisterjack/frontend-dev-helper#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Help
            </a>
          </div>
        </footer>

        {/* Panel Overlays for React Component Integration */}
        {openPanel === TOOL_IDS.SMART_SUGGESTIONS && (
          <AISuggestions isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === TOOL_IDS.VISUAL_REGRESSION && (
          <VisualRegression
            isOpen={true}
            onClose={() => setOpenPanel(null)}
            currentUrl={currentTabUrl}
          />
        )}
        {openPanel === TOOL_IDS.FLAME_GRAPH && (
          <FlameGraph isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === TOOL_IDS.COMPONENT_TREE && (
          <ComponentTree isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
      </div>
    </>
  );
};

export default Popup;
