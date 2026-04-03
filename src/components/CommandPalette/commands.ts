/**
 * Command Palette Commands Registry
 *
 * Tool toggles are generated from TOOL_METADATA (see tool-catalog).
 * Presets and global actions are defined here.
 */

import { MESSAGE_TYPES, TOOL_IDS } from '@/constants';
import { getToolMessagePrefix } from '@/constants/tool-messages';
import type { Command, ToolId } from '@/types';
import { applyBuiltinPreset, applyUserPreset } from '@/utils/apply-preset';
import { logger } from '@/utils/logger';
import { BUILTIN_TOOL_PRESETS, buildToolToggleCommands } from '@/utils/tool-catalog';
import { getUserToolPresets } from '@/utils/storage';

const MAX_RECENT_COMMANDS = 10;
let recentCommandIds: string[] = [];

export function getRecentCommands(): string[] {
  return [...recentCommandIds];
}

export function addRecentCommand(commandId: string): void {
  recentCommandIds = recentCommandIds.filter((id) => id !== commandId);
  recentCommandIds.unshift(commandId);
  if (recentCommandIds.length > MAX_RECENT_COMMANDS) {
    recentCommandIds = recentCommandIds.slice(0, MAX_RECENT_COMMANDS);
  }
}

export function clearRecentCommands(): void {
  recentCommandIds = [];
}

async function toggleTool(toolId: ToolId): Promise<void> {
  const prefix = getToolMessagePrefix(toolId);
  if (!prefix) return;
  try {
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TOGGLE_TOOL,
      payload: { toolId },
    });
  } catch (error) {
    logger.error(`[CommandPalette] Failed to toggle tool ${toolId}:`, error);
  }
}

function buildPresetCommands(): Command[] {
  return BUILTIN_TOOL_PRESETS.map((p) => ({
    id: `preset-${p.id}`,
    title: `Preset: ${p.name}`,
    description: p.description,
    category: 'action' as const,
    icon: '📋',
    keywords: ['preset', 'bundle', 'profile', ...p.name.toLowerCase().split(/\s+/), p.id],
    execute: () => {
      void applyBuiltinPreset(p.id);
    },
  }));
}

async function buildUserPresetCommands(): Promise<Command[]> {
  const presets = await getUserToolPresets();
  return presets.map((p) => ({
    id: `user-preset-${p.id}`,
    title: `My preset: ${p.name}`,
    description: `${p.toolIds.length} tools`,
    category: 'action' as const,
    icon: '⭐',
    keywords: ['preset', 'user', 'bundle', ...p.name.toLowerCase().split(/\s+/), p.id],
    execute: () => {
      void applyUserPreset(p.id);
    },
  }));
}

function buildStaticCommands(): Command[] {
  return [
    {
      id: 'reset-all-tools',
      title: 'Reset All Tools',
      description: 'Disable all active tools',
      icon: '🔄',
      category: 'action',
      keywords: ['reset', 'disable', 'clear', 'all', 'tools'],
      execute: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'DISABLE_ALL_TOOLS' });
        }
      },
    },
    {
      id: 'capture-screenshot',
      title: 'Capture Screenshot',
      description: 'Take a screenshot of the current page',
      icon: '📷',
      category: 'action',
      keywords: ['screenshot', 'capture', 'image', 'save'],
      execute: async () => {
        const dataUrl = await chrome.tabs.captureVisibleTab();
        const link = document.createElement('a');
        link.download = `screenshot-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      },
    },
    {
      id: 'generate-site-report',
      title: 'Generate Site Report',
      description: 'Create comprehensive site analysis',
      icon: '📋',
      category: 'action',
      keywords: ['report', 'analysis', 'generate', 'audit', 'export'],
      execute: () => {
        void toggleTool(TOOL_IDS.SITE_REPORT);
      },
    },
    {
      id: 'export-report-json',
      title: 'Export Report as JSON',
      description: 'Export current analysis as JSON file',
      icon: '📤',
      category: 'action',
      keywords: ['export', 'json', 'save', 'download', 'data'],
      execute: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_REPORT', format: 'json' });
        }
      },
    },
    {
      id: 'export-report-pdf',
      title: 'Export Report as PDF',
      description: 'Export current analysis as PDF file',
      icon: '📄',
      category: 'action',
      keywords: ['export', 'pdf', 'save', 'download', 'print'],
      execute: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, { type: 'EXPORT_REPORT', format: 'pdf' });
        }
      },
    },
    {
      id: 'copy-page-info',
      title: 'Copy Page Info',
      description: 'Copy page metadata to clipboard',
      icon: '📋',
      category: 'action',
      keywords: ['copy', 'page', 'info', 'metadata', 'clipboard'],
      execute: async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          const info = `Title: ${tab.title}\nURL: ${tab.url}\nResolution: ${window.innerWidth}x${window.innerHeight}`;
          await navigator.clipboard.writeText(info);
        }
      },
    },
    {
      id: 'open-settings',
      title: 'Open Settings',
      description: 'Open extension settings page',
      icon: '⚙️',
      category: 'setting',
      keywords: ['settings', 'options', 'preferences', 'configuration'],
      execute: () => {
        chrome.runtime.openOptionsPage();
      },
    },
    {
      id: 'toggle-dark-mode',
      title: 'Toggle Dark Mode',
      description: 'Switch between light and dark theme',
      icon: '🌓',
      category: 'setting',
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance'],
      execute: async () => {
        const result = await chrome.storage.local.get('settings');
        const settings = result.settings || {};
        settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
        await chrome.storage.local.set({ settings });
      },
    },
    {
      id: 'open-keyboard-shortcuts',
      title: 'Open Keyboard Shortcuts',
      description: 'View and customize keyboard shortcuts',
      icon: '⌨️',
      category: 'setting',
      keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys', 'commands'],
      execute: () => {
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      },
    },
    {
      id: 'open-popup',
      title: 'Open Extension Popup',
      description: 'Open the main extension popup',
      shortcut: 'Ctrl+Shift+F',
      icon: '🚀',
      category: 'navigation',
      keywords: ['popup', 'open', 'main', 'window'],
      execute: () => {
        chrome.action.openPopup();
      },
    },
    {
      id: 'open-devtools-panel',
      title: 'Open DevTools Panel',
      description: 'Open FrontendDevHelper in DevTools',
      icon: '🛠️',
      category: 'navigation',
      keywords: ['devtools', 'panel', 'developer', 'tools', 'inspect'],
      execute: () => {
        chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
          if (tab?.id) {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                alert('Press F12 to open DevTools, then look for the FrontendDevHelper panel');
              },
            });
          }
        });
      },
    },
    {
      id: 'view-documentation',
      title: 'View Documentation',
      description: 'Open the documentation website',
      icon: '📖',
      category: 'navigation',
      keywords: ['docs', 'documentation', 'help', 'guide', 'readme'],
      execute: () => {
        chrome.tabs.create({
          url: 'https://github.com/rejisterjack/frontend-dev-helper#readme',
        });
      },
    },
    {
      id: 'report-issue',
      title: 'Report Issue',
      description: 'Report a bug or request a feature',
      icon: '🐛',
      category: 'navigation',
      keywords: ['issue', 'bug', 'report', 'feature', 'request'],
      execute: () => {
        chrome.tabs.create({
          url: 'https://github.com/rejisterjack/frontend-dev-helper/issues/new',
        });
      },
    },
  ];
}

export function getAllCommands(): Command[] {
  return [...buildPresetCommands(), ...buildStaticCommands(), ...buildToolToggleCommands()];
}

/** Includes user-saved presets (async). */
export async function getAllPaletteCommands(): Promise<Command[]> {
  const user = await buildUserPresetCommands();
  return [...getAllCommands(), ...user];
}

export function searchCommands(query: string): Command[] {
  const commands = getAllCommands();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    const recent = recentCommandIds
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined);

    const others = commands.filter((c) => !recentCommandIds.includes(c.id));
    return [...recent, ...others];
  }

  const queryTerms = normalizedQuery.split(/\s+/);

  return commands
    .map((command) => {
      const searchText =
        `${command.title} ${command.description} ${command.keywords.join(' ')}`.toLowerCase();
      const matchCount = queryTerms.filter((term) => searchText.includes(term)).length;
      return { command, matchCount };
    })
    .filter(({ matchCount }) => matchCount > 0)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return a.command.title.localeCompare(b.command.title);
    })
    .map(({ command }) => command);
}

export function getCommandById(id: string): Command | undefined {
  return getAllCommands().find((cmd) => cmd.id === id);
}

export async function executeCommandById(id: string): Promise<boolean> {
  if (id.startsWith('user-preset-')) {
    const presetId = id.slice('user-preset-'.length);
    try {
      const ok = await applyUserPreset(presetId);
      if (ok) addRecentCommand(id);
      return ok;
    } catch (error) {
      logger.error('[CommandPalette] User preset failed:', error);
      return false;
    }
  }

  const command = getCommandById(id);
  if (!command) return false;

  try {
    await command.execute();
    addRecentCommand(id);
    return true;
  } catch (error) {
    logger.error('[CommandPalette] Failed to execute command:', error);
    return false;
  }
}
