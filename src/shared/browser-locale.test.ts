import { describe, expect, it, vi } from 'vitest'

import {
  getBrowserLocale,
  resolveBrowserLocale,
  resolveLocalePreference,
} from '@/shared/browser-locale'

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
    ['es', 'es'],
    ['es-ES', 'es'],
    ['es-419', 'es'],
    ['es-MX', 'es'],
    ['PT_BR', 'pt-BR'],
    ['pt-BR', 'pt-BR'],
    ['pt-PT', 'en'],
    ['fr', 'fr'],
    ['fr-FR', 'fr'],
    ['fr_CA', 'fr'],
    ['de-DE', 'de'],
    ['de-CH', 'de'],
    ['id', 'id'],
    ['ID_id', 'id'],
    ['it-IT', 'en'],
    [undefined, 'en'],
  ] as const)('maps %s to a supported locale', (language, expected) => {
    expect(resolveBrowserLocale(language)).toBe(expected)
  })

  it('uses the Chrome interface language when available', () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('ko-KR')

    expect(getBrowserLocale()).toBe('ko')
  })

  it('resolves automatic preferences while preserving fixed preferences', () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('zh-TW')

    expect(resolveLocalePreference('auto')).toBe('zh-TW')
    expect(resolveLocalePreference('ja')).toBe('ja')
  })
})
