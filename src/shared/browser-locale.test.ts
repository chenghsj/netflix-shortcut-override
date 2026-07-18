import { describe, expect, it, vi } from 'vitest'

import { getBrowserLocale, resolveBrowserLocale } from '@/shared/browser-locale'

describe('browser locale', () => {
  it.each([
    ['zh-TW', 'zh-TW'],
    ['zh_HK', 'zh-TW'],
    ['zh-Hant-TW', 'zh-TW'],
    ['zh-Hant', 'zh-TW'],
    ['zh-CN', 'zh-CN'],
    ['zh-Hans-SG', 'zh-CN'],
    ['ja-JP', 'ja'],
    ['ko-KR', 'ko'],
    ['fr-FR', 'en'],
    [undefined, 'en'],
  ] as const)('maps %s to a supported locale', (language, expected) => {
    expect(resolveBrowserLocale(language)).toBe(expected)
  })

  it('uses the Chrome interface language when available', () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('ko-KR')

    expect(getBrowserLocale()).toBe('ko')
  })
})
