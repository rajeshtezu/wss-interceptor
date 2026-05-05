import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { readFileSync, cpSync, mkdirSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-files',
      closeBundle() {
        // Copy manifest.json
        cpSync('manifest.json', 'dist/manifest.json');

        // Copy assets
        try {
          cpSync('public/assets', 'dist/assets', { recursive: true });
        } catch (err) {
          // Assets might not exist yet
        }
      }
    }
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // DevTools entries
        devtools: resolve(__dirname, 'src/devtools/devtools.html'),
        panel: resolve(__dirname, 'src/devtools/panel.html'),

        // Service worker
        'service-worker': resolve(__dirname, 'src/service-worker/service-worker.ts'),

        // Content scripts
        'content-script': resolve(__dirname, 'src/content-script/websocket-interceptor.ts'),
        'interceptor-main': resolve(__dirname, 'src/content-script/interceptor-main.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId || '';
          if (facadeModuleId.includes('service-worker')) {
            return 'sw/[name].js';
          }
          if (facadeModuleId.includes('content-script') || facadeModuleId.includes('interceptor-main')) {
            return 'content/[name].js';
          }
          if (facadeModuleId.includes('devtools')) {
            return 'devtools/[name].js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },

    target: 'esnext',
    minify: false,
    sourcemap: true,
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    }
  }
});
