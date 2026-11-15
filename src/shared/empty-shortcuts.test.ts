import { describe, expect, it } from 'vitest'
import { applyShortcutAssignment, inspectShortcutAssignment } from './shortcut-assignment'
import { DEFAULT_KEY_BINDINGS, findActionForKey, findRemappedNetflixNativeActionForKey, keyBindingsEqual } from './shortcut-bindings'
import { getSubtitleNavigationAvailability, resolvePlaybackShortcut } from './shortcut-routing'
import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup, SHORTCUT_SETTINGS_VERSION } from './shortcut-settings'
import { createSettingsBackup, parseSettingsBackup, serializeSettingsBackup } from './settings-backup'
import { getSettings, saveSettings } from './storage'
import { SHORTCUT_ACTIONS, SUBTITLE_NAVIGATION_ACTIONS, type ShortcutSettings } from './shortcut-types'

const emptySettings = (): ShortcutSettings => {
  const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
  for (const action of SHORTCUT_ACTIONS) settings.bindings[action].key = null
  for (const action of SUBTITLE_NAVIGATION_ACTIONS) settings.subtitleNavigation.bindings[action].key = null
  settings.subtitleNavigation.enabled = true
  settings.seekShortcuts = [{ id: 'seek:empty-pair', kind: 'relative', value: 17 }, { id: 'seek:empty-jump', kind: 'percentage', value: 37 }]
  for (const action of ['seek:empty-pair-backward', 'seek:empty-pair-forward', 'seek:empty-jump'] as const) {
    settings.bindings[action] = { enabled: true, key: null }
  }
  settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:empty', kind: 'fixed', sizes: [150] }]
  settings.bindings['subtitle-size:empty'] = { enabled: false, key: null }
  return settings
}

describe('empty shortcut persistence and routing', () => {
  it('preserves every kind of empty shortcut through normalization, storage and backup restore', async () => {
    const settings = emptySettings()
    expect(normalizeSettings(settings)).toEqual(settings)
    await saveSettings(settings)
    expect(await getSettings()).toEqual(settings)
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.8' })
    const restored = parseSettingsBackup(serializeSettingsBackup(backup))
    expect(restored).toMatchObject({ ok: true, value: { settingsVersion: SHORTCUT_SETTINGS_VERSION, settings } })
  })

  it('accepts explicit null while rejecting missing and malformed keys in backups', () => {
    const settings = emptySettings()
    expect(parseSettingsForBackup(settings)).toMatchObject({ ok: true })
    for (const key of [undefined, '', {}, { ...DEFAULT_KEY_BINDINGS.mute, code: '' }]) {
      const raw = structuredClone(settings)
      Object.assign(raw.bindings.mute, { key })
      expect(parseSettingsForBackup(raw)).toEqual({ ok: false, error: 'invalidSettings' })
    }
    expect(parseSettingsForBackup({ ...settings, version: 26 })).toEqual({ ok: false, error: 'invalidSettings' })
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, version: 26 })).toEqual(DEFAULT_SETTINGS)
  })

  it('does not match empty keys or suppress their former Netflix keys', () => {
    const settings = emptySettings()
    for (const key of Object.values(DEFAULT_KEY_BINDINGS)) {
      const event = { code: key.code, key: key.key, ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta }
      expect(findActionForKey(settings, event)).toBeNull()
      expect(resolvePlaybackShortcut(settings, event, true)).toBeNull()
      expect(findRemappedNetflixNativeActionForKey(settings, event)).toBeNull()
    }
    for (const action of SUBTITLE_NAVIGATION_ACTIONS) {
      expect(getSubtitleNavigationAvailability(settings, action, true).overridingAction).toBeUndefined()
    }
    expect(keyBindingsEqual(null, null)).toBe(true)
    expect(keyBindingsEqual(null, DEFAULT_KEY_BINDINGS.mute)).toBe(false)
  })

  it('does not treat multiple empty fields as conflicting keys', () => {
    const settings = emptySettings()
    const assignments = [
      { group: 'general' as const, action: 'seekBackward' as const, key: null },
      { group: 'general' as const, action: 'seekForward' as const, key: null },
    ]
    const options = { enabled: true, supportsSubtitlePreservingPip: true }
    expect(inspectShortcutAssignment(settings, assignments, options)).toMatchObject({ conflicts: [], hasDuplicateKeys: false })
    expect(applyShortcutAssignment(settings, assignments, options)).not.toBe(settings)
    const reassigned = applyShortcutAssignment(settings, [{ group: 'general', action: 'mute', savedKey: null, key: DEFAULT_KEY_BINDINGS.mute }], options)
    expect(reassigned.bindings.mute.key).toEqual(DEFAULT_KEY_BINDINGS.mute)
    expect(applyShortcutAssignment(reassigned, [{ group: 'general', action: 'mute', savedKey: null, key: null }], options)).toBe(reassigned)
  })
})
