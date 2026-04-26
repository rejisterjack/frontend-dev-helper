/**
 * FrontendDevHelper - Tabbed Popup Component
 *
 * Thin shell that composes hooks, tab bar, tab content, and footer.
 */

import React, { useCallback, useState } from 'react';
import { AISuggestions } from '../components/AISuggestions';
import { ComponentTree } from '../components/ComponentTree';
import { FlameGraph } from '../components/FlameGraph';
import { VisualRegression } from '../components/VisualRegression';
import { TOOL_IDS, type ToolId } from '../constants';
import { usePageHints } from './hooks/usePageHints';
import { usePresets } from './hooks/usePresets';
import { useToolState } from './hooks/useToolState';
import { TabBar } from './components/TabBar';
import { InspectorTab } from './tabs/InspectorTab';
import { PerformanceTab } from './tabs/PerformanceTab';
import { SettingsTab } from './tabs/SettingsTab';
import { ToolsTab } from './tabs/ToolsTab';
import './popup.css';

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

  // Panel state for React component integration
  const [openPanel, setOpenPanel] = useState<ToolId | null>(null);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>('');

  // Extracted hooks
  const {
    toolsState,
    isLoading,
    showResetConfirm,
    activeToolsCount,
    showAdvancedTools,
    setShowAdvancedTools,
    handleToggleTool,
    handleResetAll,
    setToolsState,
  } = useToolState();

  const recommendedIds = usePageHints();

  const {
    userPresets,
    handleApplyPreset,
    handleApplyUserPreset,
    handleSaveUserPreset,
    handleDeleteUserPreset,
  } = usePresets({ toolsState, setToolsState });

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

  if (isLoading) {
    return (
      <div className="box-border flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 items-center justify-center bg-extension-bg-dark">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="box-border flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-extension-bg-dark text-slate-100">
      {/* Header */}
      <header className="popup-header flex min-w-0 shrink-0 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center shadow-[0_4px_10px_rgba(79,70,229,0.4)]">
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

          <div className="min-w-0">
            <h1 className="truncate font-bold text-sm logo-text">FrontendDevHelper</h1>
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
              btn-icon shrink-0 text-xs px-2 w-auto gap-1
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
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {activeTab === 'tools' && (
          <ToolsTab
            toolsState={toolsState}
            showAdvancedTools={showAdvancedTools}
            setShowAdvancedTools={setShowAdvancedTools}
            recommendedIds={recommendedIds}
            userPresets={userPresets}
            onToggleTool={handleToggleTool}
            onApplyPreset={handleApplyPreset}
            onApplyUserPreset={handleApplyUserPreset}
            onSaveUserPreset={handleSaveUserPreset}
            onDeleteUserPreset={handleDeleteUserPreset}
            onOpenSettings={handleOpenSettings}
            onOpenPanel={handleOpenPanel}
          />
        )}
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'inspector' && <InspectorTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Footer */}
      <footer className="popup-footer flex min-w-0 shrink-0 items-center justify-between gap-2 px-3 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-[10px] text-slate-500">v{EXTENSION_VERSION}</span>
          <span className="text-slate-600">•</span>
          <a
            href="https://github.com/rejisterjack/frontend-dev-helper"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-500 hover:text-primary- transition-colors flex items-center gap-0.5"
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

        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <button
            type="button"
            className="whitespace-nowrap text-[10px] text-slate-500 transition-colors hover:text-slate-300"
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
  );
};

export default Popup;
