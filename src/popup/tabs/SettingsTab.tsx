/**
 * Settings Tab
 *
 * Quick settings interface for the popup.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '@/types';
import { logger } from '@/utils/logger';

export const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.runtime.sendMessage({
          type: 'GET_SETTINGS',
          timestamp: Date.now(),
        });
        if (result?.data) {
          setSettings(result.data);
        }
      } catch (error) {
        logger.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleChange = async <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void> => {
    if (!settings) return;
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: updated,
        timestamp: Date.now(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      logger.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="box-border flex h-full min-h-0 w-full min-w-0 max-w-full items-center justify-center p-4">
        <div className="text-slate-500 text-sm">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="box-border h-full min-h-0 w-full min-w-0 max-w-full space-y-6 overflow-x-hidden overflow-y-auto p-4">
      {/* General Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">General</h3>

        <SettingRow label="Theme">
          <select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value as ExtensionSettings['theme'])}
            className="rounded border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </SettingRow>

        <SettingRow label="Auto-open DevTools">
          <Toggle
            checked={settings.autoOpenDevTools}
            onChange={(checked) => handleChange('autoOpenDevTools', checked)}
          />
        </SettingRow>

        <SettingRow label="Experimental Features">
          <Toggle
            checked={settings.experimentalFeatures ?? false}
            onChange={(checked) => handleChange('experimentalFeatures', checked)}
          />
        </SettingRow>
      </div>

      {/* AI Settings */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          AI Features
        </h3>

        <SettingRow label="Enable AI Analysis">
          <Toggle
            checked={settings.ai?.enabled ?? true}
            onChange={(checked) =>
              handleChange('ai', { ...settings.ai, enabled: checked } as ExtensionSettings['ai'])
            }
          />
        </SettingRow>

        <SettingRow label="Auto-analyze on page load">
          <Toggle
            checked={settings.ai?.autoAnalyze ?? false}
            onChange={(checked) =>
              handleChange('ai', {
                ...settings.ai,
                autoAnalyze: checked,
              } as ExtensionSettings['ai'])
            }
          />
        </SettingRow>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Keyboard Shortcuts
        </h3>

        <ShortcutRow
          label="Open Popup"
          shortcut={settings.shortcuts?.openPopup || 'Ctrl+Shift+F'}
        />
        <ShortcutRow
          label="Toggle Inspector"
          shortcut={settings.shortcuts?.toggleInspector || 'Ctrl+Shift+I'}
        />
        <ShortcutRow
          label="Take Screenshot"
          shortcut={settings.shortcuts?.takeScreenshot || 'Ctrl+Shift+S'}
        />
        <ShortcutRow
          label="Open Command Palette"
          shortcut={settings.shortcuts?.openCommandPalette || 'Ctrl+Shift+P'}
        />
      </div>

      {/* Data Management */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data</h3>

        <button
          type="button"
          onClick={async () => {
            if (confirm('Clear all saved data? This cannot be undone.')) {
              await chrome.storage.local.clear();
              window.location.reload();
            }
          }}
          className="w-full rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/20"
        >
          Clear All Data
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-700 pt-4">
        <span className="text-xs text-slate-500">
          {saving ? 'Saving...' : saved ? 'Saved!' : ''}
        </span>
        <button
          type="button"
          onClick={() => {
            if (chrome.runtime.openOptionsPage) {
              chrome.runtime.openOptionsPage();
            } else {
              chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
            }
          }}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          Open Full Options
          <svg
            aria-hidden="true"
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Sub-components
const SettingRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex min-w-0 items-center justify-between gap-3 py-2">
    <span className="min-w-0 flex-1 text-sm text-slate-300">{label}</span>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
      checked ? 'bg-indigo-600' : 'bg-slate-600'
    }`}
  >
    <span
      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
        checked ? 'left-5' : 'left-0.5'
      }`}
    />
  </button>
);

const ShortcutRow: React.FC<{
  label: string;
  shortcut: string;
}> = ({ label, shortcut }) => (
  <div className="flex min-w-0 items-center justify-between gap-2 py-1">
    <span className="min-w-0 flex-1 text-sm text-slate-400">{label}</span>
    <kbd className="max-w-[55%] shrink-0 break-words rounded bg-slate-700 px-2 py-1 text-right font-mono text-xs text-slate-300">
      {shortcut}
    </kbd>
  </div>
);

export default SettingsTab;
