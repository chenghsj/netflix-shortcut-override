import { describe, expect, it } from 'vitest'

import { FIREFOX_ADDON_ID, createFirefoxManifest } from './firefox-config.mjs'

describe('createFirefoxManifest', () => {
  it('creates an AMO-hosted manifest without a self-hosted update URL', () => {
    const manifest = createFirefoxManifest({
      manifest_version: 3,
      background: {
        service_worker: 'background.js',
        type: 'module',
      },
    })

    expect(manifest.background).toEqual({
      scripts: ['background.js'],
      type: 'module',
    })
    expect(manifest.browser_specific_settings.gecko).toEqual({
      id: FIREFOX_ADDON_ID,
      data_collection_permissions: {
        required: ['none'],
      },
    })
    expect(manifest.browser_specific_settings.gecko).not.toHaveProperty('update_url')
  })
})
