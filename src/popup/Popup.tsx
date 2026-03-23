import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Onboarding } from '../components';
import { AISuggestions } from '../components/AISuggestions';
import { ComponentTree } from '../components/ComponentTree';
import { FlameGraph } from '../components/FlameGraph';
import { VisualRegression } from '../components/VisualRegression';
import { type ToolMeta, type ToolsState, ToolType } from '../types';
import { logger } from '../utils/logger';
import { clearAllStates } from '../utils/storage';
import { ColorLegend } from './components/ColorLegend';
import { ToolCard } from './components/ToolCard';
import './popup.css';

// ============================================
// Message Type Mapping (Unified System)
// ============================================

/**
 * Maps ToolType to the message prefix used by content script handlers.
 * This creates the unified message system - the popup sends messages
 * that match what the handler registry expects.
 */
const TOOL_MESSAGE_PREFIXES: Record<ToolType, string> = {
  [ToolType.DOM_OUTLINER]: 'PESTICIDE',
  [ToolType.SPACING_VISUALIZER]: 'SPACING',
  [ToolType.FONT_INSPECTOR]: 'FONT_INSPECTOR',
  [ToolType.COLOR_PICKER]: 'COLOR_PICKER',
  [ToolType.PIXEL_RULER]: 'PIXEL_RULER',
  [ToolType.RESPONSIVE_BREAKPOINT]: 'BREAKPOINT_OVERLAY',
  [ToolType.CSS_INSPECTOR]: 'CSS_INSPECTOR',
  [ToolType.CSS_EDITOR]: 'CSS_EDITOR',
  [ToolType.CONTRAST_CHECKER]: 'CONTRAST_CHECKER',
  [ToolType.LAYOUT_VISUALIZER]: 'LAYOUT_VISUALIZER',
  [ToolType.ZINDEX_VISUALIZER]: 'ZINDEX_VISUALIZER',
  [ToolType.TECH_DETECTOR]: 'TECH_DETECTOR',
  [ToolType.ACCESSIBILITY_AUDIT]: 'ACCESSIBILITY_AUDIT',
  [ToolType.SITE_REPORT]: 'SITE_REPORT',
  [ToolType.SCREENSHOT_STUDIO]: 'SCREENSHOT_STUDIO',
  [ToolType.ANIMATION_INSPECTOR]: 'ANIMATION_INSPECTOR',
  [ToolType.RESPONSIVE_PREVIEW]: 'RESPONSIVE_PREVIEW',
  [ToolType.DESIGN_SYSTEM_VALIDATOR]: 'DESIGN_SYSTEM_VALIDATOR',
  [ToolType.NETWORK_ANALYZER]: 'NETWORK_ANALYZER',
  [ToolType.COMMAND_PALETTE]: 'COMMAND_PALETTE',
  [ToolType.STORAGE_INSPECTOR]: 'STORAGE_INSPECTOR',
  [ToolType.FOCUS_DEBUGGER]: 'FOCUS_DEBUGGER',
  [ToolType.FORM_DEBUGGER]: 'FORM_DEBUGGER',
  [ToolType.COMPONENT_TREE]: 'COMPONENT_TREE',
  [ToolType.FLAME_GRAPH]: 'FLAME_GRAPH',
  [ToolType.VISUAL_REGRESSION]: 'VISUAL_REGRESSION',
  [ToolType.AI_SUGGESTIONS]: 'AI_SUGGESTIONS',
};

/**
 * Generates the message type for a tool action.
 * This replaces the legacy hardcoded TOOL_MESSAGE_MAP.
 */
function getToolMessageType(tool: ToolType, action: 'ENABLE' | 'DISABLE'): string {
  const prefix = TOOL_MESSAGE_PREFIXES[tool];
  if (!prefix) {
    logger.warn(`Unknown tool type: ${tool}`);
    return '';
  }
  return `${prefix}_${action}`;
}

// ============================================
// FrontendDevHelper - Main Popup Component
// ============================================

/** Tool metadata configuration */
const TOOLS: ToolMeta[] = [
  {
    type: ToolType.DOM_OUTLINER,
    name: 'DOM Outliner',
    description: 'Visualize page structure with color-coded outlines',
    icon: '🕸️',
    hasSettings: true,
    color: '#f97316',
  },
  {
    type: ToolType.SPACING_VISUALIZER,
    name: 'Spacing Visualizer',
    description: 'See margins, padding, and gaps in real-time',
    icon: '📐',
    hasSettings: true,
    color: '#8b5cf6',
  },
  {
    type: ToolType.FONT_INSPECTOR,
    name: 'Font Inspector',
    description: 'Analyze typography and font stacks',
    icon: '🔤',
    hasSettings: true,
    color: '#3b82f6',
  },
  {
    type: ToolType.COLOR_PICKER,
    name: 'Color Picker',
    description: 'Pick colors from anywhere on the page',
    icon: '🎨',
    hasSettings: true,
    color: '#ec4899',
  },
  {
    type: ToolType.PIXEL_RULER,
    name: 'Pixel Ruler',
    description: 'Measure distances and dimensions precisely',
    icon: '📏',
    hasSettings: true,
    color: '#f59e0b',
  },
  {
    type: ToolType.RESPONSIVE_BREAKPOINT,
    name: 'Breakpoint Overlay',
    description: 'Show current viewport size and breakpoints',
    icon: '📱',
    hasSettings: true,
    color: '#06b6d4',
  },
  {
    type: ToolType.CSS_INSPECTOR,
    name: 'CSS Inspector',
    description: 'View all computed CSS properties by category',
    icon: '📝',
    hasSettings: true,
    color: '#10b981',
  },
  {
    type: ToolType.CONTRAST_CHECKER,
    name: 'Contrast Checker',
    description: 'Check WCAG AA/AAA color contrast compliance',
    icon: '♿',
    hasSettings: true,
    color: '#84cc16',
  },
  {
    type: ToolType.LAYOUT_VISUALIZER,
    name: 'Flex/Grid Visualizer',
    description: 'Visualize flexbox and grid layouts',
    icon: '⊞',
    hasSettings: true,
    color: '#8b5cf6',
  },
  {
    type: ToolType.ZINDEX_VISUALIZER,
    name: 'Z-Index Visualizer',
    description: 'See stacking order and z-index hierarchy',
    icon: '📚',
    hasSettings: true,
    color: '#f43f5e',
  },
  {
    type: ToolType.TECH_DETECTOR,
    name: 'Tech Detector',
    description: 'Detect frameworks, libraries, and tools',
    icon: '🔍',
    hasSettings: true,
    color: '#0ea5e9',
  },
  {
    type: ToolType.ACCESSIBILITY_AUDIT,
    name: 'Accessibility Audit',
    description: 'WCAG compliance checker with ARIA validation',
    icon: '♿',
    hasSettings: true,
    color: '#a855f7',
  },
  {
    type: ToolType.SITE_REPORT,
    name: 'Site Report Generator',
    description: 'Comprehensive site analysis with scores & recommendations',
    icon: '📊',
    hasSettings: true,
    color: '#f43f5e',
  },
  {
    type: ToolType.CSS_EDITOR,
    name: 'Live CSS Editor',
    description: 'Edit CSS in real-time with live preview',
    icon: '✏️',
    hasSettings: true,
    color: '#ec4899',
  },
  {
    type: ToolType.SCREENSHOT_STUDIO,
    name: 'Screenshot Studio',
    description: 'Capture and annotate screenshots',
    icon: '📸',
    hasSettings: true,
    color: '#14b8a6',
  },
  {
    type: ToolType.ANIMATION_INSPECTOR,
    name: 'Animation Inspector',
    description: 'Debug CSS animations and transitions',
    icon: '🎬',
    hasSettings: true,
    color: '#f59e0b',
  },
  {
    type: ToolType.RESPONSIVE_PREVIEW,
    name: 'Responsive Preview',
    description: 'Multi-device preview side-by-side',
    icon: '📱',
    hasSettings: true,
    color: '#06b6d4',
  },
  {
    type: ToolType.DESIGN_SYSTEM_VALIDATOR,
    name: 'Design System Validator',
    description: 'Check consistency with design tokens',
    icon: '🎨',
    hasSettings: true,
    color: '#8b5cf6',
  },
  {
    type: ToolType.NETWORK_ANALYZER,
    name: 'Network Analyzer',
    description: 'Monitor network requests and waterfall',
    icon: '🌐',
    hasSettings: true,
    color: '#22c55e',
  },
  // New "Best of the Best" Tools
  {
    type: ToolType.COMMAND_PALETTE,
    name: 'Command Palette',
    description: 'Quick access to all tools via keyboard (Ctrl+Shift+P)',
    icon: '⌨️',
    hasSettings: true,
    color: '#6366f1',
  },
  {
    type: ToolType.STORAGE_INSPECTOR,
    name: 'Storage Inspector',
    description: 'Inspect LocalStorage, IndexedDB, Cookies, and Cache',
    icon: '💾',
    hasSettings: true,
    color: '#0891b2',
  },
  {
    type: ToolType.FOCUS_DEBUGGER,
    name: 'Focus Debugger',
    description: 'Visualize focus order and detect focus traps',
    icon: '🎯',
    hasSettings: true,
    color: '#ea580c',
  },
  {
    type: ToolType.FORM_DEBUGGER,
    name: 'Form Debugger',
    description: 'Debug form validation, autofill, and accessibility',
    icon: '📝',
    hasSettings: true,
    color: '#7c3aed',
  },
  {
    type: ToolType.COMPONENT_TREE,
    name: 'Component Tree',
    description: 'Visualize React, Vue, Angular, Svelte components',
    icon: '🌳',
    hasSettings: true,
    color: '#16a34a',
  },
  {
    type: ToolType.FLAME_GRAPH,
    name: 'Performance Flame Graph',
    description: 'Visualize JavaScript execution performance',
    icon: '🔥',
    hasSettings: true,
    color: '#dc2626',
  },
  {
    type: ToolType.VISUAL_REGRESSION,
    name: 'Visual Regression',
    description: 'Capture baselines and compare screenshots',
    icon: '👁️',
    hasSettings: true,
    color: '#db2777',
  },
  {
    type: ToolType.AI_SUGGESTIONS,
    name: 'AI Suggestions',
    description: 'Smart analysis with one-click fixes',
    icon: '✨',
    hasSettings: true,
    color: '#f59e0b',
  },
];

/** Extension version - read from manifest */
const EXTENSION_VERSION = chrome.runtime.getManifest().version;

export const Popup: React.FC = () => {
  // Tool states
  const [toolsState, setToolsState] = useState<ToolsState>({
    [ToolType.DOM_OUTLINER]: { enabled: false },
    [ToolType.SPACING_VISUALIZER]: { enabled: false },
    [ToolType.FONT_INSPECTOR]: { enabled: false },
    [ToolType.COLOR_PICKER]: { enabled: false },
    [ToolType.PIXEL_RULER]: { enabled: false },
    [ToolType.RESPONSIVE_BREAKPOINT]: { enabled: false },
    [ToolType.CSS_INSPECTOR]: { enabled: false },
    [ToolType.CONTRAST_CHECKER]: { enabled: false },
    [ToolType.LAYOUT_VISUALIZER]: { enabled: false },
    [ToolType.ZINDEX_VISUALIZER]: { enabled: false },
    [ToolType.TECH_DETECTOR]: { enabled: false },
    [ToolType.ACCESSIBILITY_AUDIT]: { enabled: false },
    [ToolType.SITE_REPORT]: { enabled: false },
    [ToolType.CSS_EDITOR]: { enabled: false },
    [ToolType.SCREENSHOT_STUDIO]: { enabled: false },
    [ToolType.ANIMATION_INSPECTOR]: { enabled: false },
    [ToolType.RESPONSIVE_PREVIEW]: { enabled: false },
    [ToolType.DESIGN_SYSTEM_VALIDATOR]: { enabled: false },
    [ToolType.NETWORK_ANALYZER]: { enabled: false },
    // New "Best of the Best" Tools
    [ToolType.COMMAND_PALETTE]: { enabled: true },
    [ToolType.STORAGE_INSPECTOR]: { enabled: false },
    [ToolType.FOCUS_DEBUGGER]: { enabled: false },
    [ToolType.FORM_DEBUGGER]: { enabled: false },
    [ToolType.COMPONENT_TREE]: { enabled: false },
    [ToolType.FLAME_GRAPH]: { enabled: false },
    [ToolType.VISUAL_REGRESSION]: { enabled: false },
    [ToolType.AI_SUGGESTIONS]: { enabled: true },
  } as unknown as ToolsState);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Panel state for React component integration
  const [openPanel, setOpenPanel] = useState<ToolType | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  // Load initial state from content script
  useEffect(() => {
    const loadState = async () => {
      try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          // Get all tool states from content script
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_ALL_STATES' });
          if (response?.success && response.states) {
            setToolsState({
              [ToolType.DOM_OUTLINER]: response.states.pesticide || { enabled: false },
              [ToolType.SPACING_VISUALIZER]: response.states.spacing || { enabled: false },
              [ToolType.FONT_INSPECTOR]: response.states.fontInspector || { enabled: false },
              [ToolType.COLOR_PICKER]: response.states.colorPicker || { enabled: false },
              [ToolType.PIXEL_RULER]: response.states.pixelRuler || { enabled: false },
              [ToolType.RESPONSIVE_BREAKPOINT]: response.states.breakpointOverlay || {
                enabled: false,
              },
              [ToolType.CSS_INSPECTOR]: response.states.cssInspector || { enabled: false },
              [ToolType.CONTRAST_CHECKER]: response.states.contrastChecker || { enabled: false },
              [ToolType.LAYOUT_VISUALIZER]: response.states.layoutVisualizer || { enabled: false },
              [ToolType.ZINDEX_VISUALIZER]: response.states.zIndexVisualizer || { enabled: false },
              [ToolType.TECH_DETECTOR]: response.states.techDetector || { enabled: false },
              [ToolType.ACCESSIBILITY_AUDIT]: response.states.accessibilityAudit || {
                enabled: false,
              },
              [ToolType.SITE_REPORT]: response.states.siteReportGenerator || { enabled: false },
              [ToolType.CSS_EDITOR]: response.states.cssEditor || { enabled: false },
              [ToolType.SCREENSHOT_STUDIO]: response.states.screenshotStudio || { enabled: false },
              [ToolType.ANIMATION_INSPECTOR]: response.states.animationInspector || {
                enabled: false,
              },
              [ToolType.RESPONSIVE_PREVIEW]: response.states.responsivePreview || {
                enabled: false,
              },
              [ToolType.DESIGN_SYSTEM_VALIDATOR]: response.states.designSystemValidator || {
                enabled: false,
              },
              [ToolType.NETWORK_ANALYZER]: response.states.networkAnalyzer || { enabled: false },
              // New "Best of the Best" Tools
              [ToolType.COMMAND_PALETTE]: response.states.commandPalette || { enabled: true },
              [ToolType.STORAGE_INSPECTOR]: response.states.storageInspector || { enabled: false },
              [ToolType.FOCUS_DEBUGGER]: response.states.focusDebugger || { enabled: false },
              [ToolType.FORM_DEBUGGER]: response.states.formDebugger || { enabled: false },
              [ToolType.COMPONENT_TREE]: response.states.componentTree || { enabled: false },
              [ToolType.FLAME_GRAPH]: response.states.flameGraph || { enabled: false },
              [ToolType.VISUAL_REGRESSION]: response.states.visualRegression || { enabled: false },
              [ToolType.AI_SUGGESTIONS]: response.states.aiSuggestions || { enabled: true },
            } as unknown as ToolsState);
          }
        }
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to load state:', err);
        // Use default state (don't fall back to localStorage for security)
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  // Note: State is persisted to chrome.storage, not localStorage (security)

  /**
   * Toggle a tool on/off
   * Uses the unified message system - generates message types dynamically
   * from TOOL_MESSAGE_PREFIXES instead of hardcoded mappings.
   */
  const handleToggleTool = useCallback(async (tool: ToolType, enabled: boolean) => {
    setToolsState((prev) => ({
      ...prev,
      [tool]: { ...prev[tool], enabled },
    }));

    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    const messageType = getToolMessageType(tool, enabled ? 'ENABLE' : 'DISABLE');
    if (!messageType) return;

    try {
      await chrome.tabs.sendMessage(tab.id, { type: messageType });
    } catch (err) {
      logger.error('Failed to send message:', err);
    }
  }, []);

  /**
   * Open settings for a tool
   */
  const handleOpenSettings = useCallback((tool: ToolType) => {
    // Open the options page with the tool pre-selected
    const url = chrome.runtime.getURL(`options.html#tool=${tool}`);
    chrome.tabs.create({ url });
  }, []);

  /**
   * Open panel for a tool (for React component integration)
   */
  const handleOpenPanel = useCallback(async (tool: ToolType) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) {
      setCurrentTabUrl(tab.url);
    }
    setOpenPanel(tool);
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

    const resetState: ToolsState = {
      [ToolType.DOM_OUTLINER]: { enabled: false },
      [ToolType.SPACING_VISUALIZER]: { enabled: false },
      [ToolType.FONT_INSPECTOR]: { enabled: false },
      [ToolType.COLOR_PICKER]: { enabled: false },
      [ToolType.PIXEL_RULER]: { enabled: false },
      // New "Best of the Best" Tools - reset to defaults
      [ToolType.COMMAND_PALETTE]: { enabled: true },
      [ToolType.STORAGE_INSPECTOR]: { enabled: false },
      [ToolType.FOCUS_DEBUGGER]: { enabled: false },
      [ToolType.FORM_DEBUGGER]: { enabled: false },
      [ToolType.COMPONENT_TREE]: { enabled: false },
      [ToolType.FLAME_GRAPH]: { enabled: false },
      [ToolType.VISUAL_REGRESSION]: { enabled: false },
      [ToolType.AI_SUGGESTIONS]: { enabled: true },
      [ToolType.RESPONSIVE_BREAKPOINT]: { enabled: false },
      [ToolType.CSS_INSPECTOR]: { enabled: false },
      [ToolType.CONTRAST_CHECKER]: { enabled: false },
      [ToolType.LAYOUT_VISUALIZER]: { enabled: false },
      [ToolType.ZINDEX_VISUALIZER]: { enabled: false },
      [ToolType.TECH_DETECTOR]: { enabled: false },
      [ToolType.ACCESSIBILITY_AUDIT]: { enabled: false },
      [ToolType.SITE_REPORT]: { enabled: false },
      [ToolType.CSS_EDITOR]: { enabled: false },
      [ToolType.SCREENSHOT_STUDIO]: { enabled: false },
      [ToolType.ANIMATION_INSPECTOR]: { enabled: false },
      [ToolType.RESPONSIVE_PREVIEW]: { enabled: false },
      [ToolType.DESIGN_SYSTEM_VALIDATOR]: { enabled: false },
      [ToolType.NETWORK_ANALYZER]: { enabled: false },
    } as unknown as ToolsState;

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

    // Clear chrome.storage to persist the reset
    try {
      await clearAllStates();
    } catch (err) {
      logger.error('Failed to clear storage:', err);
    }
  }, [showResetConfirm]);

  /**
   * Get count of active tools
   */
  const activeToolsCount = Object.values(toolsState).filter((s) => s.enabled).length;

  /**
   * Filter tools based on search query
   */
  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return TOOLS;
    const query = searchQuery.toLowerCase().trim();
    return TOOLS.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  /**
   * Handle keyboard shortcut to focus search
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search on '/' key, but not when typing in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Clear search on Escape when search is focused
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
      <div className="w-[380px] min-h-[200px] bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      {/* Onboarding Flow - shows on first install */}
      <Onboarding onComplete={() => logger.log('Onboarding completed')} />

      <div className="w-[380px] bg-slate-900 text-slate-100 flex flex-col min-h-[200px] max-h-[600px]">
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

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
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
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 space-y-2">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
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
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 text-sm rounded-lg pl-9 pr-9 py-2 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
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
            )}
            {!searchQuery && (
              <kbd className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-[10px] text-slate-600 border border-slate-700 rounded px-1.5 py-0.5">
                  /
                </span>
              </kbd>
            )}
          </div>

          {/* Tool Cards */}
          {filteredTools.map((tool, index) => (
            <React.Fragment key={tool.type}>
              <ToolCard
                type={tool.type}
                name={tool.name}
                description={tool.description}
                icon={tool.icon}
                enabled={toolsState[tool.type].enabled}
                hasSettings={tool.hasSettings}
                color={tool.color}
                onToggle={(enabled) => handleToggleTool(tool.type, enabled)}
                onSettingsClick={() => handleOpenSettings(tool.type)}
                onView={
                  // Only 4 tools have React panel components
                  [
                    ToolType.AI_SUGGESTIONS,
                    ToolType.VISUAL_REGRESSION,
                    ToolType.FLAME_GRAPH,
                    ToolType.COMPONENT_TREE,
                  ].includes(tool.type)
                    ? () => handleOpenPanel(tool.type)
                    : undefined
                }
                animationDelay={`stagger-${index + 1}`}
              />

              {/* Show color legend below DOM Outliner when enabled */}
              {tool.type === ToolType.DOM_OUTLINER && toolsState[tool.type].enabled && (
                <div className="animate-fade-in stagger-1">
                  <ColorLegend />
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Empty State (when no tools match search) */}
          {filteredTools.length === 0 && (
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
              <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">Ctrl+Shift+F</kbd> to
              open the popup,{' '}
              <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-300">Esc</kbd> to disable
              all tools.
            </p>
          </div>
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
              Settings
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
        {openPanel === ToolType.AI_SUGGESTIONS && (
          <AISuggestions isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === ToolType.VISUAL_REGRESSION && (
          <VisualRegression
            isOpen={true}
            onClose={() => setOpenPanel(null)}
            currentUrl={currentTabUrl}
          />
        )}
        {openPanel === ToolType.FLAME_GRAPH && (
          <FlameGraph isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
        {openPanel === ToolType.COMPONENT_TREE && (
          <ComponentTree isOpen={true} onClose={() => setOpenPanel(null)} />
        )}
      </div>
    </>
  );
};

export default Popup;
