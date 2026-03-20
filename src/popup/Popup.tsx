import React, { useCallback, useEffect, useState } from 'react';
import { Onboarding } from '../components';
import { type ToolMeta, type ToolsState, ToolType } from '../types';
import { logger } from '../utils/logger';
import { ColorLegend } from './components/ColorLegend';
import { ToolCard } from './components/ToolCard';
import './popup.css';

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
];

/** Extension version */
const EXTENSION_VERSION = '1.0.0';

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
  });

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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
            });
          }
        }
        setIsLoading(false);
      } catch (err) {
        logger.error('Failed to load state:', err);
        // Fallback to localStorage if content script not available
        const stored = localStorage.getItem('frontendDevHelperState');
        if (stored) {
          setToolsState(JSON.parse(stored));
        }
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  // Persist state changes to localStorage as backup
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('frontendDevHelperState', JSON.stringify(toolsState));
    }
  }, [toolsState, isLoading]);

  /**
   * Toggle a tool on/off
   */
  const handleToggleTool = useCallback(async (tool: ToolType, enabled: boolean) => {
    setToolsState((prev) => ({
      ...prev,
      [tool]: { ...prev[tool], enabled },
    }));

    // Send message to content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    let messageType: string;
    switch (tool) {
      case ToolType.DOM_OUTLINER:
        messageType = enabled ? 'PESTICIDE_ENABLE' : 'PESTICIDE_DISABLE';
        break;
      case ToolType.SPACING_VISUALIZER:
        messageType = enabled ? 'SPACING_ENABLE' : 'SPACING_DISABLE';
        break;
      case ToolType.FONT_INSPECTOR:
        messageType = enabled ? 'FONT_INSPECTOR_ENABLE' : 'FONT_INSPECTOR_DISABLE';
        break;
      case ToolType.COLOR_PICKER:
        messageType = enabled ? 'COLOR_PICKER_ENABLE' : 'COLOR_PICKER_DISABLE';
        break;
      case ToolType.PIXEL_RULER:
        messageType = enabled ? 'PIXEL_RULER_ENABLE' : 'PIXEL_RULER_DISABLE';
        break;
      case ToolType.RESPONSIVE_BREAKPOINT:
        messageType = enabled ? 'BREAKPOINT_OVERLAY_ENABLE' : 'BREAKPOINT_OVERLAY_DISABLE';
        break;
      case ToolType.CSS_INSPECTOR:
        messageType = enabled ? 'CSS_INSPECTOR_ENABLE' : 'CSS_INSPECTOR_DISABLE';
        break;
      case ToolType.CONTRAST_CHECKER:
        messageType = enabled ? 'CONTRAST_CHECKER_ENABLE' : 'CONTRAST_CHECKER_DISABLE';
        break;
      case ToolType.LAYOUT_VISUALIZER:
        messageType = enabled ? 'LAYOUT_VISUALIZER_ENABLE' : 'LAYOUT_VISUALIZER_DISABLE';
        break;
      case ToolType.ZINDEX_VISUALIZER:
        messageType = enabled ? 'ZINDEX_VISUALIZER_ENABLE' : 'ZINDEX_VISUALIZER_DISABLE';
        break;
      case ToolType.TECH_DETECTOR:
        messageType = enabled ? 'TECH_DETECTOR_ENABLE' : 'TECH_DETECTOR_DISABLE';
        break;
      case ToolType.ACCESSIBILITY_AUDIT:
        messageType = enabled ? 'ACCESSIBILITY_AUDIT_ENABLE' : 'ACCESSIBILITY_AUDIT_DISABLE';
        break;
      case ToolType.SITE_REPORT:
        messageType = enabled ? 'SITE_REPORT_ENABLE' : 'SITE_REPORT_DISABLE';
        break;
      case ToolType.CSS_EDITOR:
        messageType = enabled ? 'CSS_EDITOR_ENABLE' : 'CSS_EDITOR_DISABLE';
        break;
      case ToolType.SCREENSHOT_STUDIO:
        messageType = enabled ? 'SCREENSHOT_STUDIO_ENABLE' : 'SCREENSHOT_STUDIO_DISABLE';
        break;
      case ToolType.ANIMATION_INSPECTOR:
        messageType = enabled ? 'ANIMATION_INSPECTOR_ENABLE' : 'ANIMATION_INSPECTOR_DISABLE';
        break;
      case ToolType.RESPONSIVE_PREVIEW:
        messageType = enabled ? 'RESPONSIVE_PREVIEW_ENABLE' : 'RESPONSIVE_PREVIEW_DISABLE';
        break;
      case ToolType.DESIGN_SYSTEM_VALIDATOR:
        messageType = enabled
          ? 'DESIGN_SYSTEM_VALIDATOR_ENABLE'
          : 'DESIGN_SYSTEM_VALIDATOR_DISABLE';
        break;
      case ToolType.NETWORK_ANALYZER:
        messageType = enabled ? 'NETWORK_ANALYZER_ENABLE' : 'NETWORK_ANALYZER_DISABLE';
        break;
      default:
        return;
    }

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
    };

    setToolsState(resetState);
    setShowResetConfirm(false);

    // Send disable messages to all tools
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const disableMessages = [
        'PESTICIDE_DISABLE',
        'SPACING_DISABLE',
        'FONT_INSPECTOR_DISABLE',
        'COLOR_PICKER_DISABLE',
        'PIXEL_RULER_DISABLE',
        'BREAKPOINT_OVERLAY_DISABLE',
        'CSS_INSPECTOR_DISABLE',
        'CONTRAST_CHECKER_DISABLE',
        'LAYOUT_VISUALIZER_DISABLE',
        'ZINDEX_VISUALIZER_DISABLE',
        'TECH_DETECTOR_DISABLE',
        'ACCESSIBILITY_AUDIT_DISABLE',
        'SITE_REPORT_DISABLE',
        'CSS_EDITOR_DISABLE',
        'SCREENSHOT_STUDIO_DISABLE',
        'ANIMATION_INSPECTOR_DISABLE',
        'RESPONSIVE_PREVIEW_DISABLE',
        'DESIGN_SYSTEM_VALIDATOR_DISABLE',
        'NETWORK_ANALYZER_DISABLE',
      ];

      for (const messageType of disableMessages) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: messageType });
        } catch (err) {
          logger.error(`Failed to send ${messageType}:`, err);
        }
      }
    }
  }, [showResetConfirm]);

  /**
   * Get count of active tools
   */
  const activeToolsCount = Object.values(toolsState).filter((s) => s.enabled).length;

  if (isLoading) {
    return (
      <div className="w-[380px] min-h-[200px] bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-[380px] min-h-[200px] bg-slate-900 p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
          >
            Retry
          </button>
        </div>
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {/* Tool Cards */}
          {TOOLS.map((tool, index) => (
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
          {TOOLS.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p className="text-sm">No tools found</p>
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
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
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
            <a
              href="#"
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const url = chrome.runtime.getURL('options.html');
                chrome.tabs.create({ url });
              }}
            >
              Settings
            </a>
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
      </div>
    </>
  );
};

export default Popup;
