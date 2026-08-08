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
  type SpaceHoldSettings,
  type SpeedSettings,
  type ThemeMode,
} from './shortcut-types'

export const SPEED_LIMITS = {
  min: { min: 0.25, max: 1 },
  max: { min: 1, max: 4 },
  step: { min: 0.05, max: 4, inputStep: 0.05 },
} as const

export const SPACE_HOLD_LIMITS = {
  speed: { min: 0.25, max: 4, inputStep: 0.05 },
} as const

export const SEEK_LIMITS = {
  seconds: { min: 1, max: 60, inputStep: 1 },
} as const

export const DEFAULT_SPEED_SETTINGS: SpeedSettings = {
  min: 0.25,
  max: 3,
  step: 0.25,
}

export const DEFAULT_SPACE_HOLD_SETTINGS: SpaceHoldSettings = {
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

export const SHORTCUT_SETTINGS_VERSION = 9

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
  spaceHold: DEFAULT_SPACE_HOLD_SETTINGS,
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

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))

export const normalizeToStep = (value: number, step: number = SPEED_LIMITS.step.inputStep): number =>
  Number((Math.round(value / step) * step).toFixed(2))

export const normalizeSpeedSettings = (raw: Partial<SpeedSettings> | undefined): SpeedSettings => {
  const candidateMin = normalizeToStep(Number(raw?.min ?? DEFAULT_SPEED_SETTINGS.min))
  const candidateMax = normalizeToStep(Number(raw?.max ?? DEFAULT_SPEED_SETTINGS.max))
  const candidateStep = normalizeToStep(Number(raw?.step ?? DEFAULT_SPEED_SETTINGS.step))

  const min = clamp(candidateMin, SPEED_LIMITS.min.min, SPEED_LIMITS.min.max)
  const max = clamp(candidateMax, Math.max(SPEED_LIMITS.max.min, min), SPEED_LIMITS.max.max)
  const step = clamp(candidateStep, SPEED_LIMITS.step.min, SPEED_LIMITS.step.max)

  return { min, max, step }
}

export const normalizeSpaceHoldSettings = (
  raw: Partial<SpaceHoldSettings> | undefined,
  legacySpeed?: unknown
): SpaceHoldSettings => {
  const candidateSpeed = normalizeToStep(
    Number(raw?.speed ?? legacySpeed ?? DEFAULT_SPACE_HOLD_SETTINGS.speed)
  )

  return {
    enabled:
      typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_SPACE_HOLD_SETTINGS.enabled,
    speed: clamp(candidateSpeed, SPACE_HOLD_LIMITS.speed.min, SPACE_HOLD_LIMITS.speed.max),
    showHint:
      typeof raw?.showHint === 'boolean' ? raw.showHint : DEFAULT_SPACE_HOLD_SETTINGS.showHint,
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
        action === 'toggleSubtitles' &&
        sourceVersion < 9 &&
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
    spaceHold: normalizeSpaceHoldSettings(source.spaceHold, legacySpeed?.hold),
    seek: normalizeSeekSettings(source.seek),
    pip: normalizePipSettings(source.pip),
    bindings,
  }
}
