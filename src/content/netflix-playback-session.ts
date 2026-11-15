import type { NetflixApiAction, NetflixApiResponse } from '@/shared/netflix-api'
import type { SubtitleFavorite } from '@/shared/subtitle-favorites'
import type { AudioFavorite } from '@/shared/audio-favorites'
import {
  clampNetflixVolume,
  DEFAULT_NETFLIX_VOLUME,
  normalizeAudibleNetflixVolume,
  normalizeNetflixRestoreVolume,
} from '@/shared/netflix-playback-values'
import { sendNetflixApi } from './netflix-api-client'

export type NetflixPlaybackTransport = (
  action: NetflixApiAction,
  value?: number,
  subtitleFavorites?: readonly SubtitleFavorite[],
  audioFavorites?: readonly AudioFavorite[]
) => Promise<NetflixApiResponse>

export type PlaybackCommandResult = {
  response: NetflixApiResponse
  failureLabel: string | null
}

// A null state carries no confirmation (failure or a read superseded by a
// successful subtitle command). Callers never need to inspect transport payloads.
export type PlaybackSubtitleResult = {
  subtitlesEnabled: boolean | null
  failureLabel: string | null
  track: { name?: string; language?: string; isClosedCaption: boolean }
  noTracksAvailable: boolean
}

export type PlaybackAudioResult = {
  failureLabel: string | null
  track: { name?: string; language?: string; isAudioDescription?: boolean }
  noTracksAvailable: boolean
}

export type PlaybackVolumeState = {
  volume: number
  muted: boolean
}

export type PlaybackVolumeCommand = PlaybackVolumeState & {
  completion: Promise<PlaybackCommandResult>
}

export type NetflixPlaybackSession = {
  cancelPendingPlayback: () => void
  togglePlayback: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  play: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  pause: (video: HTMLVideoElement) => Promise<PlaybackCommandResult>
  seekBy: (milliseconds: number) => Promise<PlaybackCommandResult>
  stepFrame: (direction: -1 | 1) => Promise<PlaybackCommandResult>
  cycleAudioTrack: (direction: -1 | 1, isAvailable?: () => boolean, favorites?: readonly AudioFavorite[]) => Promise<PlaybackAudioResult>
  seekTo: (milliseconds: number, playback?: {
    video: HTMLVideoElement
    isCurrent: () => boolean
  }) => Promise<PlaybackCommandResult>
  setVolume: (video: HTMLVideoElement, volume: number) => PlaybackVolumeCommand
  adjustVolume: (video: HTMLVideoElement, delta: number) => PlaybackVolumeCommand
  toggleMute: (video: HTMLVideoElement) => PlaybackVolumeCommand
  getSubtitleState: () => Promise<PlaybackSubtitleResult>
  toggleSubtitles: () => Promise<PlaybackSubtitleResult>
  cycleSubtitleTrack: (favorites?: readonly SubtitleFavorite[], direction?: -1 | 1, isAvailable?: () => boolean) => Promise<PlaybackSubtitleResult>
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
  if (action === 'seek' || action === 'seekTo' || action === 'stepFrame') return getSeekFailureLabel(response)
  if (!response.success) return `${action} failed: ${response.error ?? 'background error'}`
  if (response.result?.error) return `${action} failed: ${response.result.error}`
  if (action === 'cycleAudioTrack' && !response.result?.audioTrackSwitchCalled && !response.result?.audioCycleOutcome) {
    return 'cycleAudioTrack failed: no audio track selection'
  }
  if (action === 'cycleSubtitleTrack' && response.result?.subtitleCycleOutcome === 'no-tracks-available') {
    return null
  }
  if (action === 'setPlaybackRate') {
    if (response.result?.playerApiFound === false) {
      return 'setPlaybackRate failed: no Netflix API'
    }
    if (response.result?.playerFound === false) {
      return 'setPlaybackRate failed: no Netflix player'
    }
  }
  if (
    (action === 'getSubtitleState' || action === 'cycleSubtitleTrack') &&
    typeof response.result?.subtitlesEnabled !== 'boolean'
  ) {
    if (response.result?.playerApiFound === false) return `${action} failed: no Netflix API`
    if (response.result?.playerFound === false) return `${action} failed: no Netflix player`
    return `${action} failed: no subtitle state`
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
  let subtitleCommandQueue: Promise<PlaybackSubtitleResult> | null = null
  let audioCommandQueue: Promise<PlaybackAudioResult> | null = null
  let subtitleConfirmation = 0
  let playbackIntent = 0

  const execute = async (
    action: NetflixApiAction,
    value?: number,
    subtitleFavorites?: readonly SubtitleFavorite[],
    audioFavorites?: readonly AudioFavorite[]
  ): Promise<PlaybackCommandResult> => {
    let response: NetflixApiResponse
    try {
      if (audioFavorites?.length) response = await transport(action, value, undefined, audioFavorites)
      else if (subtitleFavorites?.length) response = await transport(action, value, subtitleFavorites)
      else response = value === undefined ? await transport(action) : await transport(action, value)
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

  const executeSubtitle = async (
    action: 'getSubtitleState' | 'toggleSubtitles' | 'cycleSubtitleTrack',
    value?: number,
    favorites?: readonly SubtitleFavorite[],
  ): Promise<PlaybackSubtitleResult> => {
    const { response, failureLabel } = await execute(action, value, favorites)
    const result = response.result
    const enabled = result?.subtitlesEnabled
    const confirmed = !failureLabel && typeof enabled === 'boolean'
    const noTracksAvailable = result?.subtitleCycleOutcome === 'no-tracks-available'
    return {
      subtitlesEnabled: confirmed ? enabled : null,
      failureLabel: failureLabel ?? (confirmed || noTracksAvailable ? null : 'Unable to toggle subtitles'),
      track: {
        name: result?.subtitleTrack,
        language: result?.subtitleTrackLanguage,
        isClosedCaption: result?.subtitleTrackIsClosedCaption === true,
      },
      noTracksAvailable,
    }
  }

  const queueSubtitleCommand = (
    run: () => Promise<PlaybackSubtitleResult>
  ): Promise<PlaybackSubtitleResult> => {
    const confirm = async () => {
      const result = await run()
      if (result.subtitlesEnabled !== null) subtitleConfirmation += 1
      return result
    }
    const request = subtitleCommandQueue ? subtitleCommandQueue.then(confirm, confirm) : confirm()
    subtitleCommandQueue = request
    const clearCompletedRequest = () => {
      if (subtitleCommandQueue === request) subtitleCommandQueue = null
    }
    void request.then(clearCompletedRequest, clearCompletedRequest)
    return request
  }

  const play = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    playbackIntent += 1
    void video.play().catch(() => undefined)
    return execute('play')
  }

  const pause = (video: HTMLVideoElement): Promise<PlaybackCommandResult> => {
    playbackIntent += 1
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
    cancelPendingPlayback: () => { playbackIntent += 1 },
    togglePlayback: video => (video.paused ? play(video) : pause(video)),
    play,
    pause,
    seekBy: milliseconds => {
      playbackIntent += 1
      return execute('seek', milliseconds)
    },
    stepFrame: direction => {
      playbackIntent += 1
      return execute('stepFrame', direction)
    },
    cycleAudioTrack: (direction, isAvailable = () => true, favorites) => {
      const run = async (): Promise<PlaybackAudioResult> => {
        if (!isAvailable()) return { failureLabel: null, track: {}, noTracksAvailable: false }
        const { response, failureLabel } = await execute('cycleAudioTrack', direction, undefined, favorites)
        return {
          failureLabel,
          track: {
            name: response.result?.audioTrack,
            language: response.result?.audioTrackLanguage,
            isAudioDescription: response.result?.audioTrackIsAudioDescription === true,
          },
          noTracksAvailable: response.result?.audioCycleOutcome === 'no-tracks-available',
        }
      }
      const request = audioCommandQueue ? audioCommandQueue.then(run, run) : run()
      audioCommandQueue = request
      void request.then(() => { if (audioCommandQueue === request) audioCommandQueue = null })
      return request
    },
    seekTo: async (milliseconds, playback) => {
      const intent = ++playbackIntent
      const shouldResume = playback && (playback.video.ended || !playback.video.paused)
      const result = await execute('seekTo', milliseconds)
      // The session owns transport intent across keyboard and PiP entry points.
      // A view only supplies its lifetime; it never decides when to send play.
      if (!result.failureLabel && shouldResume && intent === playbackIntent && playback.isCurrent()) {
        return play(playback.video)
      }
      return result
    },
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
    getSubtitleState: async () => {
      const confirmation = subtitleConfirmation
      const result = await executeSubtitle('getSubtitleState')
      // Confirmation belongs to the playback session, not a PiP view. A late
      // initial read cannot replace a newer toggle or track-switch result.
      return confirmation === subtitleConfirmation ? result : { ...result, subtitlesEnabled: null }
    },
    toggleSubtitles: () => queueSubtitleCommand(() => executeSubtitle('toggleSubtitles')),
    cycleSubtitleTrack: (favorites, direction = 1, isAvailable = () => true) =>
      queueSubtitleCommand(async () => isAvailable()
        ? executeSubtitle('cycleSubtitleTrack', direction === -1 ? -1 : undefined, favorites)
        : { subtitlesEnabled: null, failureLabel: null, track: { isClosedCaption: false }, noTracksAvailable: false }),
    setPlaybackRate: (video, rate) => {
      video.playbackRate = rate
      video.defaultPlaybackRate = rate
      video.dispatchEvent(new Event('ratechange', { bubbles: true }))
      return execute('setPlaybackRate', rate)
    },
  }
}
