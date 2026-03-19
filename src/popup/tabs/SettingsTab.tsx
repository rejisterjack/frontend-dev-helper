/**
 * Settings Tab
 */

import React, { useState } from 'react';
import type { ExtensionSettings } from '@/types';

interface SettingsTabProps {
  settings: ExtensionSettings | null;
  onUpdate: (settings: ExtensionSettings) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ settings, onUpdate }) => {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-dev-muted">Loading settings...</div>
      </div>
    );
  }

  const handleChange = async <K extends keyof ExtensionSettings>(
    key: K,
    value: ExtensionSettings[K]
  ): Promise<void> => {
    const updated = { ...settings, [key]: value };
    onUpdate(updated);

    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: updated,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          General
        </h3>

        <SettingRow label="Theme">
          <select
            value={settings.theme}
            onChange={(e) => handleChange('theme', e.target.value as ExtensionSettings['theme'])}
            className="rounded border border-dev-border bg-dev-bg px-3 py-1.5 text-sm text-dev-text focus:border-primary-500 focus:outline-none"
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
            checked={settings.experimentalFeatures}
            onChange={(checked) => handleChange('experimentalFeatures', checked)}
          />
        </SettingRow>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Keyboard Shortcuts
        </h3>

        <ShortcutRow
          label="Open Popup"
          shortcut={settings.shortcuts.openPopup || 'Ctrl+Shift+F'}
        />
        <ShortcutRow
          label="Toggle Inspector"
          shortcut={settings.shortcuts.toggleInspector || 'Ctrl+Shift+I'}
        />
        <ShortcutRow
          label="Take Screenshot"
          shortcut={settings.shortcuts.takeScreenshot || 'Ctrl+Shift+S'}
        />
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-dev-muted">
          Data
        </h3>

        <button
          onClick={async () => {
            if (confirm('Clear all saved data? This cannot be undone.')) {
              await chrome.storage.local.clear();
              window.location.reload();
            }
          }}
          className="w-full rounded-lg border border-dev-error/30 bg-dev-error/10 py-2 text-sm text-dev-error transition-colors hover:bg-dev-error/20"
        >
          Clear All Data
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-dev-border pt-4">
        <span className="text-xs text-dev-muted">
          {saving ? 'Saving...' : saved ? 'Saved!' : ''}
        </span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300"
        >
          Open Full Options
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-dev-text">{label}</span>
    {children}
  </div>
);

const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative h-5 w-9 rounded-full transition-colors ${
      checked ? 'bg-primary-600' : 'bg-dev-border'
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
  <div className="flex items-center justify-between py-1">
    <span className="text-sm text-dev-muted">{label}</span>
    <kbd className="rounded bg-dev-border px-2 py-1 font-mono text-xs text-dev-text">
      {shortcut}
    </kbd>
  </div>
);
