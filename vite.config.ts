import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifestBase from './public/manifest.json' with { type: 'json' };

/**
 * Dev CSP: same as [public/manifest.json](public/manifest.json) for `script-src` / `style-src` — Chrome MV3
 * **rejects** `unsafe-inline` or `unsafe-eval` in `script-src` in the manifest. Only relax `connect-src`
 * so Vite HMR can use `ws://` / `http://localhost` (see [Chrome extension CSP](https://developer.chrome.com/docs/extensions/mv3/manifest/#content-security-policy)).
 */
const PROD_EXTENSION_PAGES_CSP = (
  manifestBase as { content_security_policy: { extension_pages: string } }
).content_security_policy.extension_pages;
const DEV_EXTENSION_PAGES_CSP = PROD_EXTENSION_PAGES_CSP.replace(
  /connect-src\s+[^;]+/,
  'connect-src *'
);

function getManifest(command: string, mode: string) {
  // HMR and options/popup fetches: must relax CSP for any `vite` dev run (use `command`, not only `mode`).
  if (command === 'serve' || mode === 'development') {
    return {
      ...manifestBase,
      content_security_policy: {
        ...manifestBase.content_security_policy,
        extension_pages: DEV_EXTENSION_PAGES_CSP,
      },
    };
  }
  return manifestBase;
}

const DEV_PORT = Number(process.env.VITE_DEV_PORT || 5173);
const disableHmr = process.env.VITE_NO_HMR === '1' || process.env.VITE_NO_HMR === 'true';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
  plugins: [
    react(),
    crx({ manifest: getManifest(command, mode) as any }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@popup': resolve(__dirname, './src/popup'),
      '@background': resolve(__dirname, './src/background'),
      '@content': resolve(__dirname, './src/content'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@utils': resolve(__dirname, './src/utils'),
      '@types': resolve(__dirname, './src/types'),
      '@styles': resolve(__dirname, './src/styles'),
    },
  },
  build: {
    target: 'esnext',
    minify: mode === 'production',
    sourcemap: mode !== 'production',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        sidepanel: resolve(__dirname, 'sidepanel.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        // Object form `{ chunk: ['react'] }` makes Rollup treat bare specifiers as extra *entries* → "Could not resolve entry module (react)".
        manualChunks(id) {
          if (/[/\\]node_modules[/\\](react|react-dom)[/\\]/.test(id)) {
            return 'vendor-react';
          }
          if (/[/\\]node_modules[/\\]zod[/\\]/.test(id)) {
            return 'vendor-zod';
          }
        },
        assetFileNames: (assetInfo) => {
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name ?? '')) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(css)$/i.test(assetInfo.name ?? '')) {
            return 'assets/styles/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    chunkSizeWarningLimit: 600,
    emptyOutDir: true,
    outDir: 'dist',
  },
  css: {
    devSourcemap: mode !== 'production',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  server: {
    port: DEV_PORT,
    // One stable port avoids HMR WebSocket URL (e.g. ws://localhost:5173) mismatching the real server (5174+),
    // which shows as "WebSocket handshake: 400" and floods "disconnected port" from the HMR client.
    strictPort: true,
    host: 'localhost',
    // Extension popups load from chrome-extension:// — pin HMR to the same host/port as the dev server.
    hmr: disableHmr
      ? false
      : {
          protocol: 'ws',
          host: 'localhost',
          port: DEV_PORT,
          clientPort: DEV_PORT,
        },
  },
}));
