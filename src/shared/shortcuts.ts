export const SHORTCUT_ACTIONS = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'speedUp',
  'speedDown',
  'speedReset',
] as const

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja', 'ko'] as const
export type Locale = (typeof LOCALES)[number]

export type KeyBinding = {
  code: string
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type ShortcutBinding = {
  enabled: boolean
  key: KeyBinding
}

export type SpeedSettings = {
  min: number
  max: number
  step: number
}

export type SpaceHoldSettings = {
  enabled: boolean
  speed: number
}

export type SeekSettings = {
  seconds: number
}

export type ShortcutSettings = {
  version: number
  enabled: boolean
  locale: Locale
  speed: SpeedSettings
  spaceHold: SpaceHoldSettings
  seek: SeekSettings
  bindings: Record<ShortcutAction, ShortcutBinding>
}

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
}

export const DEFAULT_SEEK_SETTINGS: SeekSettings = {
  seconds: 10,
}

export const SHORTCUT_SETTINGS_VERSION = 3

const LEGACY_PICTURE_IN_PICTURE_BINDING: KeyBinding = {
  code: 'KeyW',
  key: 'W',
  ctrl: false,
  alt: false,
  shift: true,
  meta: false,
}

export const DEFAULT_KEY_BINDINGS: Record<ShortcutAction, KeyBinding> = {
  playPause: { code: 'Space', key: ' ', ctrl: false, alt: false, shift: false, meta: false },
  seekBackward: { code: 'ArrowLeft', key: 'ArrowLeft', ctrl: false, alt: false, shift: false, meta: false },
  seekForward: { code: 'ArrowRight', key: 'ArrowRight', ctrl: false, alt: false, shift: false, meta: false },
  volumeUp: { code: 'ArrowUp', key: 'ArrowUp', ctrl: false, alt: false, shift: false, meta: false },
  volumeDown: { code: 'ArrowDown', key: 'ArrowDown', ctrl: false, alt: false, shift: false, meta: false },
  mute: { code: 'KeyM', key: 'm', ctrl: false, alt: false, shift: false, meta: false },
  fullscreen: { code: 'KeyF', key: 'f', ctrl: false, alt: false, shift: false, meta: false },
  pictureInPicture: {
    code: 'KeyP',
    key: 'P',
    ctrl: false,
    alt: false,
    shift: true,
    meta: false,
  },
  skipIntro: { code: 'KeyS', key: 's', ctrl: false, alt: false, shift: false, meta: false },
  speedUp: { code: 'Period', key: '>', ctrl: false, alt: false, shift: true, meta: false },
  speedDown: { code: 'Comma', key: '<', ctrl: false, alt: false, shift: true, meta: false },
  speedReset: { code: 'Slash', key: '?', ctrl: false, alt: false, shift: true, meta: false },
}

const NETFLIX_NATIVE_SHORTCUT_ACTIONS = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'fullscreen',
  'skipIntro',
] as const satisfies readonly ShortcutAction[]

const NETFLIX_NATIVE_KEY_BINDINGS: Record<
  (typeof NETFLIX_NATIVE_SHORTCUT_ACTIONS)[number],
  readonly KeyBinding[]
> = {
  playPause: [
    DEFAULT_KEY_BINDINGS.playPause,
    { code: 'Enter', key: 'Enter', ctrl: false, alt: false, shift: false, meta: false },
  ],
  seekBackward: [DEFAULT_KEY_BINDINGS.seekBackward],
  seekForward: [DEFAULT_KEY_BINDINGS.seekForward],
  volumeUp: [DEFAULT_KEY_BINDINGS.volumeUp],
  volumeDown: [DEFAULT_KEY_BINDINGS.volumeDown],
  mute: [DEFAULT_KEY_BINDINGS.mute],
  fullscreen: [DEFAULT_KEY_BINDINGS.fullscreen],
  skipIntro: [DEFAULT_KEY_BINDINGS.skipIntro],
}

export const DEFAULT_SETTINGS: ShortcutSettings = {
  version: SHORTCUT_SETTINGS_VERSION,
  enabled: true,
  locale: 'en',
  speed: DEFAULT_SPEED_SETTINGS,
  spaceHold: DEFAULT_SPACE_HOLD_SETTINGS,
  seek: DEFAULT_SEEK_SETTINGS,
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

export const isShortcutAction = (value: string): value is ShortcutAction =>
  SHORTCUT_ACTIONS.includes(value as ShortcutAction)

export const isLocale = (value: string): value is Locale => LOCALES.includes(value as Locale)

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

  return {
    min,
    max,
    step,
  }
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

export const isKeyBinding = (value: unknown): value is KeyBinding => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<KeyBinding>
  return (
    typeof candidate.code === 'string' &&
    candidate.code.length > 0 &&
    typeof candidate.key === 'string' &&
    typeof candidate.ctrl === 'boolean' &&
    typeof candidate.alt === 'boolean' &&
    typeof candidate.shift === 'boolean' &&
    typeof candidate.meta === 'boolean'
  )
}

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
      return [
        action,
        {
          enabled:
            typeof rawBinding?.enabled === 'boolean'
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
    locale: typeof source.locale === 'string' && isLocale(source.locale) ? source.locale : 'en',
    speed: normalizeSpeedSettings(source.speed),
    spaceHold: normalizeSpaceHoldSettings(source.spaceHold, legacySpeed?.hold),
    seek: normalizeSeekSettings(source.seek),
    bindings,
  }
}

export const keyBindingFromEvent = (event: KeyboardEvent | ReactKeyboardEvent): KeyBinding => ({
  code: event.code,
  key: event.key,
  ctrl: event.ctrlKey,
  alt: event.altKey,
  shift: event.shiftKey,
  meta: event.metaKey,
})

export const keyBindingsEqual = (a: KeyBinding, b: KeyBinding): boolean =>
  a.code === b.code &&
  a.ctrl === b.ctrl &&
  a.alt === b.alt &&
  a.shift === b.shift &&
  a.meta === b.meta

export const findActionForKey = (
  settings: ShortcutSettings,
  event: KeyboardEvent
): ShortcutAction | null => {
  const pressed = keyBindingFromEvent(event)
  const match = SHORTCUT_ACTIONS.find(action => {
    const binding = settings.bindings[action]
    return binding.enabled && keyBindingsEqual(binding.key, pressed)
  })

  return match ?? null
}

export const findRemappedNetflixNativeActionForKey = (
  settings: ShortcutSettings,
  event: KeyboardEvent
): ShortcutAction | null => {
  const pressed = keyBindingFromEvent(event)
  const action = NETFLIX_NATIVE_SHORTCUT_ACTIONS.find(candidate => {
    const binding = settings.bindings[candidate]
    return (
      binding.enabled &&
      !keyBindingsEqual(binding.key, DEFAULT_KEY_BINDINGS[candidate]) &&
      NETFLIX_NATIVE_KEY_BINDINGS[candidate].some(nativeBinding =>
        keyBindingsEqual(nativeBinding, pressed)
      )
    )
  })

  return action ?? null
}

export const findBindingConflict = (
  settings: ShortcutSettings,
  action: ShortcutAction,
  key: KeyBinding
): ShortcutAction | null => {
  const conflict = SHORTCUT_ACTIONS.find(candidate => {
    if (candidate === action) return false
    const binding = settings.bindings[candidate]
    return keyBindingsEqual(binding.key, key)
  })

  return conflict ?? null
}

const CODE_LABELS: Record<string, string> = {
  Space: 'Space',
  Escape: 'Esc',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Del',
  Insert: 'Ins',
  Home: 'Home',
  End: 'End',
  PageUp: 'PgUp',
  PageDown: 'PgDn',
  CapsLock: 'Caps',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Period: '.',
  Comma: ',',
  Slash: '/',
}

type KeyBindingLabelOptions = {
  platform?: string
}

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    platform?: string
  }
}

const getRuntimePlatform = (): string => {
  if (typeof navigator === 'undefined') return ''
  const userAgentDataPlatform = (navigator as NavigatorWithUserAgentData).userAgentData?.platform
  return userAgentDataPlatform ?? navigator.platform
}

export const getMetaKeyLabel = (platform: string = getRuntimePlatform()): string => {
  if (/Mac|iPhone|iPad|iPod/i.test(platform)) return '⌘'
  if (/Win/i.test(platform)) return 'Win'
  return 'Meta'
}

export const getKeyBindingLabels = (
  binding: KeyBinding,
  options: KeyBindingLabelOptions = {}
): string[] => {
  const labels = [
    binding.ctrl ? 'Ctrl' : null,
    binding.alt ? 'Alt' : null,
    binding.shift ? 'Shift' : null,
    binding.meta ? getMetaKeyLabel(options.platform) : null,
    CODE_LABELS[binding.code] ?? binding.key.toUpperCase(),
  ]

  return labels.filter((label): label is string => Boolean(label))
}

export const formatKeyBinding = (
  binding: KeyBinding,
  options: KeyBindingLabelOptions = {}
): string => getKeyBindingLabels(binding, options).join(' + ')

const BASE_PLAYBACK_RATE = 1

export const resolveNextPlaybackRate = (
  currentRate: number,
  direction: -1 | 1,
  speed: SpeedSettings
): number => {
  const normalizedSpeed = normalizeSpeedSettings(speed)
  const safeCurrent = Number.isFinite(currentRate) && currentRate > 0 ? currentRate : 1
  const stepped = safeCurrent + direction * normalizedSpeed.step
  const next =
    direction === -1 && safeCurrent > BASE_PLAYBACK_RATE && stepped < BASE_PLAYBACK_RATE
      ? BASE_PLAYBACK_RATE
      : direction === 1 && safeCurrent < BASE_PLAYBACK_RATE && stepped > BASE_PLAYBACK_RATE
        ? BASE_PLAYBACK_RATE
        : stepped

  return Number(clamp(next, normalizedSpeed.min, normalizedSpeed.max).toFixed(2))
}
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
