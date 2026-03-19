import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'FrontendDevHelper',
  version: '0.1.0',
  description: 'A premium browser extension for frontend developers with advanced debugging and inspection tools',
  permissions: [
    'storage',
    'activeTab',
    'scripting',
    'tabs',
    'notifications',
  ],
  host_permissions: [
    '<all_urls>',
  ],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      css: ['src/content/content.css'],
      run_at: 'document_idle',
      all_frames: false,
    },
  ],
  action: {
    default_popup: 'popup.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
    default_title: 'FrontendDevHelper',
  },
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
  options_page: 'options.html',
  devtools_page: 'devtools.html',
  web_accessible_resources: [
    {
      resources: ['icons/*', 'assets/*'],
      matches: ['<all_urls>'],
    },
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+F',
        mac: 'Command+Shift+F',
      },
      description: 'Open FrontendDevHelper popup',
    },
    toggle_dom_outliner: {
      suggested_key: {
        default: 'Alt+P',
      },
      description: 'Toggle DOM Outliner (Pesticide)',
    },
    toggle_spacing_visualizer: {
      suggested_key: {
        default: 'Alt+S',
      },
      description: 'Toggle Spacing Visualizer',
    },
    toggle_font_inspector: {
      suggested_key: {
        default: 'Alt+F',
      },
      description: 'Toggle Font Inspector',
    },
    toggle_color_picker: {
      suggested_key: {
        default: 'Alt+C',
      },
      description: 'Toggle Color Picker',
    },
    toggle_pixel_ruler: {
      suggested_key: {
        default: 'Alt+M',
      },
      description: 'Toggle Pixel Ruler',
    },
    toggle_breakpoint_overlay: {
      suggested_key: {
        default: 'Alt+B',
      },
      description: 'Toggle Breakpoint Overlay',
    },
    toggle_inspector: {
      suggested_key: {
        default: 'Ctrl+Shift+I',
        mac: 'Command+Shift+I',
      },
      description: 'Toggle element inspector',
    },
  },
});
