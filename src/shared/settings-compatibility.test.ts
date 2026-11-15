import { describe, expect, it, vi } from 'vitest'

import legacy from './fixtures/settings-v0.6.8.json'
import older from './fixtures/settings-v0.6.4.json'
import { DEFAULT_SETTINGS, normalizeSettings, SHORTCUT_SETTINGS_VERSION } from './shortcut-settings'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'
import { resolvePlaybackShortcut } from './shortcut-routing'
import type { BuiltinShortcutAction, ShortcutSettings } from './shortcut-types'
import {
  SETTINGS_STORAGE_KEY, SETTINGS_COMPATIBILITY_KEY,
  getSettings, initializeSettingsCompatibility, saveSettings, subscribeSettings, updateSettings,
} from './storage'

const setSync = (values: Record<string, unknown>) =>
  new Promise<void>(resolve => chrome.storage.sync.set(values, resolve))

const addedActions: BuiltinShortcutAction[] = [
  'cycleSubtitleTrack', 'previousSubtitleTrack', 'cycleSubtitleSize', 'previousEpisode', 'nextEpisode',
  'previousFrame', 'nextFrame', 'previousAudioTrack', 'nextAudioTrack',
]

describe('upgrading existing subtitle keys', () => {
  it.each(addedActions)('preserves saved general keys and disabled masters when introducing %s', async action => {
    const raw = structuredClone(legacy.settings)
    raw.enabled = false
    raw.bindings.mute.key = { ...DEFAULT_SETTINGS.bindings[action].key }
    await setSync({ [SETTINGS_STORAGE_KEY]: raw })
    const settings = await getSettings()
    expect(settings.enabled).toBe(false)
    expect(settings.bindings.mute).toEqual(raw.bindings.mute)
    expect(settings.bindings[action].enabled).toBe(false)
    expect(settings.subtitleNavigation).toEqual(raw.subtitleNavigation)
    const imported = parseSettingsBackup(JSON.stringify({ ...legacy.backup, settings: raw }))
    expect(imported).toMatchObject({ ok: true, value: { settings } })
    raw.bindings.mute.enabled = false
    expect(normalizeSettings(raw).bindings[action].enabled).toBe(true)
  })

  it.each(addedActions)('does not let %s take an enabled subtitle key during upgrade or import', async action => {
    const raw = structuredClone(legacy.settings)
    const key = DEFAULT_SETTINGS.bindings[action].key
    raw.subtitleNavigation.enabled = true
    raw.subtitleNavigation.bindings.previous.key = { ...key }
    await setSync({ [SETTINGS_STORAGE_KEY]: raw })

    const settings = await getSettings()
    expect(settings.bindings[action].enabled).toBe(false)
    expect(settings.subtitleNavigation).toEqual(raw.subtitleNavigation)
    expect(resolvePlaybackShortcut(settings, {
      ...key, ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta,
    }, true)).toEqual({ group: 'subtitleNavigation', action: 'previous', supported: true })

    const imported = parseSettingsBackup(JSON.stringify({ ...legacy.backup, settings: raw }))
    expect(imported).toMatchObject({ ok: true, value: { settings } })
    expect(normalizeSettings(settings)).toEqual(settings)
    raw.subtitleNavigation.enabled = false
    expect(normalizeSettings(raw).bindings[action].enabled).toBe(false)
    raw.subtitleNavigation.bindings.previous.enabled = false
    expect(normalizeSettings(raw).bindings[action].enabled).toBe(true)
  })

  it('also reserves enabled keys in the former subtitlePractice field', () => {
    const raw = structuredClone(older.cases[0].settings)
    raw.subtitlePractice.bindings.previous.key = { ...DEFAULT_SETTINGS.bindings.nextFrame.key }
    expect(normalizeSettings(raw).bindings.nextFrame.enabled).toBe(false)
  })
})

const currentPreferences = (): ShortcutSettings => {
  const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
  settings.autoSkip = { intro: true, recap: true }
  settings.autoNextEpisode = true
  settings.subtitleFavorites = [{ language: 'ja' }]
  settings.audioFavorites = [{ language: 'en', audioDescription: true }]
  settings.subtitleSize = 150
  settings.pip.subtitleSize = 175
  settings.subtitleSizeCycle = [150, 80, 125]
  settings.seekShortcuts = [{ id: 'seek:kept', kind: 'percentage', value: 37 }]
  settings.bindings['seek:kept'] = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.mute.key, alt: true } }
  settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:kept', kind: 'fixed', sizes: [175] }]
  settings.bindings['subtitle-size:kept'] = { enabled: false, key: null }
  settings.bindings.nextAudioTrack = { enabled: false, key: { ...DEFAULT_SETTINGS.bindings.mute.key, shift: true } }
  settings.bindings.playPause.key = null
  settings.subtitleNavigation.bindings.next.key = null
  return settings
}

describe('settings shared with older clients', () => {
  it('retains pause overlay hiding being on when an older client replaces the shared settings', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: true })
    const oldWrite: Record<string, unknown> = { ...DEFAULT_SETTINGS, version: 30, theme: 'dark' }
    delete oldWrite.hidePauseOverlay
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    expect(await getSettings()).toMatchObject({ hidePauseOverlay: true, theme: 'dark' })
  })

  it.each(['extension', 'preview'] as const)('upgrades an older compatibility snapshot without losing recovered preferences in %s storage', async storage => {
    if (storage === 'preview') {
      vi.stubGlobal('chrome', undefined)
      localStorage.clear()
    }
    try {
      const preferences = currentPreferences()
      preferences.preferredSpeedShortcuts = [{ id: 'preferred-speed:kept', speed: 2 }]
      preferences.bindings['preferred-speed:kept'] = { enabled: true, key: null }
      const previous: Record<string, unknown> = { ...preferences, version: 29 }
      delete previous.hiddenFeatures
      const raw = { ...structuredClone(legacy.settings), enabled: false, theme: 'dark', seek: { seconds: 21 } }
      if (storage === 'extension') {
        await setSync({ [SETTINGS_STORAGE_KEY]: raw, [SETTINGS_COMPATIBILITY_KEY]: previous })
      } else {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(raw))
        localStorage.setItem(SETTINGS_COMPATIBILITY_KEY, JSON.stringify(previous))
      }
      const before = await getSettings()
      expect(before).toMatchObject({
        enabled: false, theme: 'dark', seek: { seconds: 21 }, autoNextEpisode: true,
        audioFavorites: preferences.audioFavorites, preferredSpeedShortcuts: preferences.preferredSpeedShortcuts,
        subtitleSize: 150, pip: { subtitleSize: 175 }, bindings: { playPause: { key: null } },
      })
      if (storage === 'extension') vi.mocked(chrome.storage.sync.set).mockClear()
      await initializeSettingsCompatibility()
      expect(await getSettings()).toEqual(before)
      if (storage === 'extension') {
        expect(chrome.storage.sync.set).toHaveBeenCalledExactlyOnceWith(
          { [SETTINGS_COMPATIBILITY_KEY]: before }, expect.any(Function),
        )
        vi.mocked(chrome.storage.sync.set).mockClear()
        await initializeSettingsCompatibility()
        expect(chrome.storage.sync.set).not.toHaveBeenCalled()
      } else {
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!)).toEqual(raw)
        expect(JSON.parse(localStorage.getItem(SETTINGS_COMPATIBILITY_KEY)!)).toEqual(before)
      }
    } finally {
      if (storage === 'preview') {
        localStorage.clear()
        vi.unstubAllGlobals()
      }
    }
  })

  it('keeps a current replacement authoritative when upgrading an older compatibility snapshot', async () => {
    const previous = { ...currentPreferences(), version: 29 }
    await setSync({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS, [SETTINGS_COMPATIBILITY_KEY]: previous })
    await initializeSettingsCompatibility()
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(chrome.storage.sync.set).toHaveBeenLastCalledWith(
      { [SETTINGS_COMPATIBILITY_KEY]: DEFAULT_SETTINGS }, expect.any(Function),
    )
  })

  it('applies explicit legacy changes that differ from unsupported-value fallbacks', async () => {
    await saveSettings(currentPreferences())
    const oldWrite = structuredClone(legacy.settings)
    oldWrite.bindings.playPause.key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyZ', key: 'z' }
    oldWrite.subtitleNavigation.bindings.next.key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyR', key: 'r' }
    oldWrite.pip.subtitleSize = 'small'
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    const settings = await getSettings()
    expect(settings.bindings.playPause).toEqual(oldWrite.bindings.playPause)
    expect(settings.subtitleNavigation.bindings.next).toEqual(oldWrite.subtitleNavigation.bindings.next)
    expect(settings.pip.subtitleSize).toBe('small')
    expect(settings.autoNextEpisode).toBe(true)
  })

  it('also releases a recovered new action when an older client later assigns its key', async () => {
    await saveSettings(currentPreferences())
    const oldWrite = structuredClone(legacy.settings)
    const key = DEFAULT_SETTINGS.bindings.nextFrame.key
    oldWrite.subtitleNavigation.enabled = true
    oldWrite.subtitleNavigation.bindings.previous.key = { ...key }
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    const settings = await getSettings()
    expect(settings.bindings.nextFrame.enabled).toBe(false)
    expect(resolvePlaybackShortcut(settings, {
      ...key, ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta,
    }, true)).toEqual({ group: 'subtitleNavigation', action: 'previous', supported: true })
  })

  it.each([legacy.settings, older.cases[0].settings])('keeps new preferences through a schema v$version write and a later edit', async raw => {
    const settings = currentPreferences()
    await saveSettings(settings)
    const oldWrite = { ...structuredClone(raw), enabled: false, theme: 'dark', seek: { seconds: 21 } }
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    const expected = {
      ...normalizeSettings(oldWrite),
      uiStyle: settings.uiStyle,
      autoSkip: settings.autoSkip, autoNextEpisode: true,
      subtitleFavorites: settings.subtitleFavorites, audioFavorites: settings.audioFavorites, subtitleSize: 150,
      subtitleSizeCycle: settings.subtitleSizeCycle, subtitleSizeShortcuts: settings.subtitleSizeShortcuts,
      seekShortcuts: settings.seekShortcuts,
      pip: { ...oldWrite.pip, subtitleSize: 175 },
      bindings: {
        ...oldWrite.bindings,
        ...Object.fromEntries(addedActions.map(action => [action, settings.bindings[action]])),
        playPause: { ...oldWrite.bindings.playPause, key: null },
        'seek:kept': settings.bindings['seek:kept'],
        'subtitle-size:kept': settings.bindings['subtitle-size:kept'],
      },
    }
    expected.subtitleNavigation.bindings.next.key = null
    expected.subtitleNavigation.bindings.replay.key = null
    expect(await getSettings()).toEqual(expected)
    expect(await updateSettings(current => ({ ...current, locale: 'ko' }))).toEqual({ ...expected, locale: 'ko' })
    expect(await getSettings()).toEqual({ ...expected, locale: 'ko' })
  })

  it('delivers recovered preferences with each live legacy disable and enable event', async () => {
    const settings = currentPreferences()
    await saveSettings(settings)
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    await vi.waitFor(() => expect(chrome.storage.sync.get).toHaveBeenCalled())
    await Promise.resolve()
    await Promise.resolve()
    try {
      await setSync({ [SETTINGS_STORAGE_KEY]: { ...legacy.settings, enabled: false } })
      await setSync({ [SETTINGS_STORAGE_KEY]: legacy.settings })
      expect(receive.mock.calls.map(([value]) => value.enabled)).toEqual([false, true])
      for (const [value] of receive.mock.calls) {
        expect(value).toMatchObject({ seekShortcuts: settings.seekShortcuts, autoNextEpisode: true })
      }
    } finally {
      unsubscribe()
    }
  })

  it('does not revive deleted preferences after a reset or an older backup replacement', async () => {
    const backup = parseSettingsBackup(JSON.stringify(legacy.backup))
    expect(backup.ok).toBe(true)
    if (!backup.ok) throw new Error('Expected a valid legacy backup')
    for (const replacement of [DEFAULT_SETTINGS, backup.value.settings]) {
      await saveSettings(currentPreferences())
      await saveSettings(replacement)
      await setSync({ [SETTINGS_STORAGE_KEY]: legacy.settings })
      expect(await getSettings()).toMatchObject({ seekShortcuts: [], subtitleSizeShortcuts: [], autoNextEpisode: false })
    }
  })

  it('observes compatibility changes while an older object remains in storage', async () => {
    const settings = currentPreferences()
    await saveSettings(settings)
    await setSync({ [SETTINGS_STORAGE_KEY]: legacy.settings })
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    await Promise.resolve()
    await Promise.resolve()
    try {
      await setSync({ [SETTINGS_COMPATIBILITY_KEY]: { ...settings, autoNextEpisode: false } })
      expect(receive).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ autoNextEpisode: false, seekShortcuts: settings.seekShortcuts }))
    } finally {
      unsubscribe()
    }
  })

  it('prefers a complete current write over an older compatibility snapshot', async () => {
    await saveSettings(currentPreferences())
    await setSync({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS })
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it.each([{ version: 27 }, { ...DEFAULT_SETTINGS, version: SHORTCUT_SETTINGS_VERSION + 1 }])('ignores invalid or unsupported compatibility data', async compatibility => {
    await setSync({ [SETTINGS_STORAGE_KEY]: legacy.settings, [SETTINGS_COMPATIBILITY_KEY]: compatibility })
    expect(await getSettings()).toEqual(normalizeSettings(legacy.settings))
  })

  it('retains recovery preferences in the browser preview fallback', async () => {
    vi.stubGlobal('chrome', undefined)
    try {
      localStorage.clear()
      const settings = currentPreferences()
      await saveSettings(settings)
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(legacy.settings))
      expect(await getSettings()).toMatchObject({ seekShortcuts: settings.seekShortcuts, autoNextEpisode: true })
      const restored = parseSettingsBackup(JSON.stringify(createSettingsBackup(await getSettings(), { extensionVersion: 'test' })))
      expect(restored).toMatchObject({ ok: true, value: { settings: await getSettings() } })
    } finally {
      localStorage.clear()
      vi.unstubAllGlobals()
    }
  })
})
