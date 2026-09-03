import { describe, expect, it } from 'vitest'

import extensionManifest from './manifest.config'

const resolveManifest = async (mode: 'chromium' | 'firefox') => {
  if (typeof extensionManifest !== 'function') {
    throw new Error('Expected a mode-aware extension manifest.')
  }

  return extensionManifest({
    command: 'build',
    mode,
    isSsrBuild: false,
    isPreview: false,
  })
}

describe('extension manifest', () => {
  it('uses a service worker for Chromium', async () => {
    const manifest = await resolveManifest('chromium')

    expect(manifest.background).toEqual({
      service_worker: 'src/background/index.ts',
      type: 'module',
    })
    expect(manifest).not.toHaveProperty('browser_specific_settings')
  })

  it('uses an AMO-hosted background script for Firefox', async () => {
    const manifest = await resolveManifest('firefox')

    expect(manifest.background).toEqual({
      scripts: ['src/background/index.ts'],
      persistent: false,
    })
    expect(manifest.browser_specific_settings?.gecko).toEqual({
      id: 'shortcut-override-for-netflix@chengjj',
      data_collection_permissions: {
        required: ['none'],
      },
    })
    expect(manifest.browser_specific_settings?.gecko).not.toHaveProperty('update_url')
  })
})
