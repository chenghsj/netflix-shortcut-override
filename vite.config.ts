import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import path from 'node:path'
import { defineConfig } from 'vite'

import manifest from './manifest.json'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss(), crx({ manifest: manifest as ManifestV3Export })],
  build: {
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
})
