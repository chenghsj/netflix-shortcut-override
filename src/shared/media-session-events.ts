export const MEDIA_SESSION_ACTION_EVENT = 'shortcut-override:media-session-action'
export const MEDIA_SESSION_SETTINGS_EVENT = 'shortcut-override:media-session-settings'
export const MEDIA_SESSION_READY_EVENT = 'shortcut-override:media-session-ready'
export const MEDIA_SESSION_RESULT_EVENT = 'shortcut-override:media-session-result'

export const MEDIA_SESSION_KEYS = {
  // For media-only commands, separate play/pause keys precede the combined key.
  // When a keyboard notification is also delivered, its actual key wins.
  play: ['MediaPlay', 'MediaPlayPause'],
  pause: ['MediaPause', 'MediaPlayPause'],
  stop: ['MediaStop'],
  seekforward: ['MediaFastForward'],
  seekbackward: ['MediaRewind'],
  previoustrack: ['MediaTrackPrevious'],
  nexttrack: ['MediaTrackNext'],
} as const

export type SupportedMediaSessionAction = keyof typeof MEDIA_SESSION_KEYS
export const MEDIA_SESSION_ACTIONS = Object.keys(MEDIA_SESSION_KEYS) as SupportedMediaSessionAction[]
export const isSupportedMediaSessionAction = (value: unknown): value is SupportedMediaSessionAction =>
  typeof value === 'string' && Object.hasOwn(MEDIA_SESSION_KEYS, value)

export const readMediaSessionRequest = (detail: unknown): { action: SupportedMediaSessionAction; id?: string } | null => {
  // Keep direct action events usable by local fixtures and an older page bridge.
  if (isSupportedMediaSessionAction(detail)) return { action: detail }
  if (typeof detail !== 'string') return null
  try {
    const value: unknown = JSON.parse(detail)
    if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' &&
      value.id.length > 0 && 'action' in value && isSupportedMediaSessionAction(value.action)) return { id: value.id, action: value.action }
  } catch { /* Ignore malformed page events. */ }
  return null
}
