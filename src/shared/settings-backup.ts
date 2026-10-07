import {
  MIN_SETTINGS_BACKUP_VERSION,
  SHORTCUT_SETTINGS_VERSION,
  isCompleteSettingsForBackup,
  normalizeSettings,
} from '@/shared/shortcut-settings'
import { keyBindingsEqual } from './shortcut-bindings'
import { SUBTITLE_PRACTICE_ACTIONS, SHORTCUT_ACTIONS, type ShortcutSettings } from '@/shared/shortcut-types'

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

const isCurrentSettingsNormalized = (
  raw: Record<string, unknown>,
  normalized: ShortcutSettings
): boolean => {
  const settings = raw as unknown as ShortcutSettings

  return (
    settings.version === normalized.version &&
    settings.enabled === normalized.enabled &&
    settings.subtitlePractice.enabled === normalized.subtitlePractice.enabled &&
    SUBTITLE_PRACTICE_ACTIONS.every(action => {
      const left = settings.subtitlePractice.bindings[action], right = normalized.subtitlePractice.bindings[action]
      return left.enabled === right.enabled && keyBindingsEqual(left.key, right.key) && left.key.key === right.key.key
    }) &&
    settings.locale === normalized.locale &&
    settings.theme === normalized.theme &&
    settings.speed.min === normalized.speed.min &&
    settings.speed.max === normalized.speed.max &&
    settings.speed.step === normalized.speed.step &&
    settings.speed.preferred === normalized.speed.preferred &&
    settings.holdSpeed.enabled === normalized.holdSpeed.enabled &&
    settings.holdSpeed.speed === normalized.holdSpeed.speed &&
    settings.holdSpeed.showHint === normalized.holdSpeed.showHint &&
    settings.seek.seconds === normalized.seek.seconds &&
    settings.pip.subtitlesEnabled === normalized.pip.subtitlesEnabled &&
    settings.pip.subtitleSize === normalized.pip.subtitleSize &&
    settings.pip.subtitleBackground === normalized.pip.subtitleBackground &&
    SHORTCUT_ACTIONS.every(action => {
      const binding = settings.bindings[action]
      const normalizedBinding = normalized.bindings[action]
      return (
        binding.enabled === normalizedBinding.enabled &&
        binding.key.code === normalizedBinding.key.code &&
        binding.key.key === normalizedBinding.key.key &&
        binding.key.ctrl === normalizedBinding.key.ctrl &&
        binding.key.alt === normalizedBinding.key.alt &&
        binding.key.shift === normalizedBinding.key.shift &&
        binding.key.meta === normalizedBinding.key.meta
      )
    })
  )
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

  const rawSettingsVersion = parsed.settings.version
  if (
    typeof rawSettingsVersion !== 'number' ||
    !Number.isInteger(rawSettingsVersion) ||
    rawSettingsVersion < 1
  ) {
    return { ok: false, error: 'invalidSettingsVersion' }
  }
  const settingsVersion = rawSettingsVersion

  if (
    settingsVersion < MIN_SETTINGS_BACKUP_VERSION ||
    settingsVersion > SHORTCUT_SETTINGS_VERSION
  ) {
    return { ok: false, error: 'unsupportedSettingsVersion' }
  }
  if (!isCompleteSettingsForBackup(parsed.settings, settingsVersion)) {
    return { ok: false, error: 'invalidSettings' }
  }
  const normalizedSettings = normalizeSettings(parsed.settings)
  if (
    settingsVersion === SHORTCUT_SETTINGS_VERSION &&
    !isCurrentSettingsNormalized(parsed.settings, normalizedSettings)
  ) {
    return { ok: false, error: 'invalidSettings' }
  }

  return {
    ok: true,
    value: {
      exportedAt: parsed.exportedAt,
      extensionVersion: parsed.extensionVersion,
      formatVersion: parsed.formatVersion,
      settingsVersion,
      settings: normalizedSettings,
    },
  }
}
