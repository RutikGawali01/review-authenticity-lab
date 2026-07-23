import { defineConfig, build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import fs from 'fs';

/**
 * Custom Vite plugin to build content.js and background.js as isolated IIFE scripts.
 * In Manifest V3, content scripts execute as classic scripts (not ES modules).
 * Building content script in isolation guarantees zero code-splitting or import statements.
 */
function buildExtensionScriptsPlugin() {
  return {
    name: 'build-extension-scripts',
    async writeBundle() {
      // 1. Build content.js as an isolated IIFE bundle
      await viteBuild({
        root: resolve(__dirname, 'extension'),
        configFile: false,
        build: {
          outDir: resolve(__dirname, 'dist'),
          emptyOutDir: false,
          write: true,
          lib: {
            entry: resolve(__dirname, 'extension/content/content.js'),
            formats: ['iife'],
            name: 'ContentScript',
            fileName: () => 'content/content.js',
          },
          rollupOptions: {
            output: {
              extend: true,
            },
          },
        },
      });

      // 2. Build background.js as an isolated IIFE bundle
      await viteBuild({
        root: resolve(__dirname, 'extension'),
        configFile: false,
        build: {
          outDir: resolve(__dirname, 'dist'),
          emptyOutDir: false,
          write: true,
          lib: {
            entry: resolve(__dirname, 'extension/background/background.js'),
            formats: ['iife'],
            name: 'BackgroundWorker',
            fileName: () => 'background/background.js',
          },
          rollupOptions: {
            output: {
              extend: true,
            },
          },
        },
      });
    },
  };
}

/**
 * Custom Vite plugin to copy extension/manifest.json directly into dist/manifest.json.
 */
function copyManifestPlugin() {
  return {
    name: 'copy-manifest',
    generateBundle() {
      const manifestPath = resolve(__dirname, 'extension/manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify(manifest, null, 2),
        });
      }
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, 'extension'),
  plugins: [
    react(),
    tailwindcss(),
    copyManifestPlugin(),
    buildExtensionScriptsPlugin(),
  ],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'extension/ui/popup.html'),
        sidepanel: resolve(__dirname, 'extension/ui/sidepanel.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
});

