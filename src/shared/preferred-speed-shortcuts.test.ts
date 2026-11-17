import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup } from './shortcut-settings'
import { recoverCompatibleSettings } from './settings-compatibility'
import { findActionForKey, getShortcutActions } from './shortcut-bindings'
import type { ShortcutSettings } from './shortcut-types'

const settingsWithSpeeds = (): ShortcutSettings => {
  const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
  settings.speed.preferred = 1.75
  settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:slow', speed: 0.75 }, { id: 'preferred-speed:fast', speed: 5 }]
  settings.bindings['preferred-speed:slow'] = { enabled: false, key: null }
  settings.bindings['preferred-speed:fast'] = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'Digit2', key: '2' } }
  return settings
}

describe('multiple preferred speeds', () => {
  it('migrates the original speed and binding without creating or changing custom entries', () => {
    const legacy = settingsWithSpeeds()
    const settings = normalizeSettings({ ...legacy, preferredSpeedShortcuts: undefined, version: 28 })
    expect(settings.preferredSpeedShortcuts).toEqual([])
    expect(settings.speed.preferred).toBe(1.75)
    expect(settings.bindings.setPreferredSpeed).toEqual(legacy.bindings.setPreferredSpeed)
  })

  it('round-trips enabled, disabled and unassigned entries and resolves each key independently', () => {
    const settings = settingsWithSpeeds()
    expect(normalizeSettings(settings)).toEqual(settings)
    expect(parseSettingsForBackup(settings as unknown as Record<string, unknown>)).toMatchObject({ ok: true, settings })
    expect(getShortcutActions(settings)).toContain('preferred-speed:slow')
    expect(findActionForKey(settings, { code: 'Digit2', key: '2', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false })).toBe('preferred-speed:fast')
    settings.bindings['preferred-speed:fast'].enabled = false
    expect(findActionForKey(settings, { code: 'Digit2', key: '2', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false })).toBeNull()
  })

  it('rejects incomplete current backups and drops invalid stored entries with their bindings', () => {
    const settings = settingsWithSpeeds()
    for (const preferredSpeedShortcuts of [undefined, [{ id: 'preferred-speed:bad', speed: 5.05 }], [{ id: 'preferred-speed:bad', speed: 1.23 }],
      [settings.preferredSpeedShortcuts[0], settings.preferredSpeedShortcuts[0]], [{ id: 'seek:wrong', speed: 2 }]]) {
      expect(parseSettingsForBackup({ ...settings, preferredSpeedShortcuts })).toEqual({ ok: false, error: 'invalidSettings' })
    }
    const missingBinding = { ...settings, bindings: DEFAULT_SETTINGS.bindings }
    expect(parseSettingsForBackup(missingBinding)).toEqual({ ok: false, error: 'invalidSettings' })
    expect(normalizeSettings(missingBinding).preferredSpeedShortcuts).toEqual([])
  })

  it('retains new entries across older-client saves and lets older key owners take precedence', () => {
    const saved = settingsWithSpeeds()
    const legacy = { ...DEFAULT_SETTINGS, version: 28, preferredSpeedShortcuts: undefined,
      speed: { ...DEFAULT_SETTINGS.speed, preferred: 2.5 }, bindings: { ...DEFAULT_SETTINGS.bindings, mute: saved.bindings['preferred-speed:fast'] } }
    const recovered = recoverCompatibleSettings(legacy, saved)
    expect(recovered.preferredSpeedShortcuts).toEqual(saved.preferredSpeedShortcuts)
    expect(recovered.speed.preferred).toBe(2.5)
    expect(recovered.bindings['preferred-speed:fast'].enabled).toBe(false)
    expect(recoverCompatibleSettings(DEFAULT_SETTINGS, saved).preferredSpeedShortcuts).toEqual([])
  })
})
