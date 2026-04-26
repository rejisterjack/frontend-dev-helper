/**
 * Options Page Component
 *
 * Full-page settings interface for the extension with:
 * - General Settings
 * - AI/LLM Configuration
 * - Per-Tool Settings
 * - Keyboard Shortcuts
 * - Advanced Options
 */

import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { TOOL_IDS, TOOL_METADATA, type ToolId } from '@/constants';
import { DEFAULT_LLM_CONFIG, type ExtensionSettings, type LLMConfig } from '@/types';
import { OPENROUTER_FREE_MODELS } from '@/types';
import {
  clearDiagnosticCounts,
  getDiagnosticCounts,
  getUiPrefs,
  setUiPrefs,
} from '../utils/storage';
import { logger } from '@/utils/logger';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [llmConfig, setLLMConfig] = useState<LLMConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const [saveMessage, setSaveMessage] = useState<{ message: string; isError: boolean } | null>(
    null
  );

  const loadData = useCallback(async (): Promise<void> => {
    try {
      const [settingsRes, llmRes] = await Promise.all([
        chrome.runtime.sendMessage({
          type: 'GET_SETTINGS',
          timestamp: Date.now(),
        }),
        chrome.runtime.sendMessage({
          type: 'LLM_GET_CONFIG',
          timestamp: Date.now(),
        }),
      ]);

      if (settingsRes?.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      // MessageRouter wraps the handler return value as { success, data: result }
      const llmData = llmRes?.success
        ? (llmRes.data as { config?: LLMConfig } | undefined)
        : undefined;
      if (llmData?.config) {
        setLLMConfig(llmData.config);
      } else {
        setLLMConfig({ ...DEFAULT_LLM_CONFIG });
      }
    } catch (error) {
      logger.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveSettings = async (): Promise<void> => {
    if (!settings) return;

    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings,
        timestamp: Date.now(),
      });
      showSaveMessage('Settings saved successfully!');
    } catch (error) {
      logger.error('Failed to save settings:', error);
      showSaveMessage('Failed to save settings', true);
    } finally {
      setSaving(false);
    }
  };

  const saveLLMConfig = async (config: LLMConfig): Promise<void> => {
    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'LLM_UPDATE_CONFIG',
        payload: config,
        timestamp: Date.now(),
      });
      setLLMConfig(config);
      showSaveMessage('AI configuration saved!');
    } catch (error) {
      logger.error('Failed to save LLM config:', error);
      showSaveMessage('Failed to save AI configuration', true);
    } finally {
      setSaving(false);
    }
  };

  const showSaveMessage = (message: string, isError = false) => {
    setSaveMessage({ message, isError });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-red-400">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900 px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
              <svg
                aria-hidden="true"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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
              <h1 className="text-2xl font-bold">FrontendDevHelper</h1>
              <p className="text-slate-400">Extension Settings</p>
            </div>
          </div>
        </div>
      </header>

      {/* Save Message Toast */}
      {saveMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg transition-all ${
            saveMessage.isError ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
          }`}
        >
          {saveMessage.message}
        </div>
      )}

      <main className="mx-auto max-w-6xl px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1 sticky top-8">
              {[
                { id: 'general', label: 'General', icon: '⚙️' },
                { id: 'ai', label: 'AI Configuration', icon: '🤖' },
                { id: 'tools', label: 'Tool Settings', icon: '🔧' },
                { id: 'shortcuts', label: 'In-App Hotkeys', icon: '⌨️' },
                { id: 'advanced', label: 'Advanced', icon: '🔬' },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-indigo-600/10 text-indigo-400'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="col-span-9">
            {activeSection === 'general' && (
              <GeneralSection settings={settings} setSettings={setSettings} onSave={saveSettings} />
            )}
            {activeSection === 'ai' && llmConfig && (
              <AISection config={llmConfig} onUpdate={saveLLMConfig} />
            )}
            {activeSection === 'tools' && <ToolsSection />}
            {activeSection === 'shortcuts' && (
              <ShortcutsSection
                settings={settings}
                setSettings={setSettings}
                onSave={saveSettings}
              />
            )}
            {activeSection === 'advanced' && <AdvancedSection />}

            {/* Save Button */}
            {activeSection !== 'ai' && (
              <div className="mt-8 flex items-center justify-between border-t border-slate-800 pt-6">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm('Reset all settings to default?')) {
                      await chrome.storage.local.clear();
                      window.location.reload();
                    }
                  }}
                  className="text-sm text-red-400 hover:underline"
                >
                  Reset to Defaults
                </button>
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// ============================================
// General Settings Section
// ============================================

const GeneralSection: React.FC<{
  settings: ExtensionSettings;
  setSettings: (s: ExtensionSettings) => void;
  onSave: () => void;
}> = ({ settings, setSettings }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">General Settings</h2>

    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
        <div>
          <div className="font-medium">Theme</div>
          <div className="text-sm text-slate-400">Choose your preferred color scheme</div>
        </div>
        <select
          value={settings.theme}
          onChange={(e) =>
            setSettings({ ...settings, theme: e.target.value as ExtensionSettings['theme'] })
          }
          className="rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
        <div>
          <div className="font-medium">Auto-open DevTools</div>
          <div className="text-sm text-slate-400">
            Automatically open DevTools panel on page load
          </div>
        </div>
        <Toggle
          checked={settings.autoOpenDevTools}
          onChange={(checked) => setSettings({ ...settings, autoOpenDevTools: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
        <div>
          <div className="font-medium">Auto-save Tool State</div>
          <div className="text-sm text-slate-400">Remember which tools are enabled per site</div>
        </div>
        <Toggle
          checked={settings.autoSave}
          onChange={(checked) => setSettings({ ...settings, autoSave: checked })}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
        <div>
          <div className="font-medium">Experimental Features</div>
          <div className="text-sm text-slate-400">
            Enable beta features that are still in development
          </div>
        </div>
        <Toggle
          checked={settings.experimentalFeatures ?? false}
          onChange={(checked) => setSettings({ ...settings, experimentalFeatures: checked })}
        />
      </div>
    </div>
  </div>
);

// ============================================
// AI/LLM Configuration Section
// ============================================

const AISection: React.FC<{
  config: LLMConfig;
  onUpdate: (config: LLMConfig) => void;
}> = ({ config, onUpdate }) => {
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [localConfig, setLocalConfig] = useState(config);

  const testConnection = async () => {
    setTestStatus('testing');
    try {
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          Authorization: `Bearer ${localConfig.apiKey}`,
        },
      });
      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        setTestStatus('error');
      }
    } catch {
      setTestStatus('error');
    }
  };

  const handleSave = () => {
    onUpdate(localConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">AI Configuration</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            localConfig.enabled
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-slate-700 text-slate-400'
          }`}
        >
          {localConfig.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <p className="text-slate-400 text-sm">
        Configure AI-powered analysis features. Your API key is stored securely in browser storage.
      </p>

      <div className="space-y-4">
        {/* Enable AI Toggle */}
        <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
          <div>
            <div className="font-medium">Enable AI Analysis</div>
            <div className="text-sm text-slate-400">
              Use AI to analyze pages and suggest improvements
            </div>
          </div>
          <Toggle
            checked={localConfig.enabled}
            onChange={(checked) => setLocalConfig({ ...localConfig, enabled: checked })}
          />
        </div>

        {localConfig.enabled && (
          <>
            {/* Provider Selection */}
            <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
              <label htmlFor="fdh-ai-provider" className="block font-medium mb-2">
                AI Provider
              </label>
              <select
                id="fdh-ai-provider"
                value={localConfig.provider}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    provider: e.target.value as LLMConfig['provider'],
                  })
                }
                className="w-full rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="openrouter">OpenRouter (Recommended)</option>
                <option value="custom">Custom Provider</option>
              </select>
            </div>

            {/* API Key Input */}
            <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
              <label htmlFor="fdh-ai-api-key" className="block font-medium mb-2">
                API Key
              </label>
              <div className="flex gap-2">
                <input
                  id="fdh-ai-api-key"
                  type="password"
                  value={localConfig.apiKey}
                  onChange={(e) => setLocalConfig({ ...localConfig, apiKey: e.target.value })}
                  placeholder="Enter your OpenRouter API key"
                  className="flex-1 rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={testConnection}
                  disabled={!localConfig.apiKey || testStatus === 'testing'}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    testStatus === 'success'
                      ? 'bg-emerald-600 text-white'
                      : testStatus === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  {testStatus === 'testing'
                    ? 'Testing...'
                    : testStatus === 'success'
                      ? '✓ Connected'
                      : testStatus === 'error'
                        ? '✗ Failed'
                        : 'Test Connection'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            {/* Model Selection */}
            <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
              <label htmlFor="fdh-ai-model" className="block font-medium mb-2">
                Model
              </label>
              <select
                id="fdh-ai-model"
                value={localConfig.model}
                onChange={(e) => setLocalConfig({ ...localConfig, model: e.target.value })}
                className="w-full rounded border border-slate-700 bg-slate-800 px-4 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <optgroup label="Free Models">
                  {OPENROUTER_FREE_MODELS.map((model: { id: string; name: string }) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Free Models Only Toggle */}
            <div className="flex items-center justify-between rounded-lg bg-slate-900 p-4 border border-slate-800">
              <div>
                <div className="font-medium">Use Free Models Only</div>
                <div className="text-sm text-slate-400">
                  Only use free-tier models to avoid charges
                </div>
              </div>
              <Toggle
                checked={localConfig.useFreeModelsOnly}
                onChange={(checked) =>
                  setLocalConfig({ ...localConfig, useFreeModelsOnly: checked })
                }
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Save AI Configuration
              </button>
            </div>
          </>
        )}

        {/* AI Categories */}
        {localConfig.enabled && (
          <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
            <h3 className="font-medium mb-3">Analysis Categories</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'accessibility', label: 'Accessibility', icon: '♿' },
                { key: 'performance', label: 'Performance', icon: '⚡' },
                { key: 'seo', label: 'SEO', icon: '🔍' },
                { key: 'bestPractice', label: 'Best Practices', icon: '✅' },
                { key: 'security', label: 'Security', icon: '🔒' },
              ].map((cat) => (
                <label
                  key={cat.key}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={
                      (localConfig as unknown as Record<string, Record<string, boolean>>)
                        .categories?.[cat.key] ?? true
                    }
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        categories: {
                          ...(localConfig as unknown as Record<string, Record<string, boolean>>)
                            .categories,
                          [cat.key]: e.target.checked,
                        },
                      } as LLMConfig)
                    }
                    className="rounded border-slate-600 bg-slate-700 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Tools Settings Section
// ============================================

const ToolsSection: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);

  const tools = Object.values(TOOL_IDS).map((id) => TOOL_METADATA[id]);

  if (selectedTool) {
    return <ToolSettings toolId={selectedTool} onBack={() => setSelectedTool(null)} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Tool Settings</h2>
      <p className="text-slate-400 text-sm">
        Configure individual tool preferences. Click a tool to customize its settings.
      </p>

      <div className="grid gap-3">
        {tools.map((tool) => (
          <button
            type="button"
            key={tool.id}
            onClick={() => setSelectedTool(tool.id)}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xl">
                <span>{getToolIcon(tool.icon)}</span>
              </div>
              <div>
                <div className="font-medium">{tool.name}</div>
                <div className="text-sm text-slate-400">{tool.description}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {tool.hasSettings && (
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400">
                  Customizable
                </span>
              )}
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Tool Settings Detail
const ToolSettings: React.FC<{ toolId: ToolId; onBack: () => void }> = ({ toolId, onBack }) => {
  const tool = TOOL_METADATA[toolId];
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load tool-specific settings
    const loadSettings = async () => {
      const result = await chrome.storage.local.get(`tool_settings_${toolId}`);
      setSettings(result[`tool_settings_${toolId}`] || {});
    };
    loadSettings();
  }, [toolId]);

  const saveSettings = async () => {
    await chrome.storage.local.set({ [`tool_settings_${toolId}`]: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderToolSpecificSettings = () => {
    switch (toolId) {
      case TOOL_IDS.DOM_OUTLINER:
        return (
          <>
            <SettingRow label="Show Element Labels">
              <Toggle
                checked={(settings.showLabels as boolean) ?? true}
                onChange={(checked) => setSettings({ ...settings, showLabels: checked })}
              />
            </SettingRow>
            <SettingRow label="Outline Opacity">
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={(settings.opacity as number) ?? 0.15}
                onChange={(e) => setSettings({ ...settings, opacity: parseFloat(e.target.value) })}
                className="w-32"
              />
              <span className="text-sm text-slate-400 w-12 text-right">
                {Math.round(((settings.opacity as number) ?? 0.15) * 100)}%
              </span>
            </SettingRow>
          </>
        );
      case TOOL_IDS.COLOR_PICKER:
        return (
          <>
            <SettingRow label="Default Format">
              <select
                value={(settings.format as string) ?? 'hex'}
                onChange={(e) => setSettings({ ...settings, format: e.target.value })}
                className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm"
              >
                <option value="hex">HEX</option>
                <option value="rgb">RGB</option>
                <option value="hsl">HSL</option>
              </select>
            </SettingRow>
            <SettingRow label="Copy on Pick">
              <Toggle
                checked={(settings.copyOnPick as boolean) ?? true}
                onChange={(checked) => setSettings({ ...settings, copyOnPick: checked })}
              />
            </SettingRow>
          </>
        );
      default:
        return (
          <div className="text-slate-500 text-center py-8">
            No customizable settings for this tool yet.
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-xl font-semibold">{tool.name} Settings</h2>
      </div>

      <div className="rounded-lg bg-slate-900 p-4 border border-slate-800 space-y-4">
        {renderToolSpecificSettings()}
      </div>

      <div className="flex justify-between items-center">
        <span className={`text-sm ${saved ? 'text-emerald-400' : 'text-transparent'}`}>
          ✓ Settings saved
        </span>
        <button
          type="button"
          onClick={saveSettings}
          className="rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
};

// ============================================
// Shortcuts Section
// ============================================

const ShortcutsSection: React.FC<{
  settings: ExtensionSettings;
  setSettings: (s: ExtensionSettings) => void;
  onSave: () => void;
}> = ({ settings, setSettings }) => {
  const [recording, setRecording] = useState<string | null>(null);

  const updateShortcut = (key: string, shortcut: string) => {
    setSettings({
      ...settings,
      shortcuts: { ...settings.shortcuts, [key]: shortcut },
    });
  };

  const recordShortcut = (key: string) => {
    setRecording(key);
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const keys: string[] = [];
      if (e.ctrlKey) keys.push('Ctrl');
      if (e.altKey) keys.push('Alt');
      if (e.shiftKey) keys.push('Shift');
      if (e.metaKey) keys.push('Command');
      if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        keys.push(e.key.toUpperCase());
      }
      if (keys.length > 0) {
        updateShortcut(key, keys.join('+'));
      }
      setRecording(null);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('keydown', handler);
  };

  const shortcuts = [
    { key: 'openPopup', label: 'Open Popup' },
    { key: 'toggleInspector', label: 'Toggle Element Inspector' },
    { key: 'takeScreenshot', label: 'Take Screenshot' },
    { key: 'openCommandPalette', label: 'Open Command Palette' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">In-App Hotkeys</h2>
      <p className="text-slate-400 text-sm">
        These hotkeys work within web pages. Click to record a new combination.
        Use <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">Shift+Alt+Key</kbd> pattern to avoid conflicts.
      </p>

      <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-500/30">
        <p className="text-sm text-indigo-300">
          <strong>💡 Tip:</strong> To change browser-level shortcuts (like Alt+P), visit{' '}
          <a
            href="chrome://extensions/shortcuts"
            onClick={(e) => {
              e.preventDefault();
              chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            }}
            className="underline hover:text-indigo-200"
          >
            chrome://extensions/shortcuts
          </a>
        </p>
      </div>

      <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-600/30">
        <p className="text-sm text-amber-200">
          <strong>Conflicts:</strong> The command palette shortcut (Ctrl+Shift+P / ⌘⇧P) matches VS Code when the
          page has focus. Rebind it under chrome://extensions/shortcuts if it gets in the way.
        </p>
      </div>

      <div className="space-y-3">
        {shortcuts.map(({ key, label }) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-lg bg-slate-900 border border-slate-800"
          >
            <span className="font-medium">{label}</span>
            <button
              type="button"
              onClick={() => recordShortcut(key)}
              className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                recording === key
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {recording === key ? 'Press keys...' : settings.shortcuts?.[key] || 'Not set'}
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
        <h3 className="font-medium mb-2">Browser & extension shortcuts</h3>
        <p className="text-sm text-slate-400 mb-3">
          Chromium only allows <strong>four</strong> default keys in the extension manifest. Ours: open
          popup, command palette, DOM outliner, and disable-all. Edit them in{' '}
          <a
            href="chrome://extensions/shortcuts"
            onClick={(e) => {
              e.preventDefault();
              chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            }}
            className="text-indigo-400 underline hover:text-indigo-200"
          >
            chrome://extensions/shortcuts
          </a>
          . Assign the other commands (e.g. <kbd className="px-1 rounded bg-slate-800">Alt+S</kbd> for
          Spacing) there—same list as the extension’s command names.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Open popup / extension</span>
            <kbd className="px-2 py-1 rounded bg-slate-800 font-mono">Ctrl+Shift+F · ⌘⇧F</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Command palette</span>
            <kbd className="px-2 py-1 rounded bg-slate-800 font-mono">Ctrl+Shift+P · ⌘⇧P</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">DOM Outliner</span>
            <kbd className="px-2 py-1 rounded bg-slate-800 font-mono">Alt+P</kbd>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Disable all tools</span>
            <kbd className="px-2 py-1 rounded bg-slate-800 font-mono">Alt+Shift+D</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Advanced Section
// ============================================

const AdvancedSection: React.FC = () => {
  const [diagOn, setDiagOn] = useState(false);
  const [hudOn, setHudOn] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    void (async () => {
      const p = await getUiPrefs();
      setDiagOn(p.diagnosticsOptIn);
      setHudOn(p.showActiveToolsHud);
      setCounts(await getDiagnosticCounts());
    })();
  }, []);

  const toggleDiag = async (on: boolean) => {
    setDiagOn(on);
    await setUiPrefs({ diagnosticsOptIn: on });
  };

  const toggleHud = async (on: boolean) => {
    setHudOn(on);
    await setUiPrefs({ showActiveToolsHud: on });
  };

  const refreshCounts = async () => {
    setCounts(await getDiagnosticCounts());
  };

  return (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Advanced Settings</h2>

    <div className="space-y-4">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 font-medium">On-page active tools HUD</h3>
        <p className="mb-3 text-sm text-slate-400">
          Small corner badge listing enabled tool names and a disable-all control. Reload pages after toggling.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={hudOn}
            onChange={(e) => void toggleHud(e.target.checked)}
            className="rounded border-slate-600"
          />
          Show active tools HUD on web pages
        </label>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 font-medium">Local diagnostics (opt-in)</h3>
        <p className="mb-3 text-sm text-slate-400">
          Count error events on this device only. Nothing is sent to a server. Useful when debugging the
          extension yourself.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300 mb-3">
          <input
            type="checkbox"
            checked={diagOn}
            onChange={(e) => void toggleDiag(e.target.checked)}
            className="rounded border-slate-600"
          />
          Record local diagnostic counts
        </label>
        <pre className="text-xs bg-slate-950 p-3 rounded-md text-slate-400 overflow-x-auto mb-3">
          {Object.keys(counts).length ? JSON.stringify(counts, null, 2) : '{}'}
        </pre>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void refreshCounts()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
          >
            Refresh counts
          </button>
          <button
            type="button"
            onClick={() => {
              void clearDiagnosticCounts().then(() => refreshCounts());
            }}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
          >
            Clear counts
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 font-medium">Export Settings</h3>
        <p className="mb-3 text-sm text-slate-400">
          Download your extension settings as a JSON file
        </p>
        <button
          type="button"
          onClick={() => {
            chrome.storage.local.get(null, (data) => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'frontend-dev-helper-settings.json';
              a.click();
              URL.revokeObjectURL(url);
            });
          }}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 transition-colors"
        >
          Export Settings
        </button>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-2 font-medium">Import Settings</h3>
        <p className="mb-3 text-sm text-slate-400">Restore settings from a JSON file</p>
        <input
          type="file"
          accept=".json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (event) => {
                try {
                  const data = JSON.parse(event.target?.result as string);
                  chrome.storage.local.set(data, () => {
                    window.location.reload();
                  });
                } catch (_error) {
                  alert('Invalid settings file');
                }
              };
              reader.readAsText(file);
            }
          }}
          className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-200"
        />
      </div>

      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
        <h3 className="mb-2 font-medium text-red-400">Danger Zone</h3>
        <p className="mb-3 text-sm text-slate-400">
          These actions cannot be undone. Use with caution.
        </p>
        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                'WARNING: This will clear ALL extension data including settings, favorites, and saved states. Are you sure?'
              )
            ) {
              chrome.storage.local.clear();
              window.location.reload();
            }
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 transition-colors"
        >
          Reset Everything
        </button>
      </div>
    </div>
  </div>
  );
};

// ============================================
// Shared Components
// ============================================

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 rounded-full transition-colors ${
      checked ? 'bg-indigo-600' : 'bg-slate-600'
    }`}
  >
    <span
      className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? 'left-6' : 'left-1'
      }`}
    />
  </button>
);

const SettingRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-300">{label}</span>
    <div className="flex items-center gap-3">{children}</div>
  </div>
);

// Helper to convert icon names to emojis
function getToolIcon(iconName: string): string {
  const iconMap: Record<string, string> = {
    'box-select': '📦',
    move: '↔️',
    type: '🔤',
    pipette: '🎨',
    ruler: '📏',
    monitor: '🖥️',
    scan: '🔍',
    eye: '👁️',
    grid: '⊞',
    layers: '📚',
    search: '🔎',
    activity: '📊',
    'mouse-pointer': '🖱️',
    maximize: '⬚',
    command: '⌘',
    database: '🗄️',
    crosshair: '🎯',
    'file-text': '📝',
    'git-branch': '🌿',
    accessibility: '♿',
    'file-bar-chart': '📈',
    code: '💻',
    camera: '📷',
    'play-circle': '▶️',
    smartphone: '📱',
    'check-circle': '✓',
    sparkles: '✨',
  };
  return iconMap[iconName] || '🔧';
}

export default Options;
