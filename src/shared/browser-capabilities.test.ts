import { describe, expect, it } from 'vitest'

import { getBrowserCapabilities } from './browser-capabilities'

describe('browser capabilities', () => {
  it('describes the Firefox extension runtime', () => {
    expect(
      getBrowserCapabilities(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
      )
    ).toEqual({
      supportsSubtitlePreservingPip: false,
      requiresNetflixPageBridge: false,
      closesPopupAfterOpeningOptions: true,
    })
  })

  it('describes the Chromium extension runtime', () => {
    expect(
      getBrowserCapabilities(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
      )
    ).toEqual({
      supportsSubtitlePreservingPip: true,
      requiresNetflixPageBridge: true,
      closesPopupAfterOpeningOptions: false,
    })
  })

  it('does not apply Firefox capabilities to SeaMonkey', () => {
    expect(
      getBrowserCapabilities(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:2.53.18) Gecko/20100101 SeaMonkey/2.53.18'
      ).supportsSubtitlePreservingPip
    ).toBe(true)
  })
})
