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
  it('enables the new Previous episode default when Firefox upgrades or imports legacy PiP settings', async () => {
    const browser = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/128.0')
    try {
      await setSync({ [SETTINGS_STORAGE_KEY]: legacy.settings })
      const expected = {
        bindings: {
          previousEpisode: DEFAULT_SETTINGS.bindings.previousEpisode,
          pictureInPicture: legacy.settings.bindings.pictureInPicture,
        },
      }
      expect(await getSettings()).toMatchObject(expected)
      expect(parseSettingsBackup(JSON.stringify(legacy.backup)))
        .toMatchObject({ ok: true, value: { settings: expected } })
    } finally {
      browser.mockRestore()
    }
  })

  it.each(addedActions)('preserves saved general keys and disabled masters when introducing %s', async action => {
    const raw = structuredClone(legacy.settings)
    raw.bindings.pictureInPicture.key = { ...DEFAULT_SETTINGS.bindings.pictureInPicture.key }
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
    raw.bindings.pictureInPicture.key = { ...DEFAULT_SETTINGS.bindings.pictureInPicture.key }
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
  it('keeps both Previous episode keys active when a legacy Firefox client syncs its PiP key', async () => {
    const browser = vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/128.0')
    try {
      const current = structuredClone(DEFAULT_SETTINGS)
      const mediaKey = { code: 'MediaTrackPrevious', key: 'MediaTrackPrevious', ctrl: false, alt: false, shift: false, meta: false }
      current.bindings.previousEpisode.additionalKeys = [mediaKey]
      await saveSettings(current)

      const oldWrite = { ...structuredClone(legacy.settings), theme: 'dark' }
      await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
      const recovered = await getSettings()
      expect(recovered.theme).toBe('dark')
      expect(recovered.bindings.previousEpisode).toEqual(current.bindings.previousEpisode)
      expect(recovered.bindings.pictureInPicture).toEqual(oldWrite.bindings.pictureInPicture)
      for (const binding of [current.bindings.previousEpisode.key, mediaKey]) {
        expect(resolvePlaybackShortcut(recovered, {
          code: binding.code, key: binding.key,
          ctrlKey: binding.ctrl, altKey: binding.alt, shiftKey: binding.shift, metaKey: binding.meta,
        }, false)).toEqual({ group: 'general', action: 'previousEpisode', supported: true })
      }
    } finally {
      browser.mockRestore()
    }
  })

  it('preserves saved beta.3 episode, media, and PiP shortcuts on load and backup import', async () => {
    const saved = structuredClone(DEFAULT_SETTINGS)
    saved.bindings.previousEpisode.key = { code: 'KeyP', key: 'p', ctrl: true, alt: false, shift: false, meta: false }
    saved.bindings.nextEpisode.key = { code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: false, meta: false }
    saved.bindings.nextEpisode.additionalKeys = [
      { code: 'MediaTrackNext', key: 'MediaTrackNext', ctrl: false, alt: false, shift: false, meta: false },
    ]
    saved.bindings.pictureInPicture.key = { code: 'KeyP', key: 'P', ctrl: false, alt: false, shift: true, meta: false }
    await setSync({ [SETTINGS_STORAGE_KEY]: saved })

    expect((await getSettings()).bindings).toEqual(saved.bindings)
    expect(parseSettingsBackup(JSON.stringify(createSettingsBackup(saved, { extensionVersion: '0.6.9' }))))
      .toMatchObject({ ok: true, value: { settings: { bindings: saved.bindings } } })
  })

  it.each([
    { client: 'v0.6.8', version: legacy.settings.version, key: legacy.settings.bindings.pictureInPicture.key },
    { client: 'schema v1', version: 1, key: { ...legacy.settings.bindings.pictureInPicture.key, code: 'KeyW', key: 'W' } },
  ])('keeps PiP unassigned after $client syncs its historical default', async ({ version, key }) => {
    const current: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    current.bindings.pictureInPicture.key = null
    await saveSettings(current)

    const oldWrite = { ...structuredClone(legacy.settings), version, theme: 'dark' }
    oldWrite.bindings.pictureInPicture.key = { ...key }
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    expect(await getSettings()).toMatchObject({
      theme: 'dark',
      bindings: {
        pictureInPicture: { enabled: true, key: null },
        previousEpisode: current.bindings.previousEpisode,
      },
    })

    oldWrite.bindings.pictureInPicture.key = { ...DEFAULT_SETTINGS.bindings.pictureInPicture.key }
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    expect((await getSettings()).bindings.pictureInPicture).toEqual(oldWrite.bindings.pictureInPicture)
  })

  it('keeps cleared episode shortcuts unassigned after schema v26 syncs its historical defaults', async () => {
    const current: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    current.bindings.previousEpisode.key = null
    current.bindings.nextEpisode.key = null
    await saveSettings(current)

    const oldWrite = { ...structuredClone(DEFAULT_SETTINGS), version: 26 }
    oldWrite.bindings.previousEpisode.key = { code: 'KeyP', key: 'p', ctrl: true, alt: false, shift: false, meta: false }
    oldWrite.bindings.nextEpisode.key = { code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: false, meta: false }
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })

    const { bindings } = await getSettings()
    expect(bindings.previousEpisode).toEqual(current.bindings.previousEpisode)
    expect(bindings.nextEpisode).toEqual(current.bindings.nextEpisode)
  })

  it('recovers additional shortcuts after beta.2 writes both of its sync records', async () => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const mediaKey = { code: 'MediaTrackNext', key: 'MediaTrackNext', ctrl: false, alt: false, shift: false, meta: false }
    current.bindings.nextEpisode.additionalKeys = [mediaKey]
    await saveSettings(current)
    const old = { ...structuredClone(DEFAULT_SETTINGS), version: 32, theme: 'dark' }
    await setSync({
      [SETTINGS_STORAGE_KEY]: { ...old, spaceHold: old.holdSpeed, subtitlePractice: old.subtitleNavigation },
      shortcutSettingsCompatibility: old,
      shortcutUiStyle: old.uiStyle,
    })
    expect(await getSettings()).toMatchObject({ theme: 'dark', bindings: { nextEpisode: { additionalKeys: [mediaKey] } } })
    await initializeSettingsCompatibility()
    expect(await getSettings()).toMatchObject({ bindings: { nextEpisode: { additionalKeys: [mediaKey] } } })
  })

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
        await setSync({ [SETTINGS_STORAGE_KEY]: raw, shortcutSettingsCompatibility: previous })
      } else {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(raw))
        localStorage.setItem('shortcutSettingsCompatibility', JSON.stringify(previous))
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

  it('preserves a legacy key owner when recovering a conflicting additional key', async () => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyX', key: 'x' }
    current.bindings.nextFrame.additionalKeys = [key]
    await saveSettings(current)
    const oldWrite = structuredClone(legacy.settings)
    oldWrite.bindings.mute.key = key
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })
    const settings = await getSettings()
    expect(settings.bindings.nextFrame).toEqual({ ...current.bindings.nextFrame, enabled: false })
    expect(resolvePlaybackShortcut(settings, {
      ...key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    }, true)).toEqual({ group: 'general', action: 'mute', supported: true })
  })

  it.each(['general', 'subtitleNavigation'] as const)('disables a shared %s action that owns a legacy assignment as an additional key', async group => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const oldWrite = { ...structuredClone(DEFAULT_SETTINGS), version: 32 }
    const key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyX', key: 'x' }
    const otherKey = { ...key, code: 'KeyY', key: 'y' }
    const binding = group === 'general' ? current.bindings.playPause : current.subtitleNavigation.bindings.previous
    binding.additionalKeys = [key, otherKey]
    current.subtitleNavigation.enabled = true
    oldWrite.subtitleNavigation.enabled = true
    oldWrite.bindings.nextEpisode.key = key
    await saveSettings(current)
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })

    const settings = await getSettings()
    const disabled = group === 'general' ? settings.bindings.playPause : settings.subtitleNavigation.bindings.previous
    expect(disabled).toEqual({ ...binding, enabled: false })
    expect(resolvePlaybackShortcut(settings, {
      ...key, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    }, true)).toEqual({ group: 'general', action: 'nextEpisode', supported: true })
  })

  it('disables both seek directions and retains their keys when a legacy assignment takes an additional key', async () => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const oldWrite = { ...structuredClone(DEFAULT_SETTINGS), version: 32 }
    const key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyX', key: 'x' }
    current.bindings.seekBackward.additionalKeys = [key]
    current.bindings.seekForward.additionalKeys = [{ ...key, code: 'KeyY', key: 'y' }]
    oldWrite.bindings.nextEpisode.key = key
    await saveSettings(current)
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })

    const settings = await updateSettings(current => ({ ...current, theme: 'dark' }))
    expect(settings.bindings.seekBackward).toEqual({ ...current.bindings.seekBackward, enabled: false })
    expect(settings.bindings.seekForward).toEqual({ ...current.bindings.seekForward, enabled: false })
    expect(settings.bindings.nextEpisode).toEqual(oldWrite.bindings.nextEpisode)
    expect(await getSettings()).toEqual(settings)
  })

  it('keeps an action enabled when a legacy client makes its own additional key primary', async () => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const oldWrite = { ...structuredClone(DEFAULT_SETTINGS), version: 32 }
    const key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyX', key: 'x' }
    const otherKey = { ...key, code: 'KeyY', key: 'y' }
    current.bindings.nextEpisode.additionalKeys = [key, otherKey]
    oldWrite.bindings.nextEpisode.key = key
    await saveSettings(current)
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })

    expect((await getSettings()).bindings.nextEpisode).toEqual({ enabled: true, key, additionalKeys: [otherKey] })
  })

  it.each([false, true])('retains additional keys after the older client clears the primary (conflict: %s)', async conflict => {
    const current = structuredClone(DEFAULT_SETTINGS)
    const oldWrite: ShortcutSettings = { ...structuredClone(DEFAULT_SETTINGS), version: 32 }
    const key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'MediaTrackNext', key: 'MediaTrackNext' }
    const otherKey = { ...key, code: 'F20', key: 'F20' }
    current.bindings.nextEpisode.additionalKeys = [key, otherKey]
    oldWrite.bindings.nextEpisode.key = null
    if (conflict) oldWrite.bindings.mute.key = key
    await saveSettings(current)
    await setSync({ [SETTINGS_STORAGE_KEY]: oldWrite })

    const settings = await getSettings()
    expect(settings.bindings.nextEpisode).toEqual({ enabled: !conflict, key, additionalKeys: [otherKey] })
    expect(settings.bindings.mute).toEqual(oldWrite.bindings.mute)
  })

  it('ignores malformed additional keys when migrating legacy settings or backups', () => {
    const raw = structuredClone(legacy.settings)
    const expected = normalizeSettings(raw)
    Object.assign(raw.bindings.mute, { additionalKeys: {} })
    expect(normalizeSettings(raw)).toEqual(expected)
    expect(parseSettingsBackup(JSON.stringify({ ...legacy.backup, settings: raw })))
      .toMatchObject({ ok: true, value: { settings: expected } })
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
        previousEpisode: { ...settings.bindings.previousEpisode, enabled: false },
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
