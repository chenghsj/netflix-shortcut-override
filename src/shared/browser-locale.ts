import type { Locale } from '@/shared/shortcuts'

export const resolveBrowserLocale = (language: string | undefined): Locale => {
  const normalized = language?.trim().replaceAll('_', '-').toLowerCase()

  if (!normalized) return 'en'
  if (
    normalized === 'zh-tw' ||
    normalized === 'zh-hk' ||
    normalized === 'zh-mo' ||
    normalized === 'zh-hant' ||
    normalized.startsWith('zh-hant-')
  ) {
    return 'zh-TW'
  }
  if (normalized.startsWith('zh')) return 'zh-CN'
  if (normalized.startsWith('ja')) return 'ja'
  if (normalized.startsWith('ko')) return 'ko'
  return 'en'
}

export const getBrowserLocale = (): Locale => {
  const chromeLanguage =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage()
      : undefined
  const browserLanguage =
    chromeLanguage ||
    (typeof navigator !== 'undefined'
      ? navigator.languages?.find(Boolean) || navigator.language
      : undefined)

  return resolveBrowserLocale(browserLanguage)
}
