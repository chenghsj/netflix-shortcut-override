import { describe, expect, it } from 'vitest'

import { isFirefoxBrowser } from './browser-info'

describe('browser info', () => {
  it('detects Firefox desktop user agents', () => {
    expect(
      isFirefoxBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
      )
    ).toBe(true)
  })

  it('does not treat Chromium user agents as Firefox', () => {
    expect(
      isFirefoxBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'
      )
    ).toBe(false)
  })

  it('does not treat SeaMonkey user agents as Firefox', () => {
    expect(
      isFirefoxBrowser(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:2.53.18) Gecko/20100101 SeaMonkey/2.53.18'
      )
    ).toBe(false)
  })
})
