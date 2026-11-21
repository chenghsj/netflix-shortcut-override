import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { getEditableSettingsSectionKeywords } from '@/shared/editable-settings-search'
import { getCopy } from '@/shared/i18n'
import { matchesSearchText } from '@/shared/search'
import { SEEK_PAIR_COPY, SEEK_SECTION_COPY, SEEK_SHORTCUT_COPY } from '@/shared/seek-shortcuts'
import { LOCALES, type ShortcutSettings } from '@/shared/shortcut-types'
import { subtitleLanguageCatalog } from '@/shared/subtitle-language-catalog'
import { SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'
import { SPEED_SHORTCUT_COPY } from '@/shared/speed-shortcut-copy'
import { SUBTITLE_ACTIVATION_COPY } from './subtitle-activation-copy'

type SettingsSection = 'audioFavorites' | 'subtitleFavorites' | 'speedRange' | 'holdSpeed' | 'seekPair' | 'seekPercentage' | 'subtitleNavigation' | 'general' | 'automation' | 'pauseScreen' | 'backup'

export function createSettingsSearch(settings: ShortcutSettings) {
  const favoriteLanguages = settings.subtitleFavorites.flatMap(({ language }) => [
    language, ...(subtitleLanguageCatalog.find(item => item.value === language)?.keywords ?? []),
  ])
  const audioLanguages = settings.audioFavorites.flatMap(({ language }) => [
    language, ...(subtitleLanguageCatalog.find(item => item.value === language)?.keywords ?? []),
  ])
  const translations = LOCALES.map(locale => {
    const copy = getCopy(locale)
    const speedCopy = SPEED_SHORTCUT_COPY[locale]
    const navigation = SUBTITLE_NAVIGATION_COPY[locale]
    return {
      ...getEditableSettingsSectionKeywords(locale),
      audioFavorites: [copy.shortcutGroups.volume, ...Object.values(getAudioFavoritesCopy(locale)), ...audioLanguages],
      subtitleFavorites: [copy.shortcutGroups.subtitles, copy.subtitleFavorites.title, copy.subtitleFavorites.description,
        copy.subtitleFavorites.emptyDescription, copy.subtitleFavorites.language, copy.subtitleFavorites.chooseLanguage,
        copy.subtitleFavorites.dragToReorder, ...favoriteLanguages],
      holdSpeed: [copy.holdSpeed, copy.holdSpeedDesc, copy.holdSpeedRate, copy.holdSpeedHint, speedCopy.hold, speedCopy.hint],
      seekPair: [SEEK_PAIR_COPY[locale].pair, SEEK_SHORTCUT_COPY[locale].seconds, copy.seekSeconds, copy.seekSecondsTooltip],
      seekPercentage: [SEEK_SECTION_COPY[locale].percentage, SEEK_SECTION_COPY[locale].percentageHint, SEEK_SHORTCUT_COPY[locale].percentage],
      subtitleNavigation: [navigation.title, navigation.enabled, navigation.description, SUBTITLE_ACTIVATION_COPY[locale].permission],
      backup: [copy.backupRestore, copy.backupRestoreDesc, copy.exportSettings, copy.importSettings,
        copy.resetDefaults, copy.resetDefaultsDesc, 'JSON'],
    } satisfies Record<SettingsSection, string[]>
  })
  return (section: SettingsSection, query: string) => matchesSearchText(translations.flatMap(copy => copy[section]), query)
}
