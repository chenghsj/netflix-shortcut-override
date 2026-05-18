import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx, type ManifestV3Export } from '@crxjs/vite-plugin'
import path from 'node:path'
import { defineConfig } from 'vite'

import manifest from './manifest.json'

const devSuffix = '-dev'

const extensionManifest: ManifestV3Export = ({ command }) => {
  const isDev = command === 'serve'

  if (!isDev) return manifest

  return {
    ...manifest,
    name: `${manifest.name}${devSuffix}`,
    short_name: `${manifest.short_name}${devSuffix}`,
    action: {
      ...manifest.action,
      default_title: `${manifest.action.default_title}${devSuffix}`,
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss(), crx({ manifest: extensionManifest })],
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
