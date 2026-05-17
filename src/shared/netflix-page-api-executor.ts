import type { NetflixApiAction, NetflixPageResult } from '@/shared/netflix-api'

type NetflixWindow = typeof window & {
  netflix?: {
    appContext?: {
      state?: {
        playerApp?: {
          getAPI(): {
            videoPlayer: {
              getAllPlayerSessionIds(): string[]
              getVideoPlayerBySessionId(id: string): {
                play(): void
                pause(): void
                seek(time: number): void
                getCurrentTime(): number
                setVolume(value: number): void
                setMuted(value: boolean): void
              }
            }
          }
        }
      }
    }
  }
}

export const executeNetflixPageApi = (
  action: NetflixApiAction,
  value?: number
): NetflixPageResult => {
  const defaultUnmuteVolume = 0.1
  const clampVolume = (nextVolume: number, fallback = defaultUnmuteVolume) => {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(nextVolume) ? nextVolume : fallback))
    return Number(clamped.toFixed(2))
  }
  const normalizeRestoreVolume = (nextVolume: number) => {
    if (!Number.isFinite(nextVolume) || nextVolume <= 0) return defaultUnmuteVolume
    const restored = clampVolume(nextVolume)
    return restored > 0 ? restored : defaultUnmuteVolume
  }
  const nativeVideo = () => document.querySelector('video')
  const syncAudio = (state: { muted?: boolean; volume?: number }) => {
    const video = nativeVideo()
    if (!(video instanceof HTMLVideoElement)) return

    if (state.muted === false) video.muted = false
    if (typeof state.volume === 'number') video.volume = clampVolume(state.volume)
    if (state.muted === true) video.muted = true
    video.dispatchEvent(new Event('volumechange', { bubbles: true }))
  }
  const syncPlayback = (state: { paused?: boolean; playbackRate?: number }) => {
    const video = nativeVideo()
    if (!(video instanceof HTMLVideoElement)) return

    if (state.paused === true) {
      video.pause()
    } else if (state.paused === false) {
      void video.play().catch(() => undefined)
    }
    if (typeof state.playbackRate === 'number' && Number.isFinite(state.playbackRate)) {
      video.playbackRate = state.playbackRate
      video.defaultPlaybackRate = state.playbackRate
      video.dispatchEvent(new Event('ratechange', { bubbles: true }))
    }
  }

  const result: NetflixPageResult = {
    action,
    bridge: 'main-world',
    playerApiFound: false,
    sessionIds: [],
    playerFound: false,
    seekCalled: false,
  }
  let handledByNetflixPlaybackApi = false

  try {
    const playerApi = (window as NetflixWindow).netflix?.appContext?.state?.playerApp?.getAPI()
      .videoPlayer

    result.playerApiFound = Boolean(playerApi)
    const sessionIds = playerApi?.getAllPlayerSessionIds() ?? []
    result.sessionIds = sessionIds
    const sessionId = sessionIds[0]
    result.sessionId = sessionId
    const player = sessionId ? playerApi?.getVideoPlayerBySessionId(sessionId) : null
    result.playerFound = Boolean(player)

    if (player) {
      if (action === 'play') {
        player.play()
        handledByNetflixPlaybackApi = true
      } else if (action === 'pause') {
        player.pause()
        handledByNetflixPlaybackApi = true
      } else if (action === 'seek' && value !== undefined) {
        result.currentTime = player.getCurrentTime()
        result.targetTime = result.currentTime + value
        player.seek(result.targetTime)
        result.seekCalled = true
      } else if (action === 'setVolume' && value !== undefined) {
        player.setVolume(clampVolume(value))
      } else if (action === 'setMuted') {
        player.setMuted(Boolean(value))
      } else if (action === 'unmuteWithVolume' && value !== undefined) {
        const restored = normalizeRestoreVolume(value)
        player.setVolume(restored)
        player.setMuted(false)
        player.setVolume(restored)
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unable to access Netflix player API.'
  }

  if (action === 'setVolume' && value !== undefined) {
    syncAudio({ volume: value })
  } else if (action === 'setMuted') {
    syncAudio({ muted: Boolean(value) })
  } else if (action === 'unmuteWithVolume' && value !== undefined) {
    syncAudio({ volume: normalizeRestoreVolume(value), muted: false })
  } else if (action === 'play' && !handledByNetflixPlaybackApi) {
    syncPlayback({ paused: false })
  } else if (action === 'pause' && !handledByNetflixPlaybackApi) {
    syncPlayback({ paused: true })
  } else if (action === 'setPlaybackRate' && value !== undefined) {
    syncPlayback({ playbackRate: value })
  }

  return result
}
