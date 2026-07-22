import type { NetflixApiAction, NetflixApiResponse } from '@/shared/netflix-api'
import { sendNetflixApi } from './netflix-api-client'

const DEFAULT_VOLUME = 0.1

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
  adjustVolume: (video: HTMLVideoElement, delta: number) => PlaybackVolumeCommand
  toggleMute: (video: HTMLVideoElement) => PlaybackVolumeCommand
  setPlaybackRate: (
    video: HTMLVideoElement,
    rate: number
  ) => Promise<PlaybackCommandResult>
}

const clampVolume = (volume: number): number => {
  const clamped = Math.min(
    1,
    Math.max(0, Number.isFinite(volume) ? volume : DEFAULT_VOLUME)
  )
  return Number(clamped.toFixed(2))
}

const normalizeAudibleVolume = (volume: number): number | null => {
  if (!Number.isFinite(volume)) return null
  const normalized = clampVolume(volume)
  return normalized > 0 ? normalized : null
}

const rememberVolumeForRestore = (video: HTMLVideoElement, volume: number): void => {
  const normalized = normalizeAudibleVolume(volume)
  if (normalized !== null) {
    video.dataset.shortcutOverrideLastVolume = normalized.toString()
  }
}

const getLastAudibleVolume = (video: HTMLVideoElement): number => {
  const stored = Number.parseFloat(video.dataset.shortcutOverrideLastVolume ?? '')
  const storedVolume = normalizeAudibleVolume(stored)
  if (storedVolume !== null) return storedVolume

  return normalizeAudibleVolume(video.volume) ?? DEFAULT_VOLUME
}

const mirrorAudioState = (
  video: HTMLVideoElement,
  state: { muted?: boolean; volume?: number }
): void => {
  if (state.muted === false) video.muted = false
  if (typeof state.volume === 'number') video.volume = clampVolume(state.volume)
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

  const play = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    void video.play().catch(() => undefined)
    return execute('play')
  }

  const pause = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    video.pause()
    return execute('pause')
  }

  const setVolume = (
    video: HTMLVideoElement,
    volume: number
  ): Promise<PlaybackCommandResult> => {
    const nextVolume = clampVolume(volume)
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
    const restoredVolume = normalizeAudibleVolume(volume) ?? DEFAULT_VOLUME
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
    adjustVolume: (video, delta) => {
      const currentVolume = clampVolume(video.volume)
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
      const nextVolume = clampVolume(baseVolume + delta)

      const completion =
        isSilent && nextVolume > 0
          ? unmuteWithVolume(video, nextVolume)
          : setVolume(video, nextVolume)

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
      return { volume: clampVolume(video.volume), muted: true, completion }
    },
    setPlaybackRate: (video, rate) => {
      video.playbackRate = rate
      video.defaultPlaybackRate = rate
      video.dispatchEvent(new Event('ratechange', { bubbles: true }))
      return execute('setPlaybackRate', rate)
    },
  }
}
