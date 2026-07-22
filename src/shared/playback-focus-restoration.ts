export const PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE =
  'REQUEST_PLAYBACK_FOCUS_RESTORATION'

export type PlaybackFocusTarget = {
  tabId: number
  windowId: number
}

export type PlaybackFocusRestorationRequest = PlaybackFocusTarget & {
  type: typeof PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE
}

export const isNetflixWatchUrl = (url: string | undefined): boolean => {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isNetflix = host === 'netflix.com' || host.endsWith('.netflix.com')
    return (
      isNetflix &&
      (parsed.pathname === '/watch' || parsed.pathname.startsWith('/watch/'))
    )
  } catch {
    return false
  }
}

export const isPlaybackFocusRestorationRequest = (
  value: unknown
): value is PlaybackFocusRestorationRequest => {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<PlaybackFocusRestorationRequest>
  return (
    request.type === PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE &&
    typeof request.tabId === 'number' &&
    typeof request.windowId === 'number'
  )
}

export const restoreVisibleNetflixWatchPageFocus = (): boolean => {
  const host = window.location.hostname.toLowerCase()
  const isNetflix = host === 'netflix.com' || host.endsWith('.netflix.com')
  const isWatchPage =
    window.location.pathname === '/watch' ||
    window.location.pathname.startsWith('/watch/')
  if (!isNetflix || !isWatchPage || document.visibilityState !== 'visible') {
    return false
  }

  window.focus()
  return document.hasFocus()
}
