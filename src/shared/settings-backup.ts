import { normalizeSettings, parseSettingsForBackup } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'

export const SETTINGS_BACKUP_FORMAT = 'netflix-shortcut-override-settings'
export const SETTINGS_BACKUP_FORMAT_VERSION = 1

export type SettingsBackup = {
  format: typeof SETTINGS_BACKUP_FORMAT
  formatVersion: typeof SETTINGS_BACKUP_FORMAT_VERSION
  exportedAt: string
  extensionVersion: string
  settings: ShortcutSettings
}

export type ParsedSettingsBackup = {
  exportedAt: string
  extensionVersion: string
  formatVersion: number
  settingsVersion: number
  settings: ShortcutSettings
}

export type SettingsBackupParseErrorCode =
  | 'invalidJson'
  | 'invalidRoot'
  | 'wrongFormat'
  | 'unsupportedFormatVersion'
  | 'invalidMetadata'
  | 'missingSettings'
  | 'invalidSettingsVersion'
  | 'invalidSettings'
  | 'unsupportedSettingsVersion'

export type SettingsBackupParseResult =
  | { ok: true; value: ParsedSettingsBackup }
  | { ok: false; error: SettingsBackupParseErrorCode }

type CreateSettingsBackupOptions = {
  extensionVersion: string
  exportedAt?: Date
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isCanonicalIsoTimestamp = (value: unknown): value is string => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value
}

export const createSettingsBackup = (
  settings: ShortcutSettings,
  { extensionVersion, exportedAt = new Date() }: CreateSettingsBackupOptions
): SettingsBackup => ({
  format: SETTINGS_BACKUP_FORMAT,
  formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
  exportedAt: exportedAt.toISOString(),
  extensionVersion,
  settings: normalizeSettings(settings),
})

export const serializeSettingsBackup = (backup: SettingsBackup): string =>
  `${JSON.stringify(backup, null, 2)}\n`

export const getSettingsBackupFilename = (exportedAt: Date): string =>
  `netflix-shortcut-override-settings-${exportedAt.toISOString().slice(0, 10)}.json`

export const parseSettingsBackup = (source: string): SettingsBackupParseResult => {
  let parsed: unknown

  try {
    parsed = JSON.parse(source)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }

  if (!isRecord(parsed)) return { ok: false, error: 'invalidRoot' }
  if (parsed.format !== SETTINGS_BACKUP_FORMAT) {
    return { ok: false, error: 'wrongFormat' }
  }
  if (parsed.formatVersion !== SETTINGS_BACKUP_FORMAT_VERSION) {
    return { ok: false, error: 'unsupportedFormatVersion' }
  }
  if (
    !isCanonicalIsoTimestamp(parsed.exportedAt) ||
    typeof parsed.extensionVersion !== 'string' ||
    parsed.extensionVersion.trim().length === 0
  ) {
    return { ok: false, error: 'invalidMetadata' }
  }
  if (!isRecord(parsed.settings)) {
    return { ok: false, error: 'missingSettings' }
  }

  const result = parseSettingsForBackup(parsed.settings)
  if (!result.ok) return result
  const { settingsVersion, settings } = result

  return {
    ok: true,
    value: {
      exportedAt: parsed.exportedAt,
      extensionVersion: parsed.extensionVersion,
      formatVersion: parsed.formatVersion,
      settingsVersion,
      settings,
    },
  }
}
