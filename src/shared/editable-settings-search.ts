import { getCopy, LOCALE_LABELS, LOCALE_SHORT_LABELS } from '@/shared/i18n'
import { OPTIONS_SECTION_COPY } from '@/shared/options-navigation'
import { matchesSearchText } from '@/shared/search'
import { LOCALES, type Locale, type SpeedSettings } from '@/shared/shortcut-types'
import { SPEED_SHORTCUT_COPY } from '@/shared/speed-shortcut-copy'
import { getUiStyleOptions } from '@/shared/ui-styles'

export const EDITABLE_SETTINGS_FIELDS = {
  general: ['locale', 'uiStyle', 'theme'],
  automation: ['intro', 'recap', 'autoNextEpisode'],
  pauseScreen: ['hidePauseOverlay'],
  speedRange: ['min', 'max', 'step'],
} as const

export type EditableSettingsSection = keyof typeof EDITABLE_SETTINGS_FIELDS
export type EditableSettingField = (typeof EDITABLE_SETTINGS_FIELDS)[EditableSettingsSection][number]

function getFieldKeywords(locale: Locale) {
  const copy = getCopy(locale)
  const { playbackPreferences, pauseScreen } = OPTIONS_SECTION_COPY[locale]
  const { range } = SPEED_SHORTCUT_COPY[locale]
  const general = [copy.quickSettings]
  const playback = [playbackPreferences, copy.autoSkip]
  const speed = [copy.speed, range]

  return {
    locale: [...general, copy.locale, copy.localeAuto, ...Object.values(LOCALE_LABELS), ...Object.values(LOCALE_SHORT_LABELS)],
    uiStyle: [...general, copy.uiStyle, ...getUiStyleOptions(locale).map(option => option.label)],
    theme: [...general, copy.theme, copy.themeAuto, copy.themeLight, copy.themeDark],
    intro: [...playback, copy.autoSkipIntro, copy.actions.skipIntro, 'auto skip intro'],
    recap: [...playback, copy.autoSkipRecap, 'auto skip recap'],
    autoNextEpisode: [...playback, copy.autoNextEpisode, copy.actions.nextEpisode, 'auto play next episode', 'autoplay'],
    hidePauseOverlay: [playbackPreferences, pauseScreen, copy.hidePauseOverlay],
    min: [...speed, copy.minSpeed, 'minimum speed'],
    max: [...speed, copy.maxSpeed, 'maximum speed'],
    step: [...speed, copy.step, 'speed increment'],
  } satisfies Record<EditableSettingField, string[]>
}

const translations = LOCALES.map(getFieldKeywords)
const editableSettingsIndex = Object.values(EDITABLE_SETTINGS_FIELDS).flat().map(field => ({
  field,
  keywords: translations.flatMap(copy => copy[field]),
}))

export const findEditableSettingsFields = (query: string, speed: SpeedSettings): ReadonlySet<EditableSettingField> =>
  new Set(editableSettingsIndex.filter(({ field, keywords }) => {
    if (field === 'min' || field === 'max' || field === 'step') {
      return matchesSearchText([...keywords, `${speed[field]}×`], query)
    }
    return matchesSearchText(keywords, query)
  }).map(({ field }) => field))

export function getEditableSettingsSectionKeywords(locale: Locale) {
  const copy = getCopy(locale)
  const keywords = getFieldKeywords(locale)
  const forSection = (section: EditableSettingsSection) => EDITABLE_SETTINGS_FIELDS[section].flatMap(field => keywords[field])

  return {
    general: forSection('general'),
    automation: forSection('automation'),
    pauseScreen: [...forSection('pauseScreen'), copy.hidePauseOverlayDescription],
    speedRange: [...forSection('speedRange'), SPEED_SHORTCUT_COPY[locale].rangeDescription,
      copy.minSpeedTooltip, copy.maxSpeedTooltip, copy.stepTooltip],
  }
}
