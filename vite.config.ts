import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import path from 'node:path'
import { defineConfig } from 'vite'

import manifest from './manifest.config.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isFirefox = mode === 'firefox'
  const browser = isFirefox ? 'firefox' : 'chrome'

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      crx({ manifest, browser }),
    ],
    build: {
      emptyOutDir: true,
      rollupOptions: {
        input: {
          options: path.resolve(__dirname, 'options.html'),
          popup: path.resolve(__dirname, 'popup.html'),
        },
      },
    },
    server: {
      cors: {
        origin: [
          /^chrome-extension:\/\//,
          /^https?:\/\/localhost(?::\d+)?$/,
          /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
        ],
      },
      port: 5174,
      strictPort: true,
      hmr: {
        port: 5174,
      },
    },
  }
})
