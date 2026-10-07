import { describe, expect, it } from 'vitest'

import extensionManifest from './manifest.config'
import { NETFLIX_CAPTION_HOST_PERMISSIONS } from './src/shared/netflix-caption-permissions'

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
  it.each(['chromium', 'firefox'] as const)('declares only the existing subtitle request hosts in %s', async mode => {
    const manifest = await resolveManifest(mode)
    expect(manifest.host_permissions).toEqual([...NETFLIX_CAPTION_HOST_PERMISSIONS])
    expect(manifest.host_permissions).not.toContain('<all_urls>')
  })
  it('uses a service worker for Chromium', async () => {
    const manifest = await resolveManifest('chromium')

    expect(manifest.background).toEqual({
      service_worker: 'src/background/service-worker.ts',
      type: 'module',
    })
    expect(manifest).not.toHaveProperty('browser_specific_settings')
  })

  it('uses an AMO-hosted background script for Firefox', async () => {
    const manifest = await resolveManifest('firefox')

    expect(manifest.background).toEqual({
      scripts: ['src/background/service-worker.ts'],
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
