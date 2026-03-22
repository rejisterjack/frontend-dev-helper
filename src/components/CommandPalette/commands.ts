/**
 * Command Palette Commands Registry
 *
 * Defines all available commands for the FrontendDevHelper command palette.
 * This includes tools, actions, settings, and navigation commands.
 */

import type { Command } from '@/types';
import { ToolType } from '@/types';
import { logger } from '@/utils/logger';

// Track command execution history
const MAX_RECENT_COMMANDS = 10;
let recentCommandIds: string[] = [];

/**
 * Get recent commands
 */
export function getRecentCommands(): string[] {
  return [...recentCommandIds];
}

/**
 * Add command to recent history
 */
export function addRecentCommand(commandId: string): void {
  recentCommandIds = recentCommandIds.filter((id) => id !== commandId);
  recentCommandIds.unshift(commandId);
  if (recentCommandIds.length > MAX_RECENT_COMMANDS) {
    recentCommandIds = recentCommandIds.slice(0, MAX_RECENT_COMMANDS);
  }
}

/**
 * Clear recent commands
 */
export function clearRecentCommands(): void {
  recentCommandIds = [];
}

/**
 * Toggle a tool by sending message to content script
 */
async function toggleTool(toolType: ToolType): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, {
        type: `${toolType.toUpperCase()}_TOGGLE`,
      });
    }
  } catch (error) {
    logger.error(`[CommandPalette] Failed to toggle tool ${toolType}:`, error);
  }
}



/**
 * Get all registered commands
 */
export function getAllCommands(): Command[] {
  const commands: Command[] = [
    // ============================================
    // Tools - Core
    // ============================================
    {
      id: 'toggle-dom-outliner',
      title: 'Toggle DOM Outliner',
      description: 'Show/hide color-coded element outlines',
      shortcut: 'Alt+P',
      icon: '🕸️',
      category: 'tool',
      keywords: ['dom', 'outline', 'pesticide', 'structure', 'border'],
      execute: () => toggleTool(ToolType.DOM_OUTLINER),
    },
    {
      id: 'toggle-spacing-visualizer',
      title: 'Toggle Spacing Visualizer',
      description: 'Show margins, padding, and gaps',
      shortcut: 'Alt+S',
      icon: '📐',
      category: 'tool',
      keywords: ['spacing', 'margin', 'padding', 'gap', 'layout'],
      execute: () => toggleTool(ToolType.SPACING_VISUALIZER),
    },
    {
      id: 'toggle-font-inspector',
      title: 'Toggle Font Inspector',
      description: 'Inspect typography and font stacks',
      shortcut: 'Alt+F',
      icon: '🔤',
      category: 'tool',
      keywords: ['font', 'typography', 'text', 'family', 'size'],
      execute: () => toggleTool(ToolType.FONT_INSPECTOR),
    },
    {
      id: 'toggle-color-picker',
      title: 'Toggle Color Picker',
      description: 'Pick colors from any element',
      shortcut: 'Alt+C',
      icon: '🎨',
      category: 'tool',
      keywords: ['color', 'picker', 'eyedropper', 'palette', 'hex'],
      execute: () => toggleTool(ToolType.COLOR_PICKER),
    },
    {
      id: 'toggle-pixel-ruler',
      title: 'Toggle Pixel Ruler',
      description: 'Measure distances in pixels',
      shortcut: 'Alt+M',
      icon: '📏',
      category: 'tool',
      keywords: ['ruler', 'measure', 'distance', 'pixel', 'px'],
      execute: () => toggleTool(ToolType.PIXEL_RULER),
    },
    {
      id: 'toggle-breakpoint-overlay',
      title: 'Toggle Breakpoint Overlay',
      description: 'Show responsive breakpoint indicators',
      shortcut: 'Alt+B',
      icon: '📱',
      category: 'tool',
      keywords: ['breakpoint', 'responsive', 'viewport', 'media query'],
      execute: () => toggleTool(ToolType.RESPONSIVE_BREAKPOINT),
    },
    {
      id: 'toggle-css-inspector',
      title: 'Toggle CSS Inspector',
      description: 'View computed CSS properties by category',
      icon: '📝',
      category: 'tool',
      keywords: ['css', 'styles', 'computed', 'properties', 'inspector'],
      execute: () => toggleTool(ToolType.CSS_INSPECTOR),
    },
    {
      id: 'toggle-contrast-checker',
      title: 'Toggle Contrast Checker',
      description: 'Check WCAG color contrast compliance',
      icon: '♿',
      category: 'tool',
      keywords: ['contrast', 'accessibility', 'wcag', 'color', 'a11y'],
      execute: () => toggleTool(ToolType.CONTRAST_CHECKER),
    },
    {
      id: 'toggle-layout-visualizer',
      title: 'Toggle Flex/Grid Visualizer',
      description: 'Visualize flexbox and grid layouts',
      icon: '⊞',
      category: 'tool',
      keywords: ['flexbox', 'grid', 'layout', 'css', 'container'],
      execute: () => toggleTool(ToolType.LAYOUT_VISUALIZER),
    },
    {
      id: 'toggle-zindex-visualizer',
      title: 'Toggle Z-Index Visualizer',
      description: 'See stacking order and 3D view',
      icon: '📚',
      category: 'tool',
      keywords: ['z-index', 'stacking', 'layer', '3d', 'context'],
      execute: () => toggleTool(ToolType.ZINDEX_VISUALIZER),
    },
    {
      id: 'toggle-tech-detector',
      title: 'Toggle Tech Detector',
      description: 'Detect frameworks and libraries',
      icon: '🔍',
      category: 'tool',
      keywords: ['tech', 'framework', 'library', 'detect', 'stack'],
      execute: () => toggleTool(ToolType.TECH_DETECTOR),
    },
    {
      id: 'toggle-accessibility-audit',
      title: 'Toggle Accessibility Audit',
      description: 'WCAG compliance checker with ARIA validation',
      icon: '🛡️',
      category: 'tool',
      keywords: ['accessibility', 'audit', 'wcag', 'aria', 'a11y'],
      execute: () => toggleTool(ToolType.ACCESSIBILITY_AUDIT),
    },
    {
      id: 'toggle-site-report',
      title: 'Toggle Site Report Generator',
      description: 'Comprehensive site analysis and scoring',
      icon: '📊',
      category: 'tool',
      keywords: ['report', 'analysis', 'score', 'audit', 'performance'],
      execute: () => toggleTool(ToolType.SITE_REPORT),
    },
    {
      id: 'toggle-css-editor',
      title: 'Toggle Live CSS Editor',
      description: 'Edit CSS in real-time with live preview',
      icon: '✏️',
      category: 'tool',
      keywords: ['css', 'editor', 'live', 'edit', 'styles'],
      execute: () => toggleTool(ToolType.CSS_EDITOR),
    },
    {
      id: 'toggle-screenshot-studio',
      title: 'Toggle Screenshot Studio',
      description: 'Capture and annotate screenshots',
      icon: '📸',
      category: 'tool',
      keywords: ['screenshot', 'capture', 'image', 'annotate'],
      execute: () => toggleTool(ToolType.SCREENSHOT_STUDIO),
    },
    {
      id: 'toggle-animation-inspector',
      title: 'Toggle Animation Inspector',
      description: 'Debug CSS animations and transitions',
      icon: '🎬',
      category: 'tool',
      keywords: ['animation', 'css', 'transition', 'keyframes', 'timeline'],
      execute: () => toggleTool(ToolType.ANIMATION_INSPECTOR),
    },
    {
      id: 'toggle-responsive-preview',
      title: 'Toggle Responsive Preview',
      description: 'Multi-device preview side-by-side',
      icon: '📲',
      category: 'tool',
      keywords: ['responsive', 'preview', 'device', 'mobile', 'tablet'],
      execute: () => toggleTool(ToolType.RESPONSIVE_PREVIEW),
    },
    {
      id: 'toggle-design-system-validator',
      title: 'Toggle Design System Validator',
      description: 'Check design token consistency',
      icon: '🎨',
      category: 'tool',
      keywords: ['design', 'system', 'tokens', 'consistency', 'validation'],
      execute: () => toggleTool(ToolType.DESIGN_SYSTEM_VALIDATOR),
    },
    {
      id: 'toggle-network-analyzer',
      title: 'Toggle Network Analyzer',
      description: 'Monitor network requests and waterfall',
      icon: '🌐',
      category: 'tool',
      keywords: ['network', 'requests', 'performance', 'waterfall', 'api'],
      execute: () => toggleTool(ToolType.NETWORK_ANALYZER),
    },

    // ============================================
    // Tools - New "Best of the Best"
    // ============================================
    {
      id: 'toggle-storage-inspector',
      title: 'Toggle Storage Inspector',
      description: 'Inspect LocalStorage, IndexedDB, Cookies, and Cache',
      icon: '💾',
      category: 'tool',
      keywords: ['storage', 'localstorage', 'indexeddb', 'cookies', 'cache'],
      execute: () => toggleTool(ToolType.STORAGE_INSPECTOR),
    },
    {
      id: 'toggle-focus-debugger',
      title: 'Toggle Focus Debugger',
      description: 'Visualize focus order and detect focus traps',
      icon: '🎯',
      category: 'tool',
      keywords: ['focus', 'accessibility', 'tab', 'keyboard', 'trap'],
      execute: () => toggleTool(ToolType.FOCUS_DEBUGGER),
    },
    {
      id: 'toggle-form-debugger',
      title: 'Toggle Form Debugger',
      description: 'Debug form validation and autofill',
      icon: '📝',
      category: 'tool',
      keywords: ['form', 'validation', 'input', 'autofill', 'field'],
      execute: () => toggleTool(ToolType.FORM_DEBUGGER),
    },
    {
      id: 'toggle-component-tree',
      title: 'Toggle Component Tree',
      description: 'Visualize React, Vue, Angular, Svelte components',
      icon: '🌳',
      category: 'tool',
      keywords: ['component', 'tree', 'react', 'vue', 'angular', 'svelte'],
      execute: () => toggleTool(ToolType.COMPONENT_TREE),
    },
    {
      id: 'toggle-flame-graph',
      title: 'Toggle Performance Flame Graph',
      description: 'Visualize JavaScript execution performance',
      icon: '🔥',
      category: 'tool',
      keywords: ['performance', 'flame', 'profile', 'javascript', 'execution'],
      execute: () => toggleTool(ToolType.FLAME_GRAPH),
    },
    {
      id: 'toggle-visual-regression',
      title: 'Toggle Visual Regression',
      description: 'Capture baselines and compare screenshots',
      icon: '👁️',
      category: 'tool',
      keywords: ['visual', 'regression', 'screenshot', 'baseline', 'diff'],
      execute: () => toggleTool(ToolType.VISUAL_REGRESSION),
    },
    {
      id: 'toggle-ai-suggestions',
      title: 'Toggle AI Suggestions',
      description: 'Smart analysis with one-click fixes',
      icon: '✨',
      category: 'tool',
      keywords: ['ai', 'suggestions', 'smart', 'fix', 'analysis'],
      execute: () => toggleTool(ToolType.AI_SUGGESTIONS),
    },

    // ============================================
    // Actions
    // ============================================
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
          await chrome.tabs.sendMessage(tab.id, { type: 'RESET_ALL_TOOLS' });
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
        // Download or copy to clipboard
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
      execute: () => toggleTool(ToolType.SITE_REPORT),
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

    // ============================================
    // Settings
    // ============================================
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
        // Toggle theme in storage
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

    // ============================================
    // Navigation
    // ============================================
    {
      id: 'open-popup',
      title: 'Open Extension Popup',
      description: 'Open the main extension popup',
      shortcut: 'Ctrl+Shift+F',
      icon: '🚀',
      category: 'navigation',
      keywords: ['popup', 'open', 'main', 'window'],
      execute: () => {
        // This is handled by the browser action
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
        // User needs to open DevTools manually, but we can guide them
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

  return commands;
}

/**
 * Search commands by query string
 */
export function searchCommands(query: string): Command[] {
  const commands = getAllCommands();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    // Return recent commands first, then all others
    const recent = recentCommandIds
      .map((id) => commands.find((c) => c.id === id))
      .filter((c): c is Command => c !== undefined);

    const others = commands.filter((c) => !recentCommandIds.includes(c.id));
    return [...recent, ...others];
  }

  const queryTerms = normalizedQuery.split(/\s+/);

  return commands
    .map((command) => {
      const searchText = `${command.title} ${command.description} ${command.keywords.join(' ')}`.toLowerCase();
      const matchCount = queryTerms.filter((term) => searchText.includes(term)).length;
      return { command, matchCount };
    })
    .filter(({ matchCount }) => matchCount > 0)
    .sort((a, b) => {
      // Sort by match count (descending), then by title (ascending)
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return a.command.title.localeCompare(b.command.title);
    })
    .map(({ command }) => command);
}

/**
 * Get command by ID
 */
export function getCommandById(id: string): Command | undefined {
  return getAllCommands().find((cmd) => cmd.id === id);
}

/**
 * Execute command by ID
 */
export async function executeCommandById(id: string): Promise<boolean> {
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
