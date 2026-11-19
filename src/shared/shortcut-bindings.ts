import {
  SHORTCUT_ACTIONS,
  type KeyBinding,
  type KeyEventLike,
  type ShortcutAction,
  type BuiltinShortcutAction,
  type ShortcutBinding,
  type ShortcutSettings,
} from './shortcut-types'
import { getSeekShortcutActions } from './seek-shortcuts'
import { getShortcutKeyCode } from './special-shortcut-keys'

export const DEFAULT_KEY_BINDINGS: Record<BuiltinShortcutAction, KeyBinding> = {
  playPause: { code: 'Space', key: ' ', ctrl: false, alt: false, shift: false, meta: false },
  seekBackward: { code: 'ArrowLeft', key: 'ArrowLeft', ctrl: false, alt: false, shift: false, meta: false },
  seekForward: { code: 'ArrowRight', key: 'ArrowRight', ctrl: false, alt: false, shift: false, meta: false },
  previousFrame: { code: 'Comma', key: ',', ctrl: false, alt: false, shift: false, meta: false },
  nextFrame: { code: 'Period', key: '.', ctrl: false, alt: false, shift: false, meta: false },
  volumeUp: { code: 'ArrowUp', key: 'ArrowUp', ctrl: false, alt: false, shift: false, meta: false },
  volumeDown: { code: 'ArrowDown', key: 'ArrowDown', ctrl: false, alt: false, shift: false, meta: false },
  mute: { code: 'KeyM', key: 'm', ctrl: false, alt: false, shift: false, meta: false },
  toggleSubtitles: { code: 'KeyC', key: 'c', ctrl: false, alt: false, shift: false, meta: false },
  cycleSubtitleTrack: { code: 'KeyX', key: 'X', ctrl: false, alt: false, shift: true, meta: false },
  previousSubtitleTrack: { code: 'KeyZ', key: 'Z', ctrl: false, alt: false, shift: true, meta: false },
  previousAudioTrack: { code: 'KeyA', key: 'A', ctrl: false, alt: false, shift: true, meta: false },
  nextAudioTrack: { code: 'KeyD', key: 'D', ctrl: false, alt: false, shift: true, meta: false },
  cycleSubtitleSize: { code: 'KeyC', key: 'C', ctrl: false, alt: false, shift: true, meta: false },
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
  previousEpisode: { code: 'KeyP', key: 'p', ctrl: true, alt: false, shift: false, meta: false },
  nextEpisode: { code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: false, meta: false },
  speedUp: { code: 'Period', key: '>', ctrl: false, alt: false, shift: true, meta: false },
  speedDown: { code: 'Comma', key: '<', ctrl: false, alt: false, shift: true, meta: false },
  setPreferredSpeed: {
    code: 'Quote',
    key: '"',
    ctrl: false,
    alt: false,
    shift: true,
    meta: false,
  },
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
  playPause: [DEFAULT_KEY_BINDINGS.playPause],
  seekBackward: [DEFAULT_KEY_BINDINGS.seekBackward],
  seekForward: [DEFAULT_KEY_BINDINGS.seekForward],
  volumeUp: [DEFAULT_KEY_BINDINGS.volumeUp],
  volumeDown: [DEFAULT_KEY_BINDINGS.volumeDown],
  mute: [DEFAULT_KEY_BINDINGS.mute],
  fullscreen: [DEFAULT_KEY_BINDINGS.fullscreen],
  skipIntro: [DEFAULT_KEY_BINDINGS.skipIntro],
}

export const isShortcutAction = (value: string): value is BuiltinShortcutAction =>
  SHORTCUT_ACTIONS.includes(value as BuiltinShortcutAction)

export const getShortcutActions = (settings: ShortcutSettings): ShortcutAction[] =>
  [...SHORTCUT_ACTIONS, ...settings.seekShortcuts.flatMap(getSeekShortcutActions), ...settings.subtitleSizeShortcuts.map(shortcut => shortcut.id), ...settings.preferredSpeedShortcuts.map(shortcut => shortcut.id)]

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

export const isShortcutKey = (value: unknown): value is KeyBinding | null =>
  value === null || isKeyBinding(value)

export const keyBindingFromEvent = (event: KeyEventLike): KeyBinding => ({
  code: getShortcutKeyCode(event),
  key: event.key,
  ctrl: event.ctrlKey,
  alt: event.altKey,
  shift: event.shiftKey,
  meta: event.metaKey,
})

export const keyBindingsEqual = (a: KeyBinding | null | undefined, b: KeyBinding | null | undefined): boolean => {
  if (!a || !b) return a === b
  if (a.ctrl !== b.ctrl || a.alt !== b.alt || a.shift !== b.shift || a.meta !== b.meta) return false

  const aCode = getShortcutKeyCode(a)
  const bCode = getShortcutKeyCode(b)
  if (aCode || bCode) return aCode === bCode

  // Legacy saved unknown keys must remain editable and round-trip in backups.
  // Unknown events normalize to an empty code, so they cannot use this fallback.
  return Boolean(a.code) && a.code === b.code && a.key === b.key
}

export const MAX_SHORTCUT_KEYS = 3

export const getBindingKeys = (
  binding: Partial<Pick<ShortcutBinding, 'key' | 'additionalKeys'>> | undefined,
): KeyBinding[] =>
  binding ? [binding.key, ...(binding.additionalKeys ?? [])].filter((key): key is KeyBinding => Boolean(key)) : []

export const bindingMatchesKey = (
  binding: Pick<ShortcutBinding, 'key' | 'additionalKeys'> | undefined,
  key: KeyBinding | null | undefined,
): boolean =>
  Boolean(key && getBindingKeys(binding).some(candidate => keyBindingsEqual(candidate, key)))

export const keyListsEqual = (
  left: readonly (KeyBinding | null)[],
  right: readonly (KeyBinding | null)[],
): boolean =>
  left.length === right.length && left.every((key, index) => keyBindingsEqual(key, right[index]))

// Editors may contain empty recording fields. Saving removes those fields and
// promotes the first remaining key to the backward-compatible primary field.
export const bindingWithKeys = (enabled: boolean, keys: readonly (KeyBinding | null)[]): ShortcutBinding => {
  const assigned = keys.filter((key): key is KeyBinding => Boolean(key))
  return {
    enabled,
    key: assigned[0] ?? null,
    ...(assigned.length > 1 ? { additionalKeys: assigned.slice(1) } : {}),
  }
}

export const findActionForKey = (
  settings: ShortcutSettings,
  event: KeyEventLike
): ShortcutAction | null => {
  const pressed = keyBindingFromEvent(event)
  const match = getShortcutActions(settings).find(action => {
    const binding = settings.bindings[action]
    return binding.enabled && bindingMatchesKey(binding, pressed)
  })

  return match ?? null
}

export const getReplacedNetflixNativeKeyBindings = (
  action: ShortcutAction,
  binding: ShortcutBinding
): readonly KeyBinding[] => {
  if (
    !NETFLIX_NATIVE_SHORTCUT_ACTIONS.includes(
      action as (typeof NETFLIX_NATIVE_SHORTCUT_ACTIONS)[number]
    )
  ) {
    return []
  }

  const nativeAction = action as (typeof NETFLIX_NATIVE_SHORTCUT_ACTIONS)[number]
  if (!binding.enabled || !getBindingKeys(binding).length || bindingMatchesKey(binding, DEFAULT_KEY_BINDINGS[nativeAction])) {
    return []
  }

  return NETFLIX_NATIVE_KEY_BINDINGS[nativeAction]
}

export const findRemappedNetflixNativeActionForKey = (
  settings: ShortcutSettings,
  event: KeyEventLike
): ShortcutAction | null => {
  const pressed = keyBindingFromEvent(event)
  const action = NETFLIX_NATIVE_SHORTCUT_ACTIONS.find(candidate => {
    return getReplacedNetflixNativeKeyBindings(candidate, settings.bindings[candidate]).some(
      nativeBinding => keyBindingsEqual(nativeBinding, pressed)
    )
  })

  return action ?? null
}

export const isApplePlatform = (platform: string = getRuntimePlatform()): boolean =>
  /Mac|iPhone|iPad|iPod/i.test(platform)

export const getMetaKeyLabel = (platform: string = getRuntimePlatform()): string => {
  if (isApplePlatform(platform)) return '⌘'
  if (/Win/i.test(platform)) return 'Win'
  return 'Meta'
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

export const getKeyBindingLabels = (
  binding: KeyBinding | null,
  options: KeyBindingLabelOptions = {}
): string[] => {
  if (!binding) return []
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
  binding: KeyBinding | null,
  options: KeyBindingLabelOptions = {}
): string => getKeyBindingLabels(binding, options).join(' + ')
