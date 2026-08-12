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
  it('creates and serializes a stable complete backup envelope', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
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
