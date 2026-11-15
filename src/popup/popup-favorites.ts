import { audioFavoriteKey } from '@/shared/audio-favorites'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { getCopy } from '@/shared/i18n'
import { OPTIONS_LAYOUT_COPY } from '@/shared/options-navigation'
import { matchesSearchText } from '@/shared/search'
import { LOCALES, type Locale, type ShortcutSettings } from '@/shared/shortcut-types'
import { subtitleLanguageCatalog } from '@/shared/subtitle-language-catalog'

export type PopupFavoriteSection = {
  id: 'subtitleFavorites' | 'audioFavorites'
  category: 'subtitles' | 'volume'
  title: string
  emptyDescription: string
  keywords: string[]
  entries: { id: string; label: string; keywords: string[] }[]
}

const englishNames = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' })

export function getPopupFavoriteSections(settings: ShortcutSettings, locale: Locale, query = ''): PopupFavoriteSection[] {
  const names = new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' })
  const label = (language: string) => names.of(language) ?? englishNames.of(language) ?? language
  const keywords = (language: string) => [language, label(language), englishNames.of(language) ?? language,
    ...(subtitleLanguageCatalog.find(item => item.value === language)?.keywords
      ?? subtitleLanguageCatalog.find(item => item.value === language.split('-')[0])?.keywords ?? [])]
  const subtitleCopy = getCopy(locale).subtitleFavorites
  const audioCopy = getAudioFavoritesCopy(locale)
  const sections: PopupFavoriteSection[] = [
    {
      id: 'subtitleFavorites', category: 'subtitles', title: subtitleCopy.title, emptyDescription: subtitleCopy.emptyDescription,
      keywords: LOCALES.flatMap(language => [getCopy(language).subtitleFavorites.title, getCopy(language).subtitleFavorites.language, OPTIONS_LAYOUT_COPY[language].subtitles]),
      entries: settings.subtitleFavorites.map(favorite => ({ id: favorite.language, label: label(favorite.language), keywords: keywords(favorite.language) })),
    },
    {
      id: 'audioFavorites', category: 'volume', title: audioCopy.title, emptyDescription: audioCopy.emptyDescription,
      keywords: LOCALES.flatMap(language => [getAudioFavoritesCopy(language).title, getAudioFavoritesCopy(language).language, OPTIONS_LAYOUT_COPY[language].volume]),
      entries: settings.audioFavorites.map(favorite => ({
        id: audioFavoriteKey(favorite),
        label: favorite.audioDescription ? `${label(favorite.language)} · ${audioCopy.audioDescription}` : label(favorite.language),
        keywords: [...keywords(favorite.language), ...(favorite.audioDescription ? LOCALES.map(language => getAudioFavoritesCopy(language).audioDescription) : [])],
      })),
    },
  ]
  return sections.filter(section => !settings.hiddenFeatures.includes(section.id)).flatMap(section => {
    const entries = section.entries.filter(entry => matchesSearchText([...section.keywords, ...entry.keywords], query))
    if (query.trim() && !entries.length && !matchesSearchText(section.keywords, query)) return []
    return [{ ...section, entries }]
  })
}
