import type { NetflixApiAction, NetflixApiResponse } from '@/shared/netflix-api'
import {
  clampNetflixVolume,
  DEFAULT_NETFLIX_VOLUME,
  normalizeAudibleNetflixVolume,
  normalizeNetflixRestoreVolume,
} from '@/shared/netflix-playback-values'
import { sendNetflixApi } from './netflix-api-client'

export type NetflixPlaybackTransport = (
  action: NetflixApiAction,
  value?: number
) => Promise<NetflixApiResponse>

export type PlaybackCommandResult = {
  response: NetflixApiResponse
  failureLabel: string | null
}

export type PlaybackVolumeState = {
  volume: number
  muted: boolean
}

export type PlaybackVolumeCommand = PlaybackVolumeState & {
  completion: Promise<PlaybackCommandResult>
}

export type NetflixPlaybackSession = {
  togglePlayback: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  play: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  pause: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  seekBy: (milliseconds: number) => Promise<PlaybackCommandResult>
  seekTo: (milliseconds: number) => Promise<PlaybackCommandResult>
  setVolume: (video: HTMLVideoElement, volume: number) => PlaybackVolumeCommand
  adjustVolume: (video: HTMLVideoElement, delta: number) => PlaybackVolumeCommand
  toggleMute: (video: HTMLVideoElement) => PlaybackVolumeCommand
  getSubtitleState: () => Promise<PlaybackCommandResult>
  toggleSubtitles: () => Promise<PlaybackCommandResult>
  setPlaybackRate: (
    video: HTMLVideoElement,
    rate: number
  ) => Promise<PlaybackCommandResult>
}

const rememberVolumeForRestore = (video: HTMLVideoElement, volume: number): void => {
  const normalized = normalizeAudibleNetflixVolume(volume)
  if (normalized !== null) {
    video.dataset.shortcutOverrideLastVolume = normalized.toString()
  }
}

const getLastAudibleVolume = (video: HTMLVideoElement): number => {
  const stored = Number.parseFloat(video.dataset.shortcutOverrideLastVolume ?? '')
  const storedVolume = normalizeAudibleNetflixVolume(stored)
  if (storedVolume !== null) return storedVolume

  return normalizeAudibleNetflixVolume(video.volume) ?? DEFAULT_NETFLIX_VOLUME
}

const mirrorAudioState = (
  video: HTMLVideoElement,
  state: { muted?: boolean; volume?: number }
): void => {
  if (state.muted === false) video.muted = false
  if (typeof state.volume === 'number') video.volume = clampNetflixVolume(state.volume)
  if (state.muted === true) video.muted = true
  video.dispatchEvent(new Event('volumechange', { bubbles: true }))
}

const getSeekFailureLabel = (response: NetflixApiResponse): string | null => {
  if (!response.success) return `Seek failed: ${response.error ?? 'background error'}`
  if (response.result?.seekCalled) return null
  if (response.result?.error) return `Seek failed: ${response.result.error}`
  if (response.result?.playerApiFound === false) return 'Seek failed: no Netflix API'
  if (response.result?.playerFound === false) return 'Seek failed: no Netflix player'
  return 'Seek failed: no seek call'
}

const getCommandFailureLabel = (
  action: NetflixApiAction,
  response: NetflixApiResponse
): string | null => {
  if (action === 'seek' || action === 'seekTo') return getSeekFailureLabel(response)
  if (!response.success) return `${action} failed: ${response.error ?? 'background error'}`
  if (response.result?.error) return `${action} failed: ${response.result.error}`
  if (
    action === 'getSubtitleState' &&
    typeof response.result?.subtitlesEnabled !== 'boolean'
  ) {
    if (response.result?.playerApiFound === false) return 'getSubtitleState failed: no Netflix API'
    if (response.result?.playerFound === false) return 'getSubtitleState failed: no Netflix player'
    return 'getSubtitleState failed: no subtitle state'
  }
  if (action === 'toggleSubtitles' && response.result?.subtitleToggleCalled !== true) {
    if (response.result?.playerApiFound === false) return 'toggleSubtitles failed: no Netflix API'
    if (response.result?.playerFound === false) return 'toggleSubtitles failed: no Netflix player'
    return 'toggleSubtitles failed: no subtitle API call'
  }
  return null
}

const createNoOpResult = (): PlaybackCommandResult => ({
  response: { success: true },
  failureLabel: null,
})

const combineCommandResults = (
  primary: PlaybackCommandResult,
  secondary: PlaybackCommandResult
): PlaybackCommandResult => ({
  response: primary.failureLabel ? primary.response : secondary.response,
  failureLabel: primary.failureLabel ?? secondary.failureLabel,
})

export const createNetflixPlaybackSession = (
  transport: NetflixPlaybackTransport = sendNetflixApi
): NetflixPlaybackSession => {
  let subtitleToggleQueue: Promise<PlaybackCommandResult> | null = null

  const execute = async (
    action: NetflixApiAction,
    value?: number
  ): Promise<PlaybackCommandResult> => {
    let response: NetflixApiResponse
    try {
      response =
        value === undefined
          ? await transport(action)
          : await transport(action, value)
    } catch (error) {
      response = {
        success: false,
        error: error instanceof Error ? error.message : 'Unable to execute Netflix command.',
      }
    }

    return {
      response,
      failureLabel: getCommandFailureLabel(action, response),
    }
  }

  const toggleSubtitles = (): Promise<PlaybackCommandResult> => {
    const request = subtitleToggleQueue
      ? subtitleToggleQueue.then(
          () => execute('toggleSubtitles'),
          () => execute('toggleSubtitles')
        )
      : execute('toggleSubtitles')
    subtitleToggleQueue = request
    const clearCompletedRequest = () => {
      if (subtitleToggleQueue === request) subtitleToggleQueue = null
    }
    void request.then(clearCompletedRequest, clearCompletedRequest)
    return request
  }

  const play = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    void video.play().catch(() => undefined)
    return execute('play')
  }

  const pause = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    video.pause()
    return execute('pause')
  }

  const applyVolume = (
    video: HTMLVideoElement,
    volume: number
  ): Promise<PlaybackCommandResult> => {
    const nextVolume = clampNetflixVolume(volume)
    const volumeCompletion = execute('setVolume', nextVolume)
    const completion =
      nextVolume === 0
        ? Promise.all([volumeCompletion, execute('setMuted', 1)]).then(([volumeResult, muteResult]) =>
            combineCommandResults(volumeResult, muteResult)
          )
        : volumeCompletion
    mirrorAudioState(video, { volume: nextVolume, muted: nextVolume === 0 })
    return completion
  }

  const unmuteWithVolume = (
    video: HTMLVideoElement,
    volume: number
  ): Promise<PlaybackCommandResult> => {
    const restoredVolume = normalizeNetflixRestoreVolume(volume)
    const completion = execute('unmuteWithVolume', restoredVolume)
    mirrorAudioState(video, { volume: restoredVolume, muted: false })
    return completion
  }

  return {
    togglePlayback: video => (video.paused ? play(video) : pause(video)),
    play,
    pause,
    seekBy: milliseconds => execute('seek', milliseconds),
    seekTo: milliseconds => execute('seekTo', milliseconds),
    setVolume: (video, volume) => {
      const nextVolume = clampNetflixVolume(volume)
      const previousVolume = clampNetflixVolume(video.volume)
      const completion =
        (video.muted || previousVolume === 0) && nextVolume > 0
          ? unmuteWithVolume(video, nextVolume)
          : applyVolume(video, nextVolume)

      if (nextVolume > 0) rememberVolumeForRestore(video, nextVolume)
      else if (previousVolume > 0) rememberVolumeForRestore(video, previousVolume)

      return { volume: nextVolume, muted: nextVolume === 0, completion }
    },
    adjustVolume: (video, delta) => {
      const currentVolume = clampNetflixVolume(video.volume)
      const isSilent = video.muted || currentVolume === 0

      if (isSilent && delta < 0) {
        if (currentVolume > 0) rememberVolumeForRestore(video, currentVolume)
        return {
          volume: 0,
          muted: true,
          completion: Promise.resolve(createNoOpResult()),
        }
      }

      const baseVolume = isSilent ? 0 : currentVolume
      const nextVolume = clampNetflixVolume(baseVolume + delta)

      const completion =
        isSilent && nextVolume > 0
          ? unmuteWithVolume(video, nextVolume)
          : applyVolume(video, nextVolume)

      if (nextVolume > 0) rememberVolumeForRestore(video, nextVolume)
      else if (baseVolume > 0) rememberVolumeForRestore(video, baseVolume)

      return { volume: nextVolume, muted: nextVolume === 0, completion }
    },
    toggleMute: video => {
      if (video.muted || video.volume === 0) {
        const restoredVolume = getLastAudibleVolume(video)
        const completion = unmuteWithVolume(video, restoredVolume)
        rememberVolumeForRestore(video, restoredVolume)
        return { volume: restoredVolume, muted: false, completion }
      }

      rememberVolumeForRestore(video, video.volume)
      const completion = execute('setMuted', 1)
      mirrorAudioState(video, { muted: true })
      return { volume: clampNetflixVolume(video.volume), muted: true, completion }
    },
    getSubtitleState: () => execute('getSubtitleState'),
    toggleSubtitles,
    setPlaybackRate: (video, rate) => {
      video.playbackRate = rate
      video.defaultPlaybackRate = rate
      video.dispatchEvent(new Event('ratechange', { bubbles: true }))
      return execute('setPlaybackRate', rate)
    },
  }
}
