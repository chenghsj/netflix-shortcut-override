import type { NetflixApiAction, NetflixPageResult } from '@/shared/netflix-api'

type NetflixPlayer = {
  play(): void
  pause(): void
  seek(time: number): void
  getCurrentTime(): number
  setVolume(value: number): void
  setMuted(value: boolean): void
  getTextTrackList?(): NetflixTextTrack[]
  getTimedTextTrackList?(): NetflixTextTrack[]
  getTextTrack?(): NetflixTextTrack | null | undefined
  getTimedTextTrack?(): NetflixTextTrack | null | undefined
  setTextTrack?(track: NetflixTextTrack): void
  setTimedTextTrack?(track: NetflixTextTrack): void
}

type NetflixTextTrack = {
  id?: string
  trackId?: string
  bcp47?: string
  language?: string
  displayName?: string
  isNoneTrack?: boolean
  isSelected?: boolean
  selected?: boolean
}

type NetflixTextTrackReference = Pick<
  NetflixTextTrack,
  'id' | 'trackId' | 'bcp47' | 'language' | 'displayName'
>

type NetflixVideoPlayerApi = {
  getAllPlayerSessionIds(): string[]
  getVideoPlayerBySessionId(id: string): NetflixPlayer | null | undefined
}

type NetflixWindow = typeof window & {
  documentPictureInPicture?: {
    window?: Window | null
  }
  netflix?: {
    appContext?: {
      state?: {
        playerApp?: {
          getAPI(): { videoPlayer: NetflixVideoPlayerApi }
        }
      }
    }
  }
  __shortcutOverrideSubtitleState?: {
    lastTrack?: NetflixTextTrackReference
    subtitlesEnabled?: boolean
  }
}

export const executeNetflixPageApi = (
  action: NetflixApiAction,
  value?: number
): NetflixPageResult => {
  // chrome.scripting.executeScript serializes this function without its module
  // scope, so every runtime dependency must remain inside this function body.
  const defaultVolume = 0.1
  const clampVolume = (volume: number, fallback = defaultVolume): number => {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : fallback))
    return Number(clamped.toFixed(2))
  }
  const normalizeRestoreVolume = (volume: number): number => {
    if (!Number.isFinite(volume) || volume <= 0) return defaultVolume
    const restored = clampVolume(volume)
    return restored > 0 ? restored : defaultVolume
  }
  const getVideoArea = (video: HTMLVideoElement): number => {
    const rect = video.getBoundingClientRect()
    return Math.max(0, rect.width) * Math.max(0, rect.height)
  }
  const getFiniteVideoDuration = (video: HTMLVideoElement): number =>
    Number.isFinite(video.duration) ? Math.max(0, video.duration) : 0
  const preferSessionReferenceVideo = (
    left: HTMLVideoElement,
    right: HTMLVideoElement
  ): HTMLVideoElement => {
    const leftPlaying = !left.paused && !left.ended
    const rightPlaying = !right.paused && !right.ended
    if (leftPlaying !== rightPlaying) return leftPlaying ? left : right

    const leftArea = getVideoArea(left)
    const rightArea = getVideoArea(right)
    if (leftArea !== rightArea) return leftArea > rightArea ? left : right

    return getFiniteVideoDuration(left) >= getFiniteVideoDuration(right) ? left : right
  }
  const findSessionReferenceVideo = (pageWindow: NetflixWindow): HTMLVideoElement | null => {
    try {
      const pipVideo = pageWindow.documentPictureInPicture?.window?.document.querySelector('video')
      if (pipVideo) return pipVideo as HTMLVideoElement
    } catch {
      // The PiP window can disappear between reading the API and its document.
    }

    // This video is only a time reference for matching Netflix player sessions.
    // It is not the presentation-oriented selection used by shortcuts and PiP entry.
    return Array.from(document.querySelectorAll<HTMLVideoElement>('video')).reduce<HTMLVideoElement | null>(
      (preferred, candidate) =>
        preferred ? preferSessionReferenceVideo(preferred, candidate) : candidate,
      null
    )
  }
  const getPlayerCurrentTime = (player: NetflixPlayer): number | null => {
    try {
      const currentTime = player.getCurrentTime()
      return Number.isFinite(currentTime) ? currentTime : null
    } catch {
      return null
    }
  }
  const getTextTracks = (player: NetflixPlayer): NetflixTextTrack[] => {
    const tracks = player.getTextTrackList?.() ?? player.getTimedTextTrackList?.() ?? []
    return Array.isArray(tracks) ? tracks : []
  }
  const isNoneTextTrack = (track: NetflixTextTrack | null | undefined): boolean =>
    track?.isNoneTrack === true
  const getSelectedTextTrack = (
    player: NetflixPlayer,
    tracks: NetflixTextTrack[]
  ): NetflixTextTrack | null =>
    player.getTextTrack?.() ??
    player.getTimedTextTrack?.() ??
    tracks.find(track => track.isSelected === true || track.selected === true) ??
    null
  const rememberTextTrack = (track: NetflixTextTrack): NetflixTextTrackReference => ({
    id: track.id,
    trackId: track.trackId,
    bcp47: track.bcp47,
    language: track.language,
    displayName: track.displayName,
  })
  const findRememberedTextTrack = (
    tracks: NetflixTextTrack[],
    reference: NetflixTextTrackReference | undefined
  ): NetflixTextTrack | null => {
    const selectableTracks = tracks.filter(track => !isNoneTextTrack(track))
    if (!reference) return selectableTracks[0] ?? null

    return (
      selectableTracks.find(
        track =>
          (reference.id && track.id === reference.id) ||
          (reference.trackId && track.trackId === reference.trackId)
      ) ??
      selectableTracks.find(
        track =>
          (reference.bcp47 && track.bcp47 === reference.bcp47) ||
          (reference.language && track.language === reference.language)
      ) ??
      selectableTracks.find(
        track => reference.displayName && track.displayName === reference.displayName
      ) ??
      selectableTracks[0] ??
      null
    )
  }
  const getTextTrackLabel = (track: NetflixTextTrack): string | undefined =>
    track.displayName ?? track.bcp47 ?? track.language ?? track.id ?? track.trackId
  const readSubtitleState = (
    player: NetflixPlayer,
    result: NetflixPageResult
  ): void => {
    const currentTrack = getSelectedTextTrack(player, getTextTracks(player))
    if (!currentTrack) {
      throw new Error('Unable to determine the current Netflix subtitle track.')
    }

    result.subtitlesEnabled = !isNoneTextTrack(currentTrack)
    result.subtitleTrack = getTextTrackLabel(currentTrack)
  }
  const toggleSubtitles = (
    pageWindow: NetflixWindow,
    player: NetflixPlayer,
    result: NetflixPageResult
  ): void => {
    const tracks = getTextTracks(player)
    const setTextTrack = player.setTextTrack ?? player.setTimedTextTrack
    if (tracks.length === 0 || typeof setTextTrack !== 'function') {
      throw new Error('Netflix subtitle track API is unavailable.')
    }

    const state = pageWindow.__shortcutOverrideSubtitleState ?? {}
    const currentTrack = getSelectedTextTrack(player, tracks)
    const currentlyEnabled = currentTrack
      ? !isNoneTextTrack(currentTrack)
      : state.subtitlesEnabled
    if (currentlyEnabled === undefined) {
      throw new Error('Unable to determine the current Netflix subtitle track.')
    }

    if (currentlyEnabled) {
      const noneTrack = tracks.find(isNoneTextTrack)
      if (!noneTrack) throw new Error('Netflix subtitle off track is unavailable.')
      if (currentTrack && !isNoneTextTrack(currentTrack)) {
        state.lastTrack = rememberTextTrack(currentTrack)
      }
      setTextTrack.call(player, noneTrack)
      state.subtitlesEnabled = false
      result.subtitlesEnabled = false
      result.subtitleTrack = getTextTrackLabel(noneTrack)
    } else {
      const nextTrack = findRememberedTextTrack(tracks, state.lastTrack)
      if (!nextTrack) throw new Error('No Netflix subtitle track is available.')
      setTextTrack.call(player, nextTrack)
      state.lastTrack = rememberTextTrack(nextTrack)
      state.subtitlesEnabled = true
      result.subtitlesEnabled = true
      result.subtitleTrack = getTextTrackLabel(nextTrack)
    }

    pageWindow.__shortcutOverrideSubtitleState = state
    result.subtitleToggleCalled = true
  }
  const selectPlayerSession = (
    videoPlayer: NetflixVideoPlayerApi,
    sessionIds: string[],
    playbackVideo: HTMLVideoElement | null
  ): { sessionId: string; player: NetflixPlayer } | null => {
    const players = sessionIds.flatMap(sessionId => {
      const player = videoPlayer.getVideoPlayerBySessionId(sessionId)
      return player ? [{ sessionId, player }] : []
    })
    if (players.length <= 1 || !playbackVideo || !Number.isFinite(playbackVideo.currentTime)) {
      return players[0] ?? null
    }

    const playbackTime = playbackVideo.currentTime * 1_000
    return players.reduce((closest, candidate) => {
      const closestTime = getPlayerCurrentTime(closest.player)
      const candidateTime = getPlayerCurrentTime(candidate.player)
      if (candidateTime === null) return closest
      if (closestTime === null) return candidate
      return Math.abs(candidateTime - playbackTime) < Math.abs(closestTime - playbackTime)
        ? candidate
        : closest
    })
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
    const selected = playerApi
      ? selectPlayerSession(
          playerApi,
          sessionIds,
          findSessionReferenceVideo(window as NetflixWindow)
        )
      : null
    result.sessionId = selected?.sessionId
    const player = selected?.player
    result.playerFound = Boolean(player)

    if (player) {
      if (action === 'diagnose') {
        // Diagnostics only inspect API availability and must not alter playback.
      } else if (action === 'play') {
        player.play()
      } else if (action === 'pause') {
        player.pause()
      } else if ((action === 'seek' || action === 'seekTo') && value !== undefined) {
        const currentTime = player.getCurrentTime()
        result.currentTime = currentTime
        result.targetTime = action === 'seek' ? currentTime + value : value
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
      } else if (action === 'getSubtitleState') {
        readSubtitleState(player, result)
      } else if (action === 'toggleSubtitles') {
        toggleSubtitles(window as NetflixWindow, player, result)
      }
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unable to access Netflix player API.'
  }

  return result
}
