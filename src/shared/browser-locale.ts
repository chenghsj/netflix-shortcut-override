import { LOCALES, type Locale, type LocalePreference } from '@/shared/shortcut-types'

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
  if (normalized === 'pt-br' || normalized.startsWith('pt-br-')) return 'pt-BR'

  const [languageCode] = normalized.split('-')
  return LOCALES.find(locale => locale === languageCode) ?? 'en'
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

export const resolveLocalePreference = (preference: LocalePreference): Locale =>
  preference === 'auto' ? getBrowserLocale() : preference
