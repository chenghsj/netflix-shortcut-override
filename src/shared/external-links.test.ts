import { describe, expect, it } from 'vitest'

import { EXTERNAL_LINKS, getStreamDanmakuStoreUrl } from '@/shared/external-links'

describe('getStreamDanmakuStoreUrl', () => {
  it('returns the Microsoft Edge Add-ons link for Edge', () => {
    expect(getStreamDanmakuStoreUrl('Mozilla/5.0 Edg/126.0.0.0')).toBe(
      EXTERNAL_LINKS.streamDanmakuMicrosoftEdgeAddons
    )
  })

  it('returns the Chrome Web Store link for other browsers', () => {
    expect(getStreamDanmakuStoreUrl('Mozilla/5.0 Chrome/126.0.0.0')).toBe(
      EXTERNAL_LINKS.streamDanmakuChromeWebStore
    )
  })
})
