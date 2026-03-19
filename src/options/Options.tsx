/**
 * Options Page Component
 * 
 * Full-page settings interface for the extension.
 */

import React, { useState, useEffect } from 'react';
import type { ExtensionSettings, FeatureToggles, DEFAULT_FEATURE_TOGGLES } from '@/types';

export const Options: React.FC = () => {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [features, setFeatures] = useState<FeatureToggles | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (): Promise<void> => {
    try {
      const [settingsRes, featuresRes] = await Promise.all([
        chrome.runtime.sendMessage({
          type: 'GET_SETTINGS',
          timestamp: Date.now(),
          id: crypto.randomUUID(),
        }),
        chrome.runtime.sendMessage({
          type: 'GET_FEATURES',
          timestamp: Date.now(),
          id: crypto.randomUUID(),
        }),
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes.data);
      }
      if (featuresRes.success) {
        setFeatures(featuresRes.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (): Promise<void> => {
    if (!settings) return;

    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dev-bg">
        <div className="text-dev-muted">Loading...</div>
      </div>
    );
  }

  if (!settings || !features) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dev-bg">
        <div className="text-dev-error">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dev-bg text-dev-text">
      <header className="border-b border-dev-border bg-dev-surface px-8 py-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-white">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <p className="text-dev-muted">Extension Settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-3">
            <nav className="space-y-1">
              {[
                { id: 'general', label: 'General', icon: '⚙️' },
                { id: 'features', label: 'Features', icon: '🔧' },
                { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
                { id: 'advanced', label: 'Advanced', icon: '🔬' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary-600/10 text-primary-400'
                      : 'text-dev-muted hover:bg-dev-surface hover:text-dev-text'
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
              <GeneralSection settings={settings} setSettings={setSettings} />
            )}
            {activeSection === 'features' && (
              <FeaturesSection features={features} setFeatures={setFeatures} />
            )}
            {activeSection === 'shortcuts' && (
              <ShortcutsSection settings={settings} setSettings={setSettings} />
            )}
            {activeSection === 'advanced' && <AdvancedSection />}

            <div className="mt-8 flex items-center justify-between border-t border-dev-border pt-6">
              <button
                onClick={async () => {
                  if (confirm('Reset all settings to default?')) {
                    await chrome.storage.local.clear();
                    window.location.reload();
                  }
                }}
                className="text-sm text-dev-error hover:underline"
              >
                Reset to Defaults
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-6 py-2 font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Section Components
const GeneralSection: React.FC<{
  settings: ExtensionSettings;
  setSettings: (s: ExtensionSettings) => void;
}> = ({ settings, setSettings }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">General Settings</h2>

    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg bg-dev-surface p-4">
        <div>
          <div className="font-medium">Theme</div>
          <div className="text-sm text-dev-muted">Choose your preferred color scheme</div>
        </div>
        <select
          value={settings.theme}
          onChange={(e) => setSettings({ ...settings, theme: e.target.value as ExtensionSettings['theme'] })}
          className="rounded border border-dev-border bg-dev-bg px-4 py-2"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-dev-surface p-4">
        <div>
          <div className="font-medium">Auto-open DevTools</div>
          <div className="text-sm text-dev-muted">Automatically open DevTools panel on page load</div>
        </div>
        <input
          type="checkbox"
          checked={settings.autoOpenDevTools}
          onChange={(e) => setSettings({ ...settings, autoOpenDevTools: e.target.checked })}
          className="h-5 w-5"
        />
      </div>
    </div>
  </div>
);

const FeaturesSection: React.FC<{
  features: FeatureToggles;
  setFeatures: (f: FeatureToggles) => void;
}> = ({ features, setFeatures }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Feature Configuration</h2>

    <div className="grid gap-4">
      {Object.entries(features).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-lg bg-dev-surface p-4">
          <div>
            <div className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
          </div>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => setFeatures({ ...features, [key]: e.target.checked })}
            className="h-5 w-5"
          />
        </div>
      ))}
    </div>
  </div>
);

const ShortcutsSection: React.FC<{
  settings: ExtensionSettings;
  setSettings: (s: ExtensionSettings) => void;
}> = ({ settings, setSettings }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>

    <div className="space-y-4">
      {Object.entries(settings.shortcuts).map(([key, value]) => (
        <div key={key} className="flex items-center justify-between rounded-lg bg-dev-surface p-4">
          <div className="font-medium capitalize">{key}</div>
          <input
            type="text"
            value={value}
            onChange={(e) =>
              setSettings({
                ...settings,
                shortcuts: { ...settings.shortcuts, [key]: e.target.value },
              })
            }
            className="w-48 rounded border border-dev-border bg-dev-bg px-3 py-2 text-center font-mono"
          />
        </div>
      ))}
    </div>
  </div>
);

const AdvancedSection: React.FC = () => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold">Advanced Settings</h2>

    <div className="space-y-4">
      <div className="rounded-lg border border-dev-border p-4">
        <h3 className="mb-2 font-medium">Export Settings</h3>
        <p className="mb-3 text-sm text-dev-muted">Download your extension settings as a JSON file</p>
        <button
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
          className="rounded-lg bg-dev-surface px-4 py-2 text-sm hover:bg-dev-border"
        >
          Export Settings
        </button>
      </div>

      <div className="rounded-lg border border-dev-border p-4">
        <h3 className="mb-2 font-medium">Import Settings</h3>
        <p className="mb-3 text-sm text-dev-muted">Restore settings from a JSON file</p>
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
                } catch (error) {
                  alert('Invalid settings file');
                }
              };
              reader.readAsText(file);
            }
          }}
          className="block w-full text-sm text-dev-muted file:mr-4 file:rounded-lg file:border-0 file:bg-dev-surface file:px-4 file:py-2 file:text-dev-text"
        />
      </div>
    </div>
  </div>
);
