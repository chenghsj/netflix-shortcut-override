import {
  SHORTCUT_ACTIONS,
  type KeyBinding,
  type KeyEventLike,
  type ShortcutAction,
  type ShortcutSettings,
} from './shortcut-types'

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

export const isShortcutAction = (value: string): value is ShortcutAction =>
  SHORTCUT_ACTIONS.includes(value as ShortcutAction)

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

export const keyBindingFromEvent = (event: KeyEventLike): KeyBinding => ({
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
  event: KeyEventLike
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
  event: KeyEventLike
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
  key: KeyBinding,
  options: { ignoredActions?: readonly ShortcutAction[] } = {}
): ShortcutAction | null => {
  const conflict = SHORTCUT_ACTIONS.find(candidate => {
    if (candidate === action || options.ignoredActions?.includes(candidate)) return false
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
