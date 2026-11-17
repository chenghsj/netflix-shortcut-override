import { DEFAULT_SUBTITLE_SIZE_CYCLE, isSubtitleSize, isSubtitleSizeList, isSubtitleSizeShortcut } from './subtitle-size-shortcuts'
import { isPreferredSpeedShortcut, PREFERRED_SPEED_LIMITS } from './preferred-speed-shortcuts'
import { getFeatureGroupActions, MANAGED_FEATURE_GROUPS, MANAGED_FAVORITES_FEATURES, type ManagedFeatureGroup, type ManagedFavoritesFeature } from './feature-management'
import { DEFAULT_UI_STYLE, isUiStyle } from './ui-styles'
import { DEFAULT_SUBTITLE_NAVIGATION_BINDINGS } from './subtitle-navigation'
import { normalizeSubtitleFavorites, sameSubtitleFavorite } from './subtitle-favorites'
import { normalizeAudioFavorites, sameAudioFavorite } from './audio-favorites'
import { DEFAULT_KEY_BINDINGS, isKeyBinding, isShortcutKey, keyBindingsEqual } from './shortcut-bindings'
import { isSeekShortcut, isLegacySeekShortcut, getSeekShortcutActions, getSeekPairAction, SEEK_SHORTCUT_LIMITS } from './seek-shortcuts'
import {
  SUBTITLE_NAVIGATION_ACTIONS,
  LOCALES,
  LOCALE_PREFERENCES,
  SHORTCUT_ACTIONS,
  THEME_MODES,
  type Locale,
  type LocalePreference,
  type KeyBinding,
  PIP_SUBTITLE_BACKGROUNDS,
  type PipSettings,
  type SeekSettings,
  type ShortcutAction,
  type BuiltinShortcutAction,
  type ShortcutBinding,
  type ShortcutSettings,
  type SubtitleNavigationSettings,
  type HoldSpeedSettings,
  type SpeedSettings,
  type ThemeMode,
} from './shortcut-types'

export const SPEED_LIMITS = {
  min: { min: 0.25, max: 1 },
  max: { min: 1, max: 5 },
  step: { min: 0.05, max: 5, inputStep: 0.05 },
  preferred: PREFERRED_SPEED_LIMITS,
} as const

export const HOLD_SPEED_LIMITS = {
  speed: { min: 0.25, max: 5, inputStep: 0.05 },
} as const

export const SEEK_LIMITS = {
  seconds: { min: 1, max: SEEK_SHORTCUT_LIMITS.seconds, inputStep: 1 },
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

export const SHORTCUT_SETTINGS_VERSION = 32
export const MIN_SETTINGS_BACKUP_VERSION = 8

const SHORTCUT_BINDING_MIGRATIONS: Partial<Record<ShortcutAction, {
  introducedIn: number
  ignoreDisabledBindings: boolean
}>> = {
  toggleSubtitles: { introducedIn: 9, ignoreDisabledBindings: false },
  setPreferredSpeed: { introducedIn: 10, ignoreDisabledBindings: false },
  cycleSubtitleTrack: { introducedIn: 16, ignoreDisabledBindings: true },
  previousSubtitleTrack: { introducedIn: 18, ignoreDisabledBindings: true },
  cycleSubtitleSize: { introducedIn: 20, ignoreDisabledBindings: true },
  previousEpisode: { introducedIn: 22, ignoreDisabledBindings: true },
  nextEpisode: { introducedIn: 22, ignoreDisabledBindings: true },
  previousFrame: { introducedIn: 26, ignoreDisabledBindings: true },
  nextFrame: { introducedIn: 26, ignoreDisabledBindings: true },
  previousAudioTrack: { introducedIn: 26, ignoreDisabledBindings: true },
  nextAudioTrack: { introducedIn: 26, ignoreDisabledBindings: true },
}

const V25_SHORTCUT_ACTIONS = SHORTCUT_ACTIONS.filter(action =>
  action !== 'previousFrame' && action !== 'nextFrame' && action !== 'previousAudioTrack' && action !== 'nextAudioTrack')
const V21_SHORTCUT_ACTIONS = V25_SHORTCUT_ACTIONS.filter(action => action !== 'previousEpisode' && action !== 'nextEpisode')
const V19_SHORTCUT_ACTIONS = V21_SHORTCUT_ACTIONS.filter(action => action !== 'cycleSubtitleSize')
const V16_SHORTCUT_ACTIONS = V19_SHORTCUT_ACTIONS.filter(action => action !== 'previousSubtitleTrack')
const PREVIOUS_SHORTCUT_ACTIONS = V16_SHORTCUT_ACTIONS.filter(action => action !== 'cycleSubtitleTrack')
const SETTINGS_ACTIONS_BY_VERSION: Record<number, readonly ShortcutAction[]> = {
  8: PREVIOUS_SHORTCUT_ACTIONS.filter(
    action => action !== 'toggleSubtitles' && action !== 'setPreferredSpeed'
  ),
  9: PREVIOUS_SHORTCUT_ACTIONS.filter(action => action !== 'setPreferredSpeed'),
  10: PREVIOUS_SHORTCUT_ACTIONS,
  11: PREVIOUS_SHORTCUT_ACTIONS,
  12: PREVIOUS_SHORTCUT_ACTIONS,
  13: PREVIOUS_SHORTCUT_ACTIONS,
  14: PREVIOUS_SHORTCUT_ACTIONS,
  15: PREVIOUS_SHORTCUT_ACTIONS,
  16: V16_SHORTCUT_ACTIONS,
  17: V16_SHORTCUT_ACTIONS,
  18: V19_SHORTCUT_ACTIONS,
  19: V19_SHORTCUT_ACTIONS,
  20: V21_SHORTCUT_ACTIONS,
  21: V21_SHORTCUT_ACTIONS,
  22: V25_SHORTCUT_ACTIONS,
  23: V25_SHORTCUT_ACTIONS,
  24: V25_SHORTCUT_ACTIONS,
  25: V25_SHORTCUT_ACTIONS,
  26: SHORTCUT_ACTIONS,
  27: SHORTCUT_ACTIONS,
  28: SHORTCUT_ACTIONS,
  29: SHORTCUT_ACTIONS,
  30: SHORTCUT_ACTIONS,
  31: SHORTCUT_ACTIONS,
  32: SHORTCUT_ACTIONS,
}

const LEGACY_PICTURE_IN_PICTURE_BINDING = {
  code: 'KeyW',
  key: 'W',
  ctrl: false,
  alt: false,
  shift: true,
  meta: false,
} as const

type DefaultShortcutBinding = ShortcutBinding & { key: KeyBinding }
type DefaultShortcutSettings = ShortcutSettings & {
  bindings: Record<ShortcutAction, DefaultShortcutBinding>
  subtitleNavigation: { enabled: boolean; bindings: typeof DEFAULT_SUBTITLE_NAVIGATION_BINDINGS }
}

export const DEFAULT_SETTINGS: DefaultShortcutSettings = {
  version: SHORTCUT_SETTINGS_VERSION,
  enabled: true,
  locale: 'auto',
  hiddenFeatures: [],
  theme: 'auto',
  uiStyle: DEFAULT_UI_STYLE,
  speed: DEFAULT_SPEED_SETTINGS,
  preferredSpeedShortcuts: [],
  subtitleNavigation: { enabled: false, bindings: DEFAULT_SUBTITLE_NAVIGATION_BINDINGS },
  subtitleFavorites: [],
  audioFavorites: [],
  subtitleSize: 'medium',
  subtitleSizeCycle: DEFAULT_SUBTITLE_SIZE_CYCLE,
  subtitleSizeShortcuts: [],
  holdSpeed: DEFAULT_HOLD_SPEED_SETTINGS,
  seek: DEFAULT_SEEK_SETTINGS,
  seekShortcuts: [],
  autoSkip: { intro: false, recap: false },
  autoNextEpisode: false,
  hidePauseOverlay: false,
  pip: DEFAULT_PIP_SETTINGS,
  bindings: Object.fromEntries(
    SHORTCUT_ACTIONS.map(action => [
      action,
      {
        enabled: true,
        key: DEFAULT_KEY_BINDINGS[action],
      },
    ])
  ) as Record<ShortcutAction, DefaultShortcutBinding>,
}

export const isLocale = (value: string): value is Locale => LOCALES.includes(value as Locale)

export const isLocalePreference = (value: string): value is LocalePreference =>
  LOCALE_PREFERENCES.includes(value as LocalePreference)

export const isThemeMode = (value: string): value is ThemeMode =>
  THEME_MODES.includes(value as ThemeMode)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isKeyForVersion = (key: unknown, version: number): key is KeyBinding | null =>
  version >= 27 ? isShortcutKey(key) : isKeyBinding(key)

const isSeekShortcutForVersion = (shortcut: unknown, version: number) =>
  version >= 32 ? isSeekShortcut(shortcut)
    : isLegacySeekShortcut(shortcut) && (version < 23 || shortcut.kind !== 'relative' || shortcut.value > 0)

const hasFiniteNumber = (record: Record<string, unknown>, key: string): boolean =>
  typeof record[key] === 'number' && Number.isFinite(record[key])

const isCompleteSettingsForBackup = (
  settings: Record<string, unknown>,
  version: number
): boolean => {
  const requiredActions = SETTINGS_ACTIONS_BY_VERSION[version]
  const holdSpeedKey = version >= 10 ? 'holdSpeed' : 'spaceHold'
  // Backups through v13 used the former name for subtitle navigation.
  const subtitleNavigation = settings[version >= 14 ? 'subtitleNavigation' : 'subtitlePractice']
  if (
    (version >= 11 && (!isRecord(subtitleNavigation) || typeof subtitleNavigation.enabled !== 'boolean')) ||
    (version >= 12 && (!isRecord(subtitleNavigation) || !isRecord(subtitleNavigation.bindings) || !SUBTITLE_NAVIGATION_ACTIONS.every(action => {
      const binding = subtitleNavigation.bindings as Record<string, unknown>
      const item = binding[action]
      return isRecord(item) && typeof item.enabled === 'boolean' && isKeyForVersion(item.key, version)
    }))) ||
    (version >= 13 && !isUiStyle(settings.uiStyle)) ||
    (version >= 15 && (!isRecord(settings.autoSkip) ||
      typeof settings.autoSkip.intro !== 'boolean' || typeof settings.autoSkip.recap !== 'boolean')) ||
    (version >= 17 && !Array.isArray(settings.subtitleFavorites)) ||
    (version >= 28 && !Array.isArray(settings.audioFavorites)) ||
    (version >= 30 && (!Array.isArray(settings.hiddenFeatures) || !settings.hiddenFeatures.every(id => typeof id === 'string'))) ||
    (version >= 29 && (!Array.isArray(settings.preferredSpeedShortcuts) ||
      !settings.preferredSpeedShortcuts.every(isPreferredSpeedShortcut) ||
      new Set(settings.preferredSpeedShortcuts.map(item => item.id)).size !== settings.preferredSpeedShortcuts.length ||
      !settings.preferredSpeedShortcuts.every(item => {
        const binding = isRecord(settings.bindings) ? settings.bindings[item.id] : undefined
        return isRecord(binding) && typeof binding.enabled === 'boolean' && isKeyForVersion(binding.key, version)
      }))) ||
    (version >= 20 && (!isSubtitleSize(settings.subtitleSize) || (version < 24 && typeof settings.subtitleSize !== 'string'))) ||
    (version >= 21 && typeof settings.autoNextEpisode !== 'boolean') ||
    (version >= 31 && typeof settings.hidePauseOverlay !== 'boolean') ||
    (version >= 22 && (!Array.isArray(settings.seekShortcuts) ||
      !settings.seekShortcuts.every(shortcut => isSeekShortcutForVersion(shortcut, version)) ||
      new Set(settings.seekShortcuts.map(shortcut => shortcut.id)).size !== settings.seekShortcuts.length ||
      (version >= 23 && new Set(settings.seekShortcuts.flatMap(getSeekShortcutActions)).size !== settings.seekShortcuts.flatMap(getSeekShortcutActions).length) ||
      !settings.seekShortcuts.flatMap(shortcut => version >= 23 ? getSeekShortcutActions(shortcut) : [shortcut.id]).every(action => {
        const binding = isRecord(settings.bindings) ? settings.bindings[action] : undefined
        return isRecord(binding) && typeof binding.enabled === 'boolean' && isKeyForVersion(binding.key, version)
      }))) ||
    (version >= 24 && (!isSubtitleSizeList(settings.subtitleSizeCycle) ||
      !Array.isArray(settings.subtitleSizeShortcuts) || !settings.subtitleSizeShortcuts.every(isSubtitleSizeShortcut) ||
      new Set(settings.subtitleSizeShortcuts.map(item => item.id)).size !== settings.subtitleSizeShortcuts.length ||
      !settings.subtitleSizeShortcuts.every(item => {
        const binding = isRecord(settings.bindings) ? settings.bindings[item.id] : undefined
        return isRecord(binding) && typeof binding.enabled === 'boolean' && isKeyForVersion(binding.key, version)
      }))) ||
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
    isSubtitleSize(pip.subtitleSize) && (version >= 24 || typeof pip.subtitleSize === 'string') &&
    typeof pip.subtitleBackground === 'string' &&
    PIP_SUBTITLE_BACKGROUNDS.includes(
      pip.subtitleBackground as PipSettings['subtitleBackground']
    ) &&
    requiredActions.every(action => {
      const binding = bindings[action]
      return isRecord(binding) && typeof binding.enabled === 'boolean' && isKeyForVersion(binding.key, version)
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
  subtitleSize: isSubtitleSize(raw?.subtitleSize)
    ? (raw?.subtitleSize as PipSettings['subtitleSize'])
    : DEFAULT_PIP_SETTINGS.subtitleSize,
  subtitleBackground: PIP_SUBTITLE_BACKGROUNDS.includes(
    raw?.subtitleBackground as PipSettings['subtitleBackground']
  )
    ? (raw?.subtitleBackground as PipSettings['subtitleBackground'])
    : DEFAULT_PIP_SETTINGS.subtitleBackground,
})

type RawShortcutBindings = Partial<Record<ShortcutAction, Partial<ShortcutBinding>>>

const resolveBindingKey = (
  action: BuiltinShortcutAction,
  rawKey: unknown,
  sourceVersion: number
): KeyBinding | null => {
  if (rawKey === null && sourceVersion >= 27) return null
  if (!isKeyBinding(rawKey)) return DEFAULT_KEY_BINDINGS[action]

  const migrateLegacyPip = action === 'pictureInPicture' && sourceVersion < 2 &&
    keyBindingsEqual(rawKey, LEGACY_PICTURE_IN_PICTURE_BINDING)
  if (migrateLegacyPip) return DEFAULT_KEY_BINDINGS[action]

  return rawKey
}

const hasMigratedDefaultConflict = (
  action: BuiltinShortcutAction,
  sourceVersion: number,
  rawBindings: RawShortcutBindings,
  subtitleBindings: Partial<SubtitleNavigationSettings['bindings']> | undefined,
  key: KeyBinding | null
): boolean => {
  if (rawBindings[action] !== undefined) return false
  const migration = SHORTCUT_BINDING_MIGRATIONS[action]
  if (!migration) return false
  const introducesBinding = sourceVersion < migration.introducedIn
  if (!introducesBinding) return false

  // Preserve the older migrations' treatment of disabled saved bindings.
  return [...Object.values(rawBindings), ...Object.values(subtitleBindings ?? {})].some(candidate => {
    if (migration.ignoreDisabledBindings && candidate?.enabled === false) return false
    return isKeyBinding(candidate?.key) && keyBindingsEqual(candidate.key, key)
  })
}

export const normalizeSettings = (raw: unknown): ShortcutSettings => {
  const source = raw && typeof raw === 'object' ? (raw as Partial<ShortcutSettings>) : {}
  const legacySource = source as Partial<ShortcutSettings> & {
    spaceHold?: Partial<HoldSpeedSettings>
    subtitlePractice?: Partial<SubtitleNavigationSettings>
  }
  const sourceVersion = typeof source.version === 'number' ? source.version : 1
  const subtitleNavigation = source.subtitleNavigation ??
    (sourceVersion < 14 ? legacySource.subtitlePractice : undefined)
  const rawBindings =
    source.bindings && typeof source.bindings === 'object'
      ? (source.bindings as RawShortcutBindings)
      : {}
  const legacySpeed = source.speed as Partial<SpeedSettings & { hold?: unknown }> | undefined

  const bindings = Object.fromEntries(
    SHORTCUT_ACTIONS.map(action => {
      const rawBinding = rawBindings[action]
      const key = resolveBindingKey(action, rawBinding?.key, sourceVersion)
      const migratedDefaultConflicts = hasMigratedDefaultConflict(action, sourceVersion, rawBindings, subtitleNavigation?.bindings, key)
      const savedEnabled = typeof rawBinding?.enabled === 'boolean'
        ? rawBinding.enabled
        : DEFAULT_SETTINGS.bindings[action].enabled
      return [
        action,
        {
          enabled: !migratedDefaultConflicts && savedEnabled,
          key,
        },
      ]
    })
  ) as Record<ShortcutAction, ShortcutBinding>

  const seen = new Set<string>()
  const reservedActions = new Set<string>()
  const candidates = Array.isArray(source.seekShortcuts) ? source.seekShortcuts : []
  const seekShortcuts: ShortcutSettings['seekShortcuts'] = []
  for (const shortcut of candidates) {
    if (!isSeekShortcutForVersion(shortcut, sourceVersion) || seen.has(shortcut.id)) continue
    if (sourceVersion < 23 && shortcut.kind === 'relative') {
      const saved = rawBindings[shortcut.id]
      if (!isKeyBinding(saved?.key)) continue
      const opposite = candidates.find(candidate => isLegacySeekShortcut(candidate) && candidate.kind === 'relative' &&
        candidate.value === -shortcut.value && !seen.has(candidate.id) && isKeyBinding(rawBindings[candidate.id]?.key))
      const group = { ...shortcut, value: Math.min(Math.abs(shortcut.value), SEEK_SHORTCUT_LIMITS.seconds) }
      for (const direction of ['backward', 'forward'] as const) {
        const original = (direction === 'backward') === (shortcut.value < 0) ? saved : opposite ? rawBindings[opposite.id] : undefined
        bindings[getSeekPairAction(group, direction)] = { enabled: original?.enabled === true, key: original?.key ?? saved.key }
        reservedActions.add(getSeekPairAction(group, direction))
      }
      seen.add(shortcut.id)
      if (opposite) seen.add(opposite.id)
      seekShortcuts.push(group)
      continue
    }
    const actions = getSeekShortcutActions(shortcut)
    if (!actions.every(action => !reservedActions.has(action) && isKeyForVersion(rawBindings[action]?.key, sourceVersion))) continue
    seen.add(shortcut.id)
    for (const action of actions) {
      const binding = rawBindings[action]!
      bindings[action] = { enabled: binding.enabled === true, key: binding.key! }
      reservedActions.add(action)
    }
    seekShortcuts.push({ id: shortcut.id, kind: shortcut.kind,
      value: shortcut.kind === 'relative' ? Math.min(shortcut.value, SEEK_SHORTCUT_LIMITS.seconds) : shortcut.value })
  }

  const subtitleSizeShortcuts: ShortcutSettings['subtitleSizeShortcuts'] = []
  for (const shortcut of Array.isArray(source.subtitleSizeShortcuts) ? source.subtitleSizeShortcuts : []) {
    if (!isSubtitleSizeShortcut(shortcut) || subtitleSizeShortcuts.some(item => item.id === shortcut.id)) continue
    const binding = rawBindings[shortcut.id]
    if (!isKeyForVersion(binding?.key, sourceVersion)) continue
    subtitleSizeShortcuts.push({ ...shortcut, sizes: [...shortcut.sizes] })
    bindings[shortcut.id] = { enabled: binding.enabled === true, key: binding.key }
  }

  const preferredSpeedShortcuts: ShortcutSettings['preferredSpeedShortcuts'] = []
  for (const shortcut of Array.isArray(source.preferredSpeedShortcuts) ? source.preferredSpeedShortcuts : []) {
    if (!isPreferredSpeedShortcut(shortcut) || preferredSpeedShortcuts.some(item => item.id === shortcut.id)) continue
    const binding = rawBindings[shortcut.id]
    if (!isKeyForVersion(binding?.key, sourceVersion)) continue
    preferredSpeedShortcuts.push({ id: shortcut.id, speed: shortcut.speed })
    bindings[shortcut.id] = { enabled: binding.enabled === true, key: binding.key }
  }

  return {
    version: SHORTCUT_SETTINGS_VERSION,
    enabled: typeof source.enabled === 'boolean' ? source.enabled : DEFAULT_SETTINGS.enabled,
    hiddenFeatures: Array.isArray(source.hiddenFeatures) ? [...new Set(source.hiddenFeatures.filter(id => {
      if (id === 'holdSpeed') return source.holdSpeed?.enabled === false
      if (typeof id !== 'string') return false
      if (MANAGED_FAVORITES_FEATURES.includes(id as ManagedFavoritesFeature)) return true
      if (id.startsWith('group:') && MANAGED_FEATURE_GROUPS.includes(id.slice(6) as ManagedFeatureGroup)) {
        return getFeatureGroupActions({ seekShortcuts, preferredSpeedShortcuts }, id.slice(6) as ManagedFeatureGroup)
          .every(action => bindings[action]?.enabled === false && source.hiddenFeatures!.includes(`general:${action}`))
      }
      if (id.startsWith('general:')) return bindings[id.slice(8) as ShortcutAction]?.enabled === false
      if (id.startsWith('subtitleNavigation:')) {
        const action = id.slice(19) as keyof SubtitleNavigationSettings['bindings']
        return SUBTITLE_NAVIGATION_ACTIONS.includes(action) && subtitleNavigation?.bindings?.[action]?.enabled === false
      }
      return false
    }))] : [],
    locale:
      typeof source.locale === 'string' && isLocalePreference(source.locale)
        ? source.locale
        : DEFAULT_SETTINGS.locale,
    theme:
      typeof source.theme === 'string' && isThemeMode(source.theme)
        ? source.theme
        : DEFAULT_SETTINGS.theme,
    uiStyle: isUiStyle(source.uiStyle) ? source.uiStyle : sourceVersion < 13 && raw != null ? 'classic' : DEFAULT_SETTINGS.uiStyle,
    subtitleNavigation: {
      enabled: subtitleNavigation?.enabled === true,
      bindings: Object.fromEntries(SUBTITLE_NAVIGATION_ACTIONS.map(action => {
        const raw = subtitleNavigation?.bindings?.[action]
        return [action, { enabled: typeof raw?.enabled === 'boolean' ? raw.enabled : DEFAULT_SUBTITLE_NAVIGATION_BINDINGS[action].enabled, key: isKeyForVersion(raw?.key, sourceVersion) ? raw.key : DEFAULT_SUBTITLE_NAVIGATION_BINDINGS[action].key }]
      })) as ShortcutSettings['subtitleNavigation']['bindings'],
    },
    speed: normalizeSpeedSettings(source.speed),
    preferredSpeedShortcuts,
    subtitleFavorites: normalizeSubtitleFavorites(source.subtitleFavorites),
    audioFavorites: normalizeAudioFavorites(source.audioFavorites),
    subtitleSize: isSubtitleSize(source.subtitleSize)
      ? source.subtitleSize as PipSettings['subtitleSize']
      : DEFAULT_SETTINGS.subtitleSize,
    subtitleSizeCycle: isSubtitleSizeList(source.subtitleSizeCycle) ? [...source.subtitleSizeCycle] : [...DEFAULT_SUBTITLE_SIZE_CYCLE],
    subtitleSizeShortcuts,
    holdSpeed: normalizeHoldSpeedSettings(
      source.holdSpeed ?? legacySource.spaceHold,
      legacySpeed?.hold
    ),
    seek: normalizeSeekSettings(source.seek),
    seekShortcuts,
    autoSkip: { intro: source.autoSkip?.intro === true, recap: source.autoSkip?.recap === true },
    autoNextEpisode: source.autoNextEpisode === true,
    hidePauseOverlay: typeof source.hidePauseOverlay === 'boolean' ? source.hidePauseOverlay : DEFAULT_SETTINGS.hidePauseOverlay,
    pip: normalizePipSettings(source.pip),
    bindings,
  }
}

const isCurrentSettingsNormalized = (
  raw: Record<string, unknown>,
  normalized: ShortcutSettings
): boolean => {
  const settings = raw as unknown as ShortcutSettings

  return (
    settings.version === normalized.version &&
    settings.enabled === normalized.enabled &&
    settings.hiddenFeatures.length === normalized.hiddenFeatures.length &&
    settings.hiddenFeatures.every((id, index) => id === normalized.hiddenFeatures[index]) &&
    settings.preferredSpeedShortcuts.length === normalized.preferredSpeedShortcuts.length &&
    settings.preferredSpeedShortcuts.every((shortcut, index) => {
      const next = normalized.preferredSpeedShortcuts[index]
      const binding = settings.bindings[shortcut.id], nextBinding = normalized.bindings[shortcut.id]
      return shortcut.id === next.id && shortcut.speed === next.speed && binding.enabled === nextBinding.enabled &&
        keyBindingsEqual(binding.key, nextBinding.key) && binding.key?.key === nextBinding.key?.key
    }) &&
    settings.subtitleSize === normalized.subtitleSize &&
    settings.subtitleSizeCycle.length === normalized.subtitleSizeCycle.length &&
    settings.subtitleSizeCycle.every((size, index) => size === normalized.subtitleSizeCycle[index]) &&
    settings.subtitleSizeShortcuts.length === normalized.subtitleSizeShortcuts.length &&
    settings.subtitleSizeShortcuts.every((shortcut, index) => {
      const next = normalized.subtitleSizeShortcuts[index]
      const binding = settings.bindings[shortcut.id], nextBinding = normalized.bindings[shortcut.id]
      return shortcut.id === next.id && shortcut.kind === next.kind && shortcut.sizes.length === next.sizes.length &&
        shortcut.sizes.every((size, sizeIndex) => size === next.sizes[sizeIndex]) &&
        binding.enabled === nextBinding.enabled && keyBindingsEqual(binding.key, nextBinding.key) && binding.key?.key === nextBinding.key?.key
    }) &&
    settings.audioFavorites.length === normalized.audioFavorites.length &&
    settings.audioFavorites.every((favorite, index) =>
      sameAudioFavorite(favorite, normalized.audioFavorites[index])) &&
    settings.subtitleFavorites.length === normalized.subtitleFavorites.length &&
    settings.subtitleFavorites.every((favorite, index) =>
      sameSubtitleFavorite(favorite, normalized.subtitleFavorites[index])) &&
    settings.subtitleNavigation.enabled === normalized.subtitleNavigation.enabled &&
    SUBTITLE_NAVIGATION_ACTIONS.every(action => {
      const left = settings.subtitleNavigation.bindings[action], right = normalized.subtitleNavigation.bindings[action]
      return left.enabled === right.enabled && keyBindingsEqual(left.key, right.key) && left.key?.key === right.key?.key
    }) &&
    settings.locale === normalized.locale &&
    settings.theme === normalized.theme &&
    settings.uiStyle === normalized.uiStyle &&
    settings.speed.min === normalized.speed.min &&
    settings.speed.max === normalized.speed.max &&
    settings.speed.step === normalized.speed.step &&
    settings.speed.preferred === normalized.speed.preferred &&
    settings.holdSpeed.enabled === normalized.holdSpeed.enabled &&
    settings.holdSpeed.speed === normalized.holdSpeed.speed &&
    settings.holdSpeed.showHint === normalized.holdSpeed.showHint &&
    settings.seek.seconds === normalized.seek.seconds &&
    settings.seekShortcuts.length === normalized.seekShortcuts.length &&
    settings.seekShortcuts.every((shortcut, index) => {
      const next = normalized.seekShortcuts[index]
      return shortcut.id === next.id && shortcut.kind === next.kind && shortcut.value === next.value &&
        getSeekShortcutActions(shortcut).every(action => {
          const binding = settings.bindings[action], normalizedBinding = normalized.bindings[action]
          return binding.enabled === normalizedBinding.enabled && keyBindingsEqual(binding.key, normalizedBinding.key) &&
            binding.key?.key === normalizedBinding.key?.key
        })
    }) &&
    settings.autoNextEpisode === normalized.autoNextEpisode &&
    settings.hidePauseOverlay === normalized.hidePauseOverlay &&
    settings.autoSkip.intro === normalized.autoSkip.intro &&
    settings.autoSkip.recap === normalized.autoSkip.recap &&
    settings.pip.subtitlesEnabled === normalized.pip.subtitlesEnabled &&
    settings.pip.subtitleSize === normalized.pip.subtitleSize &&
    settings.pip.subtitleBackground === normalized.pip.subtitleBackground &&
    SHORTCUT_ACTIONS.every(action => {
      const binding = settings.bindings[action]
      const normalizedBinding = normalized.bindings[action]
      return (
        binding.enabled === normalizedBinding.enabled &&
        keyBindingsEqual(binding.key, normalizedBinding.key) &&
        binding.key?.key === normalizedBinding.key?.key
      )
    })
  )
}

// Backup content is strict for the current version, but supported legacy content
// is migrated. Callers must not normalize before this check: that repairs missing
// fields and would let an incomplete backup overwrite saved preferences.
export const parseSettingsForBackup = (
  raw: Record<string, unknown>
):
  | { ok: true; settingsVersion: number; settings: ShortcutSettings }
  | { ok: false; error: 'invalidSettingsVersion' | 'unsupportedSettingsVersion' | 'invalidSettings' } => {
  const version = raw.version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'invalidSettingsVersion' }
  }
  if (version < MIN_SETTINGS_BACKUP_VERSION || version > SHORTCUT_SETTINGS_VERSION) {
    return { ok: false, error: 'unsupportedSettingsVersion' }
  }
  if (!isCompleteSettingsForBackup(raw, version)) {
    return { ok: false, error: 'invalidSettings' }
  }
  const settings = normalizeSettings(raw)
  if (version === SHORTCUT_SETTINGS_VERSION && !isCurrentSettingsNormalized(raw, settings)) {
    return { ok: false, error: 'invalidSettings' }
  }
  return { ok: true, settingsVersion: version, settings }
}
