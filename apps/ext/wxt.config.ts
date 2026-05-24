import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Frontend Dev Helper',
    version: '1.0.0',
    description: 'A comprehensive frontend debugging toolkit with 40+ tools for inspection, CSS analysis, performance profiling, accessibility auditing, and AI-powered analysis.',
    permissions: [
      'activeTab',
      'storage',
      'tabs',
      'scripting',
      'clipboardWrite',
      'notifications',
      'contextMenus',
      'sidePanel',
    ],
    host_permissions: ['http://*/*', 'https://*/*'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
    commands: {
      'toggle-pesticide': {
        suggested_key: { default: 'Alt+Shift+D' },
        description: 'Toggle DOM Outliner',
      },
      'toggle-inspector': {
        suggested_key: { default: 'Alt+Shift+I' },
        description: 'Toggle Element Inspector',
      },
      'open-command-palette': {
        suggested_key: { default: 'Alt+Shift+P' },
        description: 'Open Command Palette',
      },
      'disable-all-tools': {
        suggested_key: { default: 'Alt+Shift+0' },
        description: 'Disable All Tools',
      },
    },
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': '.',
      },
    },
    plugins: [tailwindcss()],
  }),
});
