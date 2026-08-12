import { DEFAULT_KEY_BINDINGS, isKeyBinding, keyBindingsEqual } from './shortcut-bindings'
import {
  LOCALES,
  LOCALE_PREFERENCES,
  SHORTCUT_ACTIONS,
  THEME_MODES,
  type Locale,
  type LocalePreference,
  PIP_SUBTITLE_SIZES,
  PIP_SUBTITLE_BACKGROUNDS,
  type PipSettings,
  type SeekSettings,
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutSettings,
  type HoldSpeedSettings,
  type SpeedSettings,
  type ThemeMode,
} from './shortcut-types'

export const SPEED_LIMITS = {
  min: { min: 0.25, max: 1 },
  max: { min: 1, max: 4 },
  step: { min: 0.05, max: 4, inputStep: 0.05 },
  preferred: { min: 0.25, max: 4, inputStep: 0.05 },
} as const

export const HOLD_SPEED_LIMITS = {
  speed: { min: 0.25, max: 4, inputStep: 0.05 },
} as const

export const SEEK_LIMITS = {
  seconds: { min: 1, max: 60, inputStep: 1 },
} as const

export const DEFAULT_SPEED_SETTINGS: SpeedSettings = {
  min: 0.25,
  max: 3,
  step: 0.25,
  preferred: 1.5,
}

export const DEFAULT_HOLD_SPEED_SETTINGS: HoldSpeedSettings = {
  enabled: true,
  speed: 2,
  showHint: true,
}

export const DEFAULT_SEEK_SETTINGS: SeekSettings = {
  seconds: 10,
}

export const DEFAULT_PIP_SETTINGS: PipSettings = {
  subtitlesEnabled: true,
  subtitleSize: 'medium',
  subtitleBackground: 'translucent',
}

export const SHORTCUT_SETTINGS_VERSION = 10
export const MIN_SETTINGS_BACKUP_VERSION = 8

const SETTINGS_ACTIONS_BY_VERSION: Record<number, readonly ShortcutAction[]> = {
  8: SHORTCUT_ACTIONS.filter(
    action => action !== 'toggleSubtitles' && action !== 'setPreferredSpeed'
  ),
  9: SHORTCUT_ACTIONS.filter(action => action !== 'setPreferredSpeed'),
  10: SHORTCUT_ACTIONS,
}

const LEGACY_PICTURE_IN_PICTURE_BINDING = {
  code: 'KeyW',
  key: 'W',
  ctrl: false,
  alt: false,
  shift: true,
  meta: false,
} as const

export const DEFAULT_SETTINGS: ShortcutSettings = {
  version: SHORTCUT_SETTINGS_VERSION,
  enabled: true,
  locale: 'auto',
  theme: 'auto',
  speed: DEFAULT_SPEED_SETTINGS,
  holdSpeed: DEFAULT_HOLD_SPEED_SETTINGS,
  seek: DEFAULT_SEEK_SETTINGS,
  pip: DEFAULT_PIP_SETTINGS,
  bindings: Object.fromEntries(
    SHORTCUT_ACTIONS.map(action => [
      action,
      {
        enabled: true,
        key: DEFAULT_KEY_BINDINGS[action],
      },
    ])
  ) as Record<ShortcutAction, ShortcutBinding>,
}

export const isLocale = (value: string): value is Locale => LOCALES.includes(value as Locale)

export const isLocalePreference = (value: string): value is LocalePreference =>
  LOCALE_PREFERENCES.includes(value as LocalePreference)

export const isThemeMode = (value: string): value is ThemeMode =>
  THEME_MODES.includes(value as ThemeMode)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const hasFiniteNumber = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'number' && Number.isFinite(record[key])

export const isCompleteSettingsForBackup = (
  settings: Record<string, unknown>,
  version: number
): boolean => {
  const requiredActions = SETTINGS_ACTIONS_BY_VERSION[version]
  const holdSpeedKey = version >= 10 ? 'holdSpeed' : 'spaceHold'
  if (
    !requiredActions ||
    settings.version !== version ||
    typeof settings.enabled !== 'boolean' ||
    typeof settings.locale !== 'string' ||
    !isLocalePreference(settings.locale) ||
    typeof settings.theme !== 'string' ||
    !isThemeMode(settings.theme) ||
    !isRecord(settings.speed) ||
    !isRecord(settings[holdSpeedKey]) ||
    !isRecord(settings.seek) ||
    !isRecord(settings.pip) ||
    !isRecord(settings.bindings)
  ) {
    return false
  }

  const speed = settings.speed
  const holdSpeed = settings[holdSpeedKey]
  const seek = settings.seek
  const pip = settings.pip
  const bindings = settings.bindings
  return (
    ['min', 'max', 'step'].every(key => hasFiniteNumber(speed, key)) &&
    (version < 10 || hasFiniteNumber(speed, 'preferred')) &&
    typeof holdSpeed.enabled === 'boolean' &&
    hasFiniteNumber(holdSpeed, 'speed') &&
    typeof holdSpeed.showHint === 'boolean' &&
    hasFiniteNumber(seek, 'seconds') &&
    typeof pip.subtitlesEnabled === 'boolean' &&
    typeof pip.subtitleSize === 'string' &&
    PIP_SUBTITLE_SIZES.includes(pip.subtitleSize as PipSettings['subtitleSize']) &&
    typeof pip.subtitleBackground === 'string' &&
    PIP_SUBTITLE_BACKGROUNDS.includes(
      pip.subtitleBackground as PipSettings['subtitleBackground']
    ) &&
    requiredActions.every(action => {
      const binding = bindings[action]
      return isRecord(binding) && typeof binding.enabled === 'boolean' && isKeyBinding(binding.key)
    })
  )
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))

export const normalizeToStep = (value: number, step: number = SPEED_LIMITS.step.inputStep): number =>
  Number((Math.round(value / step) * step).toFixed(2))

export const normalizeSpeedSettings = (raw: Partial<SpeedSettings> | undefined): SpeedSettings => {
  const candidateMin = normalizeToStep(Number(raw?.min ?? DEFAULT_SPEED_SETTINGS.min))
  const candidateMax = normalizeToStep(Number(raw?.max ?? DEFAULT_SPEED_SETTINGS.max))
  const candidateStep = normalizeToStep(Number(raw?.step ?? DEFAULT_SPEED_SETTINGS.step))
  const candidatePreferred = normalizeToStep(
    Number(raw?.preferred ?? DEFAULT_SPEED_SETTINGS.preferred)
  )

  const min = clamp(candidateMin, SPEED_LIMITS.min.min, SPEED_LIMITS.min.max)
  const max = clamp(candidateMax, Math.max(SPEED_LIMITS.max.min, min), SPEED_LIMITS.max.max)
  const step = clamp(candidateStep, SPEED_LIMITS.step.min, SPEED_LIMITS.step.max)
  const preferred = clamp(
    candidatePreferred,
    SPEED_LIMITS.preferred.min,
    SPEED_LIMITS.preferred.max
  )

  return { min, max, step, preferred }
}

export const normalizeHoldSpeedSettings = (
  raw: Partial<HoldSpeedSettings> | undefined,
  legacySpeed?: unknown
): HoldSpeedSettings => {
  const candidateSpeed = normalizeToStep(
    Number(raw?.speed ?? legacySpeed ?? DEFAULT_HOLD_SPEED_SETTINGS.speed)
  )

  return {
    enabled:
      typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_HOLD_SPEED_SETTINGS.enabled,
    speed: clamp(candidateSpeed, HOLD_SPEED_LIMITS.speed.min, HOLD_SPEED_LIMITS.speed.max),
    showHint:
      typeof raw?.showHint === 'boolean' ? raw.showHint : DEFAULT_HOLD_SPEED_SETTINGS.showHint,
  }
}

export const normalizeSeekSettings = (raw: Partial<SeekSettings> | undefined): SeekSettings => {
  const candidateSeconds = normalizeToStep(
    Number(raw?.seconds ?? DEFAULT_SEEK_SETTINGS.seconds),
    SEEK_LIMITS.seconds.inputStep
  )
  const seconds = clamp(candidateSeconds, SEEK_LIMITS.seconds.min, SEEK_LIMITS.seconds.max)

  return { seconds }
}

export const normalizePipSettings = (raw: Partial<PipSettings> | undefined): PipSettings => ({
  subtitlesEnabled:
    typeof raw?.subtitlesEnabled === 'boolean'
      ? raw.subtitlesEnabled
      : DEFAULT_PIP_SETTINGS.subtitlesEnabled,
  subtitleSize: PIP_SUBTITLE_SIZES.includes(raw?.subtitleSize as PipSettings['subtitleSize'])
    ? (raw?.subtitleSize as PipSettings['subtitleSize'])
    : DEFAULT_PIP_SETTINGS.subtitleSize,
  subtitleBackground: PIP_SUBTITLE_BACKGROUNDS.includes(
    raw?.subtitleBackground as PipSettings['subtitleBackground']
  )
    ? (raw?.subtitleBackground as PipSettings['subtitleBackground'])
    : DEFAULT_PIP_SETTINGS.subtitleBackground,
})

export const normalizeSettings = (raw: unknown): ShortcutSettings => {
  const source = raw && typeof raw === 'object' ? (raw as Partial<ShortcutSettings>) : {}
  const legacySource = source as Partial<ShortcutSettings> & {
    spaceHold?: Partial<HoldSpeedSettings>
  }
  const sourceVersion = typeof source.version === 'number' ? source.version : 1
  const shouldMigrateLegacyPictureInPicture = sourceVersion < 2
  const rawBindings =
    source.bindings && typeof source.bindings === 'object'
      ? (source.bindings as Partial<Record<ShortcutAction, Partial<ShortcutBinding>>>)
      : {}
  const legacySpeed = source.speed as Partial<SpeedSettings & { hold?: unknown }> | undefined

  const bindings = Object.fromEntries(
    SHORTCUT_ACTIONS.map(action => {
      const rawBinding = rawBindings[action]
      const key =
        action === 'pictureInPicture' &&
        shouldMigrateLegacyPictureInPicture &&
        isKeyBinding(rawBinding?.key) &&
        rawBinding.key.code === LEGACY_PICTURE_IN_PICTURE_BINDING.code &&
        rawBinding.key.ctrl === LEGACY_PICTURE_IN_PICTURE_BINDING.ctrl &&
        rawBinding.key.alt === LEGACY_PICTURE_IN_PICTURE_BINDING.alt &&
        rawBinding.key.shift === LEGACY_PICTURE_IN_PICTURE_BINDING.shift &&
        rawBinding.key.meta === LEGACY_PICTURE_IN_PICTURE_BINDING.meta
          ? DEFAULT_KEY_BINDINGS[action]
          : isKeyBinding(rawBinding?.key)
            ? rawBinding.key
            : DEFAULT_KEY_BINDINGS[action]
      const migratedDefaultConflicts =
        ((action === 'toggleSubtitles' && sourceVersion < 9) ||
          (action === 'setPreferredSpeed' && sourceVersion < 10)) &&
        rawBinding === undefined &&
        Object.values(rawBindings).some(
          candidate =>
            isKeyBinding(candidate?.key) && keyBindingsEqual(candidate.key, key)
        )
      return [
        action,
        {
          enabled: migratedDefaultConflicts
            ? false
            : typeof rawBinding?.enabled === 'boolean'
              ? rawBinding.enabled
              : DEFAULT_SETTINGS.bindings[action].enabled,
          key,
        },
      ]
    })
  ) as Record<ShortcutAction, ShortcutBinding>

  return {
    version: SHORTCUT_SETTINGS_VERSION,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_SETTINGS.enabled,
    locale:
      typeof source.locale === 'string' && isLocalePreference(source.locale)
        ? source.locale
        : DEFAULT_SETTINGS.locale,
    theme:
      typeof source.theme === 'string' && isThemeMode(source.theme)
        ? source.theme
        : DEFAULT_SETTINGS.theme,
    speed: normalizeSpeedSettings(source.speed),
    holdSpeed: normalizeHoldSpeedSettings(
      source.holdSpeed ?? legacySource.spaceHold,
      legacySpeed?.hold
    ),
    seek: normalizeSeekSettings(source.seek),
    pip: normalizePipSettings(source.pip),
    bindings,
  }
}
