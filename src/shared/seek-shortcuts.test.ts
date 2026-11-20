import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings } from './shortcut-settings'
import { getShortcutActions } from './shortcut-bindings'
import { resolvePlaybackShortcut } from './shortcut-routing'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'
import { getSeekShortcutLabel } from './seek-shortcuts'
import type { SeekShortcut, ShortcutSettings } from './shortcut-types'
import { legacySubtitleNavigation } from './fixtures/legacy-subtitle-navigation'

const customSettings = (): ShortcutSettings => ({
  ...structuredClone(DEFAULT_SETTINGS),
  seekShortcuts: [{ id: 'seek:progress', kind: 'percentage', value: 37 }, { id: 'seek:rewind', kind: 'relative', value: 15 }],
  bindings: { ...DEFAULT_SETTINGS.bindings,
    'seek:progress': { enabled: true, key: { code: 'Digit5', key: '5', ctrl: false, alt: false, shift: false, meta: false } },
    'seek:rewind-forward': { enabled: true, key: { code: 'KeyL', key: 'l', ctrl: false, alt: false, shift: false, meta: false } },
    'seek:rewind-backward': { enabled: false, key: { code: 'KeyJ', key: 'j', ctrl: false, alt: false, shift: false, meta: false } },
  },
})

describe('custom seeking', () => {
  it('preserves multiple intervals, percentages and disabled assignments through normalization and backup', () => {
    const settings = customSettings()
    expect(normalizeSettings(settings)).toEqual(settings)
    const backup = createSettingsBackup(settings, { extensionVersion: 'test' })
    expect(parseSettingsBackup(JSON.stringify(backup))).toMatchObject({ ok: true, value: { settings } })
    expect(getSeekShortcutLabel(settings.seekShortcuts[0], 'zh-TW')).toBe('37%')
    expect(getSeekShortcutLabel(settings.seekShortcuts[1], 'zh-TW', 'backward')).toBe('後退 15 秒')
  })

  it('routes enabled custom rows and releases disabled keys', () => {
    const settings = customSettings()
    const key = settings.bindings['seek:progress'].key!
    const event = { code: key.code, key: key.key, ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta }
    expect(resolvePlaybackShortcut(settings, event, true)).toEqual({ group: 'general', action: 'seek:progress', supported: true })
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.next.key = key
    expect(resolvePlaybackShortcut(settings, event, true)).toMatchObject({ group: 'general', action: 'seek:progress' })
    settings.subtitleNavigation.enabled = false
    settings.bindings['seek:progress'].enabled = false
    expect(resolvePlaybackShortcut(settings, event, true)).toBeNull()
  })

  it.each([
    { id: 'seek:progress', kind: 'percentage', value: -1 },
    { id: 'seek:progress', kind: 'percentage', value: 101 },
    { id: 'seek:progress', kind: 'percentage', value: 1.5 },
    { id: 'seek:progress', kind: 'relative', value: 0 },
    { id: 'seek:progress', kind: 'relative', value: -15 },
    { id: 'seek:progress', kind: 'relative', value: 301 },
    { id: 'seek:progress', kind: 'relative', value: 3601 },
    { id: 'seek:progress', kind: 'unknown', value: 50 },
    { id: 'playPause', kind: 'percentage', value: 50 },
  ])('repairs invalid synced rows but rejects them in a current backup: %j', invalid => {
    const settings = { ...customSettings(), seekShortcuts: [invalid] as SeekShortcut[] }
    expect(normalizeSettings(settings).seekShortcuts).toEqual([])
    const backup = { ...createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: 'test' }), settings }
    expect(parseSettingsBackup(JSON.stringify(backup))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('rejects duplicate IDs, absent custom bindings, and missing current lists in backups', () => {
    const settings = customSettings()
    const backup = createSettingsBackup(settings, { extensionVersion: 'test' })
    for (const seekShortcuts of [[settings.seekShortcuts[0], settings.seekShortcuts[0]], [{ id: 'seek:missing', kind: 'relative', value: 15 }], undefined]) {
      expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: { ...settings, seekShortcuts } })))
        .toEqual({ ok: false, error: 'invalidSettings' })
    }
  })

  it.each([301, 3600])('migrates a legacy %i-second pair to 300 seconds without losing its bindings', seconds => {
    const legacy = customSettings()
    legacy.version = 31
    legacy.seekShortcuts[1].value = seconds
    const migrated = normalizeSettings(legacy)
    expect(migrated.seekShortcuts[1]).toEqual({ ...legacy.seekShortcuts[1], value: 300 })
    expect(migrated.bindings['seek:rewind-backward']).toEqual(legacy.bindings['seek:rewind-backward'])
    expect(migrated.bindings['seek:rewind-forward']).toEqual(legacy.bindings['seek:rewind-forward'])
    const backup = { ...createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: 'test' }), settings: legacy }
    expect(parseSettingsBackup(JSON.stringify(backup))).toMatchObject({ ok: true, value: { settings: migrated } })
  })

  it('requires both pair bindings and rejects overlapping action identities in a current backup', () => {
    const settings = customSettings()
    const backup = createSettingsBackup(settings, { extensionVersion: 'test' })
    for (const direction of ['backward', 'forward'] as const) {
      const incomplete = structuredClone(settings)
      delete incomplete.bindings[`seek:rewind-${direction}`]
      expect(normalizeSettings(incomplete).seekShortcuts).toEqual([settings.seekShortcuts[0]])
      expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: incomplete }))).toEqual({ ok: false, error: 'invalidSettings' })
    }
    const overlap = { ...settings, seekShortcuts: [...settings.seekShortcuts, { id: 'seek:rewind-forward' as const, kind: 'percentage' as const, value: 50 }] }
    expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: overlap }))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it.each([15, 1800])('migrates old opposite %i-second directions and retains their keys and enabled states', seconds => {
    const legacy = { ...customSettings(), version: 22,
      subtitleNavigation: legacySubtitleNavigation(),
      seekShortcuts: [{ id: 'seek:old-back' as const, kind: 'relative' as const, value: -seconds }, { id: 'seek:progress' as const, kind: 'percentage' as const, value: 37 }, { id: 'seek:old-forward' as const, kind: 'relative' as const, value: seconds }],
      bindings: { ...DEFAULT_SETTINGS.bindings,
        'seek:old-back': { enabled: false, key: { code: 'KeyJ', key: 'j', ctrl: false, alt: false, shift: false, meta: false } },
        'seek:old-forward': { enabled: true, key: { code: 'KeyL', key: 'l', ctrl: false, alt: false, shift: false, meta: false } },
        'seek:progress': customSettings().bindings['seek:progress'],
      },
    }
    const migrated = normalizeSettings(legacy)
    expect(migrated.seekShortcuts).toEqual([{ id: 'seek:old-back', kind: 'relative', value: Math.min(seconds, 300) }, { id: 'seek:progress', kind: 'percentage', value: 37 }])
    expect(migrated.bindings['seek:old-back-backward']).toEqual(legacy.bindings['seek:old-back'])
    expect(migrated.bindings['seek:old-back-forward']).toEqual(legacy.bindings['seek:old-forward'])
    expect(migrated.bindings['seek:old-back']).toBeUndefined()
    expect(normalizeSettings(migrated)).toEqual(migrated)
    expect(parseSettingsBackup(JSON.stringify({ ...createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: 'test' }), settings: legacy })))
      .toMatchObject({ ok: true, value: { settings: migrated } })
  })

  it('preserves a legacy single direction and leaves its new counterpart disabled', () => {
    const saved = customSettings().bindings['seek:progress']
    const migrated = normalizeSettings({ ...DEFAULT_SETTINGS, version: 22,
      seekShortcuts: [{ id: 'seek:old', kind: 'relative', value: 30 }],
      bindings: { ...DEFAULT_SETTINGS.bindings, 'seek:old': saved },
    })
    expect(migrated.bindings['seek:old-forward']).toEqual(saved)
    expect(migrated.bindings['seek:old-backward']).toEqual({ ...saved, enabled: false })
  })

  it('migrates v21 without stealing an existing Shift+N or Shift+P assignment', () => {
    const settings = customSettings()
    settings.subtitleNavigation = legacySubtitleNavigation()
    const { nextEpisode, previousEpisode, ...bindings } = settings.bindings
    bindings.mute = { enabled: true, key: nextEpisode.key }
    bindings.fullscreen = { enabled: true, key: previousEpisode.key }
    const migrated = normalizeSettings({ ...settings, version: 21, seekShortcuts: undefined, bindings })
    expect(migrated.seekShortcuts).toEqual([])
    expect(migrated.bindings.mute).toEqual(bindings.mute)
    expect(migrated.bindings.fullscreen).toEqual(bindings.fullscreen)
    expect(migrated.bindings.nextEpisode.enabled).toBe(false)
    expect(migrated.bindings.previousEpisode.enabled).toBe(false)
    expect(getShortcutActions(migrated)).not.toContain('seek:progress')
    const legacy = { ...createSettingsBackup(settings, { extensionVersion: 'test' }), settings: { ...settings, version: 21, seekShortcuts: undefined, bindings } }
    expect(parseSettingsBackup(JSON.stringify(legacy))).toMatchObject({ ok: true, value: { settings: migrated } })
  })
})
