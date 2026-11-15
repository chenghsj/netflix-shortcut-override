import { describe, expect, it } from 'vitest'

import {
  SETTINGS_BACKUP_FORMAT,
  SETTINGS_BACKUP_FORMAT_VERSION,
  createSettingsBackup,
  getSettingsBackupFilename,
  parseSettingsBackup,
  serializeSettingsBackup,
} from '@/shared/settings-backup'
import {
  DEFAULT_SETTINGS,
  SHORTCUT_SETTINGS_VERSION,
} from '@/shared/shortcut-settings'
import { UI_STYLES } from '@/shared/ui-styles'
import { legacySubtitleNavigation } from './fixtures/legacy-subtitle-navigation'

const exportedAt = new Date('2026-08-12T03:04:05.000Z')

const createVersion9Settings = () => {
  const { holdSpeed, ...settings } = DEFAULT_SETTINGS
  const speed = {
    min: settings.speed.min,
    max: settings.speed.max,
    step: settings.speed.step,
  }
  const bindings = Object.fromEntries(
    Object.entries(settings.bindings).filter(([action]) => action !== 'setPreferredSpeed')
  )

  return {
    ...settings,
    version: 9,
    speed,
    spaceHold: holdSpeed,
    bindings,
  }
}

describe('settings backup', () => {
  it.each([true, false])('round-trips the pause overlay preference %s and upgrades older backups', hidePauseOverlay => {
    const backup = createSettingsBackup({ ...DEFAULT_SETTINGS, hidePauseOverlay }, { extensionVersion: '0.6.9', exportedAt })
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({ ok: true, value: { settings: { hidePauseOverlay } } })
    expect(parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...backup.settings, version: 30, hidePauseOverlay: undefined },
    }))).toMatchObject({ ok: true, value: { settings: { hidePauseOverlay: false } } })
    for (const invalid of [undefined, 'false', 0, null]) {
      expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: { ...backup.settings, hidePauseOverlay: invalid } })))
        .toEqual({ ok: false, error: 'invalidSettings' })
    }
  })

  it('migrates v20 with auto next episode off and round-trips the new preference', () => {
    const backup = createSettingsBackup({ ...DEFAULT_SETTINGS, autoNextEpisode: true }, { extensionVersion: '0.6.8', exportedAt })
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({
      ok: true, value: { settings: { autoNextEpisode: true } },
    })
    expect(parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...backup.settings, version: 20, subtitleNavigation: legacySubtitleNavigation(), autoNextEpisode: undefined },
    }))).toMatchObject({ ok: true, value: { settings: { autoNextEpisode: false } } })
    for (const autoNextEpisode of [undefined, 'true', 1]) {
      expect(parseSettingsBackup(JSON.stringify({
        ...backup, settings: { ...backup.settings, autoNextEpisode },
      }))).toEqual({ ok: false, error: 'invalidSettings' })
    }
  })

  it.each([true, false])('migrates v19 caption size without taking an existing enabled Shift+V binding (%s)', enabled => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8', exportedAt })
    const key = DEFAULT_SETTINGS.bindings.cycleSubtitleSize.key
    const mute = { enabled, key }
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: { ...backup.settings, version: 19, subtitleNavigation: legacySubtitleNavigation(), subtitleSize: undefined,
        bindings: { ...backup.settings.bindings, cycleSubtitleSize: undefined, mute } },
    }))
    expect(result).toMatchObject({ ok: true, value: { settings: {
      subtitleSize: 'medium', bindings: { mute, cycleSubtitleSize: { enabled: !enabled, key } },
    } } })
  })

  it('round-trips caption size and rejects invalid or missing current caption settings', () => {
    const settings = { ...DEFAULT_SETTINGS, subtitleSize: 'large' as const }
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.8', exportedAt })
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({ ok: true, value: { settings } })
    for (const subtitleSize of [undefined, 'huge']) {
      expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: { ...settings, subtitleSize } })))
        .toEqual({ ok: false, error: 'invalidSettings' })
    }
    expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: {
      ...settings, bindings: { ...settings.bindings, cycleSubtitleSize: undefined },
    } }))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it.each([11, 12, 13])('imports the original subtitle field from a schema v%s backup', version => {
    const subtitleNavigation = structuredClone(DEFAULT_SETTINGS.subtitleNavigation)
    subtitleNavigation.enabled = true
    subtitleNavigation.bindings.next.key = { code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: false, meta: false }
    subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    const backup = createSettingsBackup({ ...DEFAULT_SETTINGS, subtitleNavigation }, { extensionVersion: '0.6.4', exportedAt })
    const settings = { ...backup.settings, subtitleNavigation: undefined }
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: {
        ...settings,
        version,
        subtitlePractice: version === 11 ? { enabled: true } : subtitleNavigation,
      },
    }))

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.settings.subtitleNavigation).toEqual(version === 11
        ? { ...DEFAULT_SETTINGS.subtitleNavigation, enabled: true } : subtitleNavigation)
      expect(result.value.settings).not.toHaveProperty('subtitlePractice')
    }
    expect(backup.settings).toHaveProperty('subtitleNavigation')
    expect(backup.settings).not.toHaveProperty('subtitlePractice')
  })

  it.each([12, 13])('rejects incomplete subtitle bindings in a schema v%s backup', version => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.4', exportedAt })
    const settings = { ...backup.settings, subtitleNavigation: undefined }
    expect(parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: { ...settings, version, subtitlePractice: { enabled: true, bindings: {} } },
    }))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('requires the canonical subtitle field in a current backup', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.6', exportedAt })
    const { subtitleNavigation, ...settings } = backup.settings
    expect(parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...settings, subtitlePractice: subtitleNavigation },
    }))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('restores v14 backups without enabling auto skip', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8', exportedAt })
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: { ...backup.settings, version: 14, subtitleNavigation: legacySubtitleNavigation(), autoSkip: undefined },
    }))
    expect(result).toMatchObject({
      ok: true,
      value: { settingsVersion: 14, settings: { autoSkip: { intro: false, recap: false } } },
    })
  })

  it('restores v16 backups with an empty favorites list and preserves favorites in the current version', () => {
    const subtitleFavorites = [
      { language: 'zh-Hant' },
      { language: 'ja' },
    ] as const
    const backup = createSettingsBackup(
      { ...DEFAULT_SETTINGS, subtitleFavorites: [...subtitleFavorites] },
      { extensionVersion: '0.6.8', exportedAt }
    )
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({
      ok: true, value: { settingsVersion: SHORTCUT_SETTINGS_VERSION, settings: { subtitleFavorites } },
    })
    expect(parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...backup.settings, version: 16, subtitleNavigation: legacySubtitleNavigation(), subtitleFavorites: undefined },
    }))).toMatchObject({
      ok: true, value: { settingsVersion: 16, settings: { subtitleFavorites: [] } },
    })
    expect(parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...backup.settings, subtitleFavorites: [...subtitleFavorites, subtitleFavorites[0]] },
    }))).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('merges duplicate language variants from v18 while preserving their first position', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8', exportedAt })
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: { ...backup.settings, version: 18, subtitleNavigation: legacySubtitleNavigation(), subtitleFavorites: [
        { language: 'ja', kind: 'standard' },
        { language: 'en', kind: 'cc' },
        { language: 'ja', kind: 'cc' },
        { language: 'zh-Hant', kind: 'standard' },
      ] },
    }))
    expect(result).toMatchObject({
      ok: true,
      value: { settings: { version: SHORTCUT_SETTINGS_VERSION, subtitleFavorites: [
        { language: 'ja' }, { language: 'en' }, { language: 'zh-Hant' },
      ] } },
    })
  })

  it.each([true, false])('restores a v15 backup whose Shift+C binding is enabled: %s', enabled => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8', exportedAt })
    const shiftC = DEFAULT_SETTINGS.bindings.cycleSubtitleTrack.key
    const mute = { enabled, key: shiftC }
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: {
        ...backup.settings,
        version: 15,
        subtitleNavigation: legacySubtitleNavigation(),
        bindings: { ...backup.settings.bindings, cycleSubtitleTrack: undefined, mute },
      },
    }))
    expect(result).toMatchObject({
      ok: true,
      value: { settings: { bindings: { mute, cycleSubtitleTrack: { enabled: !enabled, key: shiftC } } } },
    })
  })

  it.each([true, false])('preserves an existing Shift+X binding from v17 when enabled: %s', enabled => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8', exportedAt })
    const shiftX = DEFAULT_SETTINGS.bindings.previousSubtitleTrack.key
    const mute = { enabled, key: shiftX }
    const result = parseSettingsBackup(JSON.stringify({
      ...backup,
      settings: {
        ...backup.settings,
        version: 17,
        subtitleNavigation: legacySubtitleNavigation(),
        bindings: { ...backup.settings.bindings, previousSubtitleTrack: undefined, mute },
      },
    }))
    expect(result).toMatchObject({
      ok: true,
      value: { settings: { bindings: { mute, previousSubtitleTrack: { enabled: !enabled, key: shiftX } } } },
    })
  })

  it('restores a version 12 backup without a style using Classic', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.4', exportedAt })
    const { subtitleNavigation: ignored, ...settings } = backup.settings
    void ignored
    const result = parseSettingsBackup(JSON.stringify({
      ...backup, settings: { ...settings, version: 12, uiStyle: undefined, subtitlePractice: legacySubtitleNavigation() },
    }))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.settings.uiStyle).toBe('classic')
      expect(result.value.settings.version).toBe(SHORTCUT_SETTINGS_VERSION)
    }
  })

  it.each(UI_STYLES)('round-trips the %s style and brightness', uiStyle => {
    const settings = { ...DEFAULT_SETTINGS, uiStyle, theme: 'dark' as const }
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.4', exportedAt })
    const result = parseSettingsBackup(serializeSettingsBackup(backup))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.settings).toEqual(settings)
  })

  it.each([undefined, null, 'unknown'])('rejects a current backup with invalid style %s', uiStyle => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.4', exportedAt })
    expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: { ...backup.settings, uiStyle } })))
      .toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('creates and serializes a stable complete backup envelope', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      autoSkip: { intro: false, recap: true },
      locale: 'zh-TW' as const,
      speed: { ...DEFAULT_SETTINGS.speed, preferred: 2.25 },
    }
    const backup = createSettingsBackup(settings, {
      extensionVersion: '0.5.1',
      exportedAt,
    })

    expect(backup).toEqual({
      format: SETTINGS_BACKUP_FORMAT,
      formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
      exportedAt: '2026-08-12T03:04:05.000Z',
      extensionVersion: '0.5.1',
      settings,
    })
    expect(serializeSettingsBackup(backup)).toBe(`${JSON.stringify(backup, null, 2)}\n`)
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({
      ok: true,
      value: { settings: { autoSkip: { intro: false, recap: true } } },
    })
    expect(getSettingsBackupFilename(exportedAt)).toBe(
      'netflix-shortcut-override-settings-2026-08-12.json'
    )
  })

  it('parses a current backup', () => {
    const backup = createSettingsBackup(DEFAULT_SETTINGS, {
      extensionVersion: '0.5.1',
      exportedAt,
    })

    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toEqual({
      ok: true,
      value: {
        exportedAt: backup.exportedAt,
        extensionVersion: '0.5.1',
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        settingsVersion: SHORTCUT_SETTINGS_VERSION,
        settings: DEFAULT_SETTINGS,
      },
    })
  })

  it('migrates older settings and normalizes values before preview', () => {
    const legacySettings = createVersion9Settings()
    const result = parseSettingsBackup(
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: exportedAt.toISOString(),
        extensionVersion: '0.5.1',
        settings: {
          ...legacySettings,
          enabled: false,
          speed: { ...legacySettings.speed, min: -1, max: 99, step: 0 },
          spaceHold: { ...legacySettings.spaceHold, speed: 3 },
          unknown: true,
        },
      })
    )

    expect(result).toMatchObject({
      ok: true,
      value: {
        settingsVersion: 9,
        settings: {
          version: SHORTCUT_SETTINGS_VERSION,
          enabled: false,
          speed: { min: 0.25, max: 4, step: 0.05 },
          holdSpeed: { speed: 3 },
        },
      },
    })
    if (result.ok) expect(result.value.settings).not.toHaveProperty('unknown')
  })

  it('rejects parseable dates that are not canonical ISO-8601 timestamps', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: '0',
          extensionVersion: '0.5.1',
          settings: DEFAULT_SETTINGS,
        })
      )
    ).toEqual({ ok: false, error: 'invalidMetadata' })
  })

  it('rejects a present settings version that is not an integer', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: exportedAt.toISOString(),
          extensionVersion: '0.5.1',
          settings: { ...DEFAULT_SETTINGS, version: '11' },
        })
      )
    ).toEqual({ ok: false, error: 'invalidSettingsVersion' })
  })

  it('rejects an incomplete current-version backup before it can reset settings', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: exportedAt.toISOString(),
          extensionVersion: '0.6.0',
          settings: { version: SHORTCUT_SETTINGS_VERSION },
        })
      )
    ).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('rejects out-of-range values in a current-version backup instead of repairing them', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: exportedAt.toISOString(),
          extensionVersion: '0.6.0',
          settings: {
            ...DEFAULT_SETTINGS,
            speed: { ...DEFAULT_SETTINGS.speed, min: -1 },
          },
        })
      )
    ).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it('rejects a backup without a settings version instead of treating it as legacy', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: exportedAt.toISOString(),
          extensionVersion: '0.6.0',
          settings: {},
        })
      )
    ).toEqual({ ok: false, error: 'invalidSettingsVersion' })
  })

  it('rejects an incomplete supported legacy backup before normalization', () => {
    expect(
      parseSettingsBackup(
        JSON.stringify({
          format: SETTINGS_BACKUP_FORMAT,
          formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
          exportedAt: exportedAt.toISOString(),
          extensionVersion: '0.5.1',
          settings: { version: 9, enabled: false },
        })
      )
    ).toEqual({ ok: false, error: 'invalidSettings' })
  })

  it.each([
    ['invalidJson', '{'],
    ['invalidRoot', '[]'],
    ['wrongFormat', JSON.stringify({ format: 'other' })],
    [
      'unsupportedFormatVersion',
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION + 1,
      }),
    ],
    [
      'invalidMetadata',
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: 'not-a-date',
        extensionVersion: '0.5.1',
        settings: {},
      }),
    ],
    [
      'missingSettings',
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: exportedAt.toISOString(),
        extensionVersion: '0.5.1',
      }),
    ],
    [
      'unsupportedSettingsVersion',
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: exportedAt.toISOString(),
        extensionVersion: '0.5.1',
        settings: { version: SHORTCUT_SETTINGS_VERSION + 1 },
      }),
    ],
    [
      'unsupportedSettingsVersion',
      JSON.stringify({
        format: SETTINGS_BACKUP_FORMAT,
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: exportedAt.toISOString(),
        extensionVersion: '0.4.0',
        settings: { version: 7 },
      }),
    ],
  ])('rejects %s input', (error, source) => {
    expect(parseSettingsBackup(source)).toEqual({ ok: false, error })
  })
})
