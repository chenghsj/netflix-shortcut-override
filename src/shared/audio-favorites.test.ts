import { describe, expect, it } from 'vitest'

import { MAX_AUDIO_FAVORITES, normalizeAudioFavorites } from './audio-favorites'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'
import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup, SHORTCUT_SETTINGS_VERSION } from './shortcut-settings'
import { recoverCompatibleSettings } from './settings-compatibility'

describe('favorite audio settings', () => {
  const favorites = [
    { language: 'ja', audioDescription: false },
    { language: 'en-US', audioDescription: true },
    { language: 'en-US', audioDescription: false },
  ]

  it('normalizes language codes and deduplicates each audio variant independently', () => {
    expect(normalizeAudioFavorites([
      { language: ' JA ', audioDescription: false },
      { language: 'ja', audioDescription: false },
      { language: 'en_us', audioDescription: true },
      { language: 'en-US', audioDescription: false },
      null, {}, { language: 'en' }, { language: 'fr', audioDescription: 'false' },
      { language: 'invalid code', audioDescription: false }, { language: 'und', audioDescription: true },
    ])).toEqual(favorites)
    expect(normalizeAudioFavorites(null)).toEqual([])
    expect(normalizeAudioFavorites(Array.from({ length: 30 }, (_, index) => ({
      language: `q${String.fromCharCode(97 + Math.floor(index / 26))}${String.fromCharCode(97 + index % 26)}`,
      audioDescription: false,
    })))).toHaveLength(MAX_AUDIO_FAVORITES)
  })

  it('round-trips ordered audio variants through settings and backups', () => {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, audioFavorites: favorites })
    expect(settings.audioFavorites).toEqual(favorites)
    expect(parseSettingsBackup(JSON.stringify(createSettingsBackup(settings, { extensionVersion: 'test' }))))
      .toMatchObject({ ok: true, value: { settings: { audioFavorites: favorites } } })
  })

  it('migrates v27 backups with an empty list but rejects incomplete or invalid current backups', () => {
    const oldSettings = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([key]) => key !== 'audioFavorites'))
    expect(parseSettingsForBackup({ ...oldSettings, version: 27 })).toMatchObject({
      ok: true, settings: { version: SHORTCUT_SETTINGS_VERSION, audioFavorites: [] },
    })
    for (const audioFavorites of [undefined, {}, [...favorites, favorites[0]], [{ language: 'ja' }],
      [{ language: 'EN_us', audioDescription: false }]]) {
      expect(parseSettingsForBackup({ ...DEFAULT_SETTINGS, audioFavorites }).ok).toBe(false)
    }
    expect(normalizeSettings({ ...oldSettings, version: 27 }).audioFavorites).toEqual([])
  })

  it('retains favorites across v27 writes and honors a later explicit empty list', () => {
    const saved = { ...DEFAULT_SETTINGS, audioFavorites: favorites }
    const oldSettings = Object.fromEntries(Object.entries(DEFAULT_SETTINGS).filter(([key]) => key !== 'audioFavorites'))
    expect(recoverCompatibleSettings({ ...oldSettings, version: 27, enabled: false }, saved))
      .toMatchObject({ enabled: false, audioFavorites: favorites })
    expect(recoverCompatibleSettings(DEFAULT_SETTINGS, saved).audioFavorites).toEqual([])
  })
})
