import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json' with { type: 'json' }
import { NETFLIX_CAPTION_HOST_PERMISSIONS, NETFLIX_PAGE_HOST_PERMISSIONS } from './src/shared/netflix-caption-permissions'

const devSuffix = '-dev'

export default defineManifest(({ command, mode }) => {
  const isDev = command === 'serve'
  const isFirefox = mode === 'firefox'

  return {
    manifest_version: 3,
    name: `Shortcut Override for Netflix${isDev ? devSuffix : ''}`,
    short_name: `Shortcut NF${isDev ? devSuffix : ''}`,
    version: packageJson.version,
    description:
      'Customize playback shortcuts on Netflix. Unofficial extension, not affiliated with Netflix.',
    icons: {
      16: 'icons/icon16.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    action: {
      default_title: `Shortcut Override${isDev ? devSuffix : ''}`,
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon16.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true,
    },
    background: isFirefox
      ? {
          scripts: ['src/background/service-worker.ts'],
          persistent: false,
        }
      : {
          service_worker: 'src/background/service-worker.ts',
          type: 'module',
        },
    content_scripts: [
      {
        matches: ['*://*.netflix.com/*'],
        js: ['src/content/netflix-api-bridge.ts'],
        run_at: 'document_start',
        world: 'MAIN',
      },
      {
        matches: ['*://*.netflix.com/*'],
        js: ['src/content/index.ts'],
        run_at: 'document_start',
      },
    ],
    permissions: ['storage', 'scripting', 'activeTab'],
    host_permissions: [...NETFLIX_PAGE_HOST_PERMISSIONS],
    optional_host_permissions: [...NETFLIX_CAPTION_HOST_PERMISSIONS],
    ...(isFirefox
      ? {
          browser_specific_settings: {
            gecko: {
              id: 'shortcut-override-for-netflix@chengjj',
              data_collection_permissions: {
                required: ['none'] as ['none'],
              },
            },
          },
        }
      : {}),
  }
})
