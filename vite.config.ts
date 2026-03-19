import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './public/manifest.json' with { type: 'json' };

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    crx({ manifest: manifest as chrome.runtime.ManifestV3 }),
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
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const ext = info[info.length - 1];
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
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
}));
