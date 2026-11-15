import { describe, expect, it } from 'vitest'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { getCopy } from '@/shared/i18n'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { LOCALES, type ShortcutSettings } from '@/shared/shortcut-types'
import { getPopupFavoriteSections } from './popup-favorites'

describe('popup favorite details', () => {
  it.each(LOCALES)('shares Options titles and empty descriptions in %s', locale => {
    const sections = getPopupFavoriteSections(DEFAULT_SETTINGS, locale)
    expect(sections.map(section => [section.title, section.emptyDescription])).toEqual([
      [getCopy(locale).subtitleFavorites.title, getCopy(locale).subtitleFavorites.emptyDescription],
      [getAudioFavoritesCopy(locale).title, getAudioFavoritesCopy(locale).emptyDescription],
    ])
    expect(sections.every(section => section.entries.length === 0)).toBe(true)
  })

  it('preserves language order and distinguishes audio description tracks', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleFavorites = [{ language: 'ja' }, { language: 'en' }]
    settings.audioFavorites = [{ language: 'en', audioDescription: false }, { language: 'en', audioDescription: true }]
    const sections = getPopupFavoriteSections(settings, 'en')
    expect(sections[0].entries.map(entry => entry.label)).toEqual(['Japanese', 'English'])
    expect(sections[1].entries.map(entry => entry.label)).toEqual(['English', 'English · Audio Description'])
    expect(new Set(sections[1].entries.map(entry => entry.id)).size).toBe(2)
  })

  it('filters languages and track variants while omitting unrelated groups', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleFavorites = [{ language: 'ja' }, { language: 'en' }]
    settings.audioFavorites = [{ language: 'en', audioDescription: false }, { language: 'en', audioDescription: true }]
    const language = getPopupFavoriteSections(settings, 'en', '日語')
    expect(language.map(section => section.id)).toEqual(['subtitleFavorites'])
    expect(language[0].entries.map(entry => entry.label)).toEqual(['Japanese'])
    const description = getPopupFavoriteSections(settings, 'en', '口述影像')
    expect(description.map(section => section.id)).toEqual(['audioFavorites'])
    expect(description[0].entries.map(entry => entry.label)).toEqual(['English · Audio Description'])
    expect(getPopupFavoriteSections(settings, 'en', 'no-such-favorite')).toEqual([])
  })

  it('omits hidden favorite features', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.hiddenFeatures.push('subtitleFavorites', 'audioFavorites')
    expect(getPopupFavoriteSections(settings, 'en')).toEqual([])
  })
})
