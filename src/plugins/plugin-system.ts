/**
 * Plugin System (experimental)
 *
 * In-repo API types and registry helpers for a possible future third-party tool story.
 * This module is not wired into the popup, background, or manifest yet—shipping tools use
 * the standard handler registry instead. Do not advertise a public plugin API in store listings;
 * see `ARCHITECTURE.md` (third-party plugin surface).
 */

import { logger } from '@/utils/logger';
import { escapeHtml } from '@/utils/sanitize';
// ToolId type available from constants when needed for plugin registration

// Plugin types
export type PluginCapability = 
  | 'dom_inspection'
  | 'css_analysis'
  | 'performance_monitor'
  | 'accessibility_check'
  | 'screenshot'
  | 'export';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  capabilities: PluginCapability[];
  permissions: string[];
  icon?: string;
  entryPoint: string;
  settingsSchema?: PluginSetting[];
}

export interface PluginSetting {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'color';
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
  description?: string;
  required?: boolean;
}

export interface RegisteredPlugin {
  manifest: PluginManifest;
  enabled: boolean;
  settings: Record<string, unknown>;
  instance?: PluginInstance;
  installDate: number;
}

export interface PluginInstance {
  manifest: PluginManifest;
  enable: () => void;
  disable: () => void;
  execute?: (context: PluginContext) => Promise<unknown>;
  onMessage?: (message: unknown) => void;
}

export interface PluginContext {
  tabId: number;
  url: string;
  selectedElement?: Element;
  domSnapshot?: Document;
  getComputedStyles?: (element: Element) => CSSStyleDeclaration;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  openPanel: (content: HTMLElement) => void;
  exportData: (data: unknown, filename: string) => void;
}

export interface PluginAPI {
  version: string;
  register: (manifest: PluginManifest, implementation: PluginImplementation) => void;
  unregister: (pluginId: string) => void;
  getContext: () => PluginContext;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, ...args: unknown[]) => void;
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  utils: {
    generateId: () => string;
    debounce: <T extends (...args: unknown[]) => unknown>(fn: T, delay: number) => T;
    throttle: <T extends (...args: unknown[]) => unknown>(fn: T, limit: number) => T;
    deepClone: <T>(obj: T) => T;
  };
  ui: {
    createPanel: (title: string) => HTMLElement;
    createButton: (label: string, onClick: () => void) => HTMLButtonElement;
    showToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    createForm: (schema: PluginSetting[], onSubmit: (values: Record<string, unknown>) => void) => HTMLElement;
  };
  dom: {
    querySelector: (selector: string) => Element | null;
    querySelectorAll: (selector: string) => NodeListOf<Element>;
    createOverlay: (content: string) => HTMLElement;
    highlightElement: (element: Element, color?: string) => () => void;
  };
}

export interface PluginImplementation {
  enable: () => void;
  disable: () => void;
  execute?: (context: PluginContext) => Promise<unknown>;
  onMessage?: (message: unknown) => void;
  onSettingsChange?: (settings: Record<string, unknown>) => void;
}

// Plugin registry
const plugins = new Map<string, RegisteredPlugin>();
const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>();

// Generate unique ID
function generateId(): string {
  return `plugin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Throttle utility
function throttle<T extends (...args: unknown[]) => unknown>(fn: T, limit: number): T {
  let inThrottle = false;
  return ((...args: unknown[]) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}

// Deep clone utility
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Create plugin API
function createPluginAPI(): PluginAPI {
  return {
    version: '1.0.0',

    register: (manifest: PluginManifest, implementation: PluginImplementation) => {
      registerPlugin(manifest, implementation);
    },

    unregister: (pluginId: string) => {
      unregisterPlugin(pluginId);
    },

    getContext: () => createPluginContext(),

    on: (event: string, handler: (...args: unknown[]) => void) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(handler);
    },

    off: (event: string, handler: (...args: unknown[]) => void) => {
      eventListeners.get(event)?.delete(handler);
    },

    emit: (event: string, ...args: unknown[]) => {
      eventListeners.get(event)?.forEach((handler) => {
        try {
          handler(...args);
        } catch (error) {
          logger.error(`[PluginAPI] Error in event handler for ${event}:`, error);
        }
      });
    },

    storage: {
      get: async (key: string) => {
        const result = await chrome.storage.local.get(`plugin_${key}`);
        return result[`plugin_${key}`];
      },
      set: async (key: string, value: unknown) => {
        await chrome.storage.local.set({ [`plugin_${key}`]: value });
      },
      remove: async (key: string) => {
        await chrome.storage.local.remove(`plugin_${key}`);
      },
    },

    utils: {
      generateId,
      debounce,
      throttle,
      deepClone,
    },

    ui: {
      createPanel: (title: string) => {
        const panel = document.createElement('div');
        panel.className = 'fdh-plugin-panel bg-white rounded-lg shadow-lg border border-slate-200 p-4';
        panel.innerHTML = `<h3 class="font-semibold text-slate-900 mb-4">${escapeHtml(title)}</h3>`;
        return panel;
      },

      createButton: (label: string, onClick: () => void) => {
        const button = document.createElement('button');
        button.textContent = label;
        button.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors';
        button.addEventListener('click', onClick);
        return button;
      },

      showToast: (message: string, type = 'info') => {
        const toast = document.createElement('div');
        const colors = {
          info: 'bg-blue-500',
          success: 'bg-green-500',
          warning: 'bg-amber-500',
          error: 'bg-red-500',
        };
        toast.className = `fixed bottom-4 right-4 ${colors[type as keyof typeof colors]} text-white px-4 py-2 rounded-lg shadow-lg z-[2147483647]`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      },

      createForm: (schema: PluginSetting[], onSubmit: (values: Record<string, unknown>) => void) => {
        const form = document.createElement('form');
        form.className = 'space-y-4';

        for (const field of schema) {
          const wrapper = document.createElement('div');
          const label = document.createElement('label');
          label.textContent = field.label;
          label.className = 'block text-sm font-medium text-slate-700 mb-1';
          wrapper.appendChild(label);

          let input: HTMLElement;
          if (field.type === 'select' && field.options) {
            const select = document.createElement('select');
            select.className = 'w-full px-3 py-2 border border-slate-300 rounded-lg';
            select.name = field.key;
            for (const option of field.options) {
              const opt = document.createElement('option');
              opt.value = String(option.value);
              opt.textContent = option.label;
              select.appendChild(opt);
            }
            input = select;
          } else if (field.type === 'boolean') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = field.key;
            checkbox.className = 'w-4 h-4 text-blue-500';
            input = checkbox;
          } else {
            const textInput = document.createElement('input');
            textInput.type = field.type;
            textInput.name = field.key;
            textInput.className = 'w-full px-3 py-2 border border-slate-300 rounded-lg';
            if (field.defaultValue) {
              textInput.value = String(field.defaultValue);
            }
            input = textInput;
          }

          wrapper.appendChild(input);
          form.appendChild(wrapper);
        }

        const submitBtn = document.createElement('button');
        submitBtn.type = 'submit';
        submitBtn.textContent = 'Save';
        submitBtn.className = 'w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600';
        form.appendChild(submitBtn);

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const values: Record<string, unknown> = {};
          for (const [key, value] of formData.entries()) {
            values[key] = value;
          }
          onSubmit(values);
        });

        return form;
      },
    },

    dom: {
      querySelector: (selector: string) => document.querySelector(selector),
      querySelectorAll: (selector: string) => document.querySelectorAll(selector),

      createOverlay: (content: string) => {
        const overlay = document.createElement('div');
        overlay.className = 'fdh-plugin-overlay fixed inset-0 bg-black/50 z-[2147483646] flex items-center justify-center';
        overlay.innerHTML = escapeHtml(content);
        document.body.appendChild(overlay);
        return overlay;
      },

      highlightElement: (element: Element, color = '#3b82f6') => {
        const highlight = document.createElement('div');
        const rect = element.getBoundingClientRect();
        highlight.style.cssText = `
          position: fixed;
          top: ${rect.top}px;
          left: ${rect.left}px;
          width: ${rect.width}px;
          height: ${rect.height}px;
          border: 2px solid ${color};
          background: ${color}20;
          pointer-events: none;
          z-index: 2147483647;
        `;
        document.body.appendChild(highlight);
        return () => highlight.remove();
      },
    },
  };
}

// Create plugin context
function createPluginContext(): PluginContext {
  return {
    tabId: 0, // Will be set from content script
    url: window.location.href,

    showNotification: (message: string, type = 'info') => {
      const notification = document.createElement('div');
      const colors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
      };
      notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg z-[2147483647] animate-fade-in`;
      notification.textContent = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    },

    openPanel: (content: HTMLElement) => {
      const panel = document.createElement('div');
      panel.className = 'fixed right-4 top-20 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-[2147483646] max-h-[80vh] overflow-auto';
      panel.appendChild(content);
      document.body.appendChild(panel);

      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.className = 'absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600';
      closeBtn.addEventListener('click', () => panel.remove());
      panel.appendChild(closeBtn);
    },

    exportData: (data: unknown, filename: string) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Register a new plugin
 */
export function registerPlugin(manifest: PluginManifest, implementation: PluginImplementation): RegisteredPlugin {
  // Validate manifest
  if (!manifest.id || !manifest.name || !manifest.version) {
    throw new Error('Plugin manifest must include id, name, and version');
  }

  if (plugins.has(manifest.id)) {
    throw new Error(`Plugin ${manifest.id} is already registered`);
  }

  const plugin: RegisteredPlugin = {
    manifest,
    enabled: false,
    settings: {},
    installDate: Date.now(),
  };

  // Initialize settings with defaults
  if (manifest.settingsSchema) {
    for (const setting of manifest.settingsSchema) {
      plugin.settings[setting.key] = setting.defaultValue;
    }
  }

  plugins.set(manifest.id, plugin);

  // Create plugin instance
  const instance: PluginInstance = {
    manifest,
    enable: () => {
      implementation.enable();
      plugin.enabled = true;
      logger.log(`[PluginSystem] Enabled: ${manifest.name}`);
    },
    disable: () => {
      implementation.disable();
      plugin.enabled = false;
      logger.log(`[PluginSystem] Disabled: ${manifest.name}`);
    },
    execute: implementation.execute,
    onMessage: implementation.onMessage,
  };

  plugin.instance = instance;

  logger.log(`[PluginSystem] Registered: ${manifest.name} v${manifest.version}`);

  // Save to storage
  savePlugins();

  return plugin;
}

/**
 * Unregister a plugin
 */
export function unregisterPlugin(pluginId: string): boolean {
  const plugin = plugins.get(pluginId);
  if (!plugin) return false;

  // Disable if enabled
  if (plugin.enabled && plugin.instance) {
    plugin.instance.disable();
  }

  plugins.delete(pluginId);
  savePlugins();

  logger.log(`[PluginSystem] Unregistered: ${pluginId}`);
  return true;
}

/**
 * Enable a plugin
 */
export function enablePlugin(pluginId: string): boolean {
  const plugin = plugins.get(pluginId);
  if (!plugin || !plugin.instance) return false;

  plugin.instance.enable();
  return true;
}

/**
 * Disable a plugin
 */
export function disablePlugin(pluginId: string): boolean {
  const plugin = plugins.get(pluginId);
  if (!plugin || !plugin.instance) return false;

  plugin.instance.disable();
  return true;
}

/**
 * Update plugin settings
 */
export function updatePluginSettings(pluginId: string, settings: Record<string, unknown>): boolean {
  const plugin = plugins.get(pluginId);
  if (!plugin) return false;

  plugin.settings = { ...plugin.settings, ...settings };

  // Notify plugin of settings change
  if (plugin.enabled && plugin.instance?.onMessage) {
    plugin.instance.onMessage({ type: 'SETTINGS_CHANGED', settings: plugin.settings });
  }

  savePlugins();
  return true;
}

/**
 * Get all registered plugins
 */
export function getPlugins(): RegisteredPlugin[] {
  return Array.from(plugins.values());
}

/**
 * Get a specific plugin
 */
export function getPlugin(pluginId: string): RegisteredPlugin | undefined {
  return plugins.get(pluginId);
}

/**
 * Execute a plugin
 */
export async function executePlugin(pluginId: string, context?: Partial<PluginContext>): Promise<unknown> {
  const plugin = plugins.get(pluginId);
  if (!plugin?.instance?.execute) {
    throw new Error(`Plugin ${pluginId} not found or has no execute method`);
  }

  const fullContext = { ...createPluginContext(), ...context };
  return plugin.instance.execute(fullContext);
}

/**
 * Send message to plugin
 */
export function sendMessageToPlugin(pluginId: string, message: unknown): boolean {
  const plugin = plugins.get(pluginId);
  if (!plugin?.instance?.onMessage) return false;

  plugin.instance.onMessage(message);
  return true;
}

/**
 * Install plugin from URL
 */
export async function installPluginFromURL(url: string): Promise<RegisteredPlugin> {
  const response = await fetch(url);
  const code = await response.text();
  return installPluginFromCode(code);
}

/**
 * Install plugin from code
 */
export async function installPluginFromCode(code: string): Promise<RegisteredPlugin> {
  // Create a sandboxed environment
  const sandbox = {
    FDHPlugin: {
      register: (manifest: PluginManifest, implementation: PluginImplementation) => {
        return registerPlugin(manifest, implementation);
      },
    },
    console: {
      log: (...args: unknown[]) => logger.log('[Plugin]', ...args),
      error: (...args: unknown[]) => logger.error('[Plugin]', ...args),
      warn: (...args: unknown[]) => logger.warn('[Plugin]', ...args),
    },
  };

  // Execute plugin code in sandbox
  const fn = new Function('FDHPlugin', 'console', code);
  fn(sandbox.FDHPlugin, sandbox.console);

  // Return the last registered plugin
  const allPlugins = getPlugins();
  const lastPlugin = allPlugins[allPlugins.length - 1];

  if (!lastPlugin) {
    throw new Error('Plugin did not register itself');
  }

  return lastPlugin;
}

/**
 * Save plugins to storage
 */
async function savePlugins(): Promise<void> {
  const data = Array.from(plugins.entries()).map(([id, plugin]) => ({
    id,
    manifest: plugin.manifest,
    enabled: plugin.enabled,
    settings: plugin.settings,
    installDate: plugin.installDate,
  }));

  await chrome.storage.local.set({ fdh_plugins: data });
}

/**
 * Load plugins from storage
 */
export async function loadPlugins(): Promise<void> {
  const result = await chrome.storage.local.get('fdh_plugins');
  const data = result.fdh_plugins || [];

  for (const item of data) {
    // Re-register plugin with stored settings
    // Note: Actual implementation would need to reload the plugin code
    logger.log(`[PluginSystem] Loaded from storage: ${item.manifest.name}`);
  }
}

/**
 * Get plugin API for external use
 */
export function getPluginAPI(): PluginAPI {
  return createPluginAPI();
}

/**
 * Validate plugin manifest
 */
export function validateManifest(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const m = manifest as Record<string, unknown>;

  if (!m.id || typeof m.id !== 'string') errors.push('Missing or invalid id');
  if (!m.name || typeof m.name !== 'string') errors.push('Missing or invalid name');
  if (!m.version || typeof m.version !== 'string') errors.push('Missing or invalid version');
  if (!m.description || typeof m.description !== 'string') errors.push('Missing or invalid description');
  if (!m.author || typeof m.author !== 'string') errors.push('Missing or invalid author');
  if (!Array.isArray(m.capabilities)) errors.push('Missing or invalid capabilities');
  if (!Array.isArray(m.permissions)) errors.push('Missing or invalid permissions');
  if (!m.entryPoint || typeof m.entryPoint !== 'string') errors.push('Missing or invalid entryPoint');

  return { valid: errors.length === 0, errors };
}

// Default export
export default {
  registerPlugin,
  unregisterPlugin,
  enablePlugin,
  disablePlugin,
  updatePluginSettings,
  getPlugins,
  getPlugin,
  executePlugin,
  sendMessageToPlugin,
  installPluginFromURL,
  installPluginFromCode,
  loadPlugins,
  getPluginAPI,
  validateManifest,
};
