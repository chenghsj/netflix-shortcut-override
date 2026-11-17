export const SPECIAL_SHORTCUT_KEY_GROUPS = {
  media: ['MediaTrackNext', 'MediaTrackPrevious', 'MediaPlayPause', 'MediaStop',
    'MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaRecord'],
  volume: ['AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute'],
  browser: ['BrowserBack', 'BrowserForward'],
} as const

export type SpecialShortcutKeyGroup = keyof typeof SPECIAL_SHORTCUT_KEY_GROUPS
export type SpecialShortcutKey = typeof SPECIAL_SHORTCUT_KEY_GROUPS[SpecialShortcutKeyGroup][number]
export const SPECIAL_SHORTCUT_KEYS: readonly SpecialShortcutKey[] = Object.values(SPECIAL_SHORTCUT_KEY_GROUPS).flat()

export const LEGACY_SPECIAL_KEY_ALIASES = {
  MediaNextTrack: 'MediaTrackNext',
  MediaPreviousTrack: 'MediaTrackPrevious',
  VolumeUp: 'AudioVolumeUp',
  VolumeDown: 'AudioVolumeDown',
  VolumeMute: 'AudioVolumeMute',
} as const satisfies Record<string, SpecialShortcutKey>

const specialKeys = new Set<string>(SPECIAL_SHORTCUT_KEYS)
const canonicalName = (name: string): string => Object.hasOwn(LEGACY_SPECIAL_KEY_ALIASES, name)
  ? LEGACY_SPECIAL_KEY_ALIASES[name as keyof typeof LEGACY_SPECIAL_KEY_ALIASES] : name

// Preserve physical codes (including Fn keys). Only known named keys may
// supply a fallback identity; characters, IME keys and unknown keys cannot.
export const getShortcutKeyCode = ({ code, key }: { code: string; key: string }): string => {
  if (code && code !== 'Unidentified') return canonicalName(code)
  const namedKey = canonicalName(key)
  return specialKeys.has(namedKey) ? namedKey : ''
}
