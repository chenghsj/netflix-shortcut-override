import { describe, expect, it } from 'vitest'

import {
  EXTERNAL_LINKS,
  getShortcutOverrideRatingUrl,
  getStreamDanmakuStoreUrl,
} from '@/shared/external-links'

describe('getShortcutOverrideRatingUrl', () => {
  it('returns the Microsoft Edge Add-ons link for Edge', () => {
    expect(
      getShortcutOverrideRatingUrl(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/140.0.0.0'
      )
    ).toBe(EXTERNAL_LINKS.shortcutOverrideEdgeAddons)
  })

  it('returns the Firefox Add-ons review link for Firefox', () => {
    expect(
      getShortcutOverrideRatingUrl(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
      )
    ).toBe(EXTERNAL_LINKS.shortcutOverrideFirefoxAddons)
  })

  it('returns the Chrome Web Store review link for Chromium browsers', () => {
    expect(
      getShortcutOverrideRatingUrl(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(EXTERNAL_LINKS.shortcutOverrideChromeWebStore)
  })
})

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
