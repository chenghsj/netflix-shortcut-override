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
  it.each(['chromium', 'firefox'] as const)('declares the minimum supported browser version in %s', async mode => {
    const manifest = await resolveManifest(mode)
    if (mode === 'chromium') {
      expect(manifest.minimum_chrome_version).toBe('111')
    } else {
      expect(manifest.browser_specific_settings?.gecko?.strict_min_version).toBe('128.0')
      expect(manifest).not.toHaveProperty('minimum_chrome_version')
    }
  })

  it.each(['chromium', 'firefox'] as const)('requires Netflix access and makes only subtitle CDN access optional in %s', async mode => {
    const manifest = await resolveManifest(mode)
    expect(manifest.host_permissions).toEqual(['*://*.netflix.com/*'])
    expect(manifest.optional_host_permissions).toEqual(['https://*.nflxvideo.net/*'])
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
      strict_min_version: '128.0',
      data_collection_permissions: {
        required: ['none'],
      },
    })
    expect(manifest.browser_specific_settings?.gecko).not.toHaveProperty('update_url')
  })
})
