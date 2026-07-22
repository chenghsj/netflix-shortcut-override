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
  const result: NetflixPageResult = {
    action,
    bridge: 'main-world',
    playerApiFound: false,
    sessionIds: [],
    playerFound: false,
    seekCalled: false,
  }
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
      if (action === 'diagnose') {
        // Diagnostics only inspect API availability and must not alter playback.
      } else if (action === 'play') {
        player.play()
      } else if (action === 'pause') {
        player.pause()
      } else if ((action === 'seek' || action === 'seekTo') && value !== undefined) {
        result.currentTime = player.getCurrentTime()
        result.targetTime = action === 'seek' ? result.currentTime + value : value
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

  return result
}
