import { findSkipIntroButton, findVideo, toggleFullscreen } from '@/content/dom-utils'
import { mediaHintIcons as icons, showMediaHint } from '@/content/media-hint'
import { getSeekFailureLabel, sendNetflixApi } from '@/content/netflix-api-client'
import { getCopy } from '@/shared/i18n'
import {
  resolveNextPlaybackRate,
  type ShortcutAction,
  type ShortcutSettings,
} from '@/shared/shortcuts'

type CommandContext = {
  settings: ShortcutSettings
  targetDoc: Document
}

type ShortcutCommand = (context: CommandContext) => boolean

type SpaceHoldState = {
  targetDoc: Document
  video: HTMLVideoElement
  restoreRate: number
  wasPaused: boolean
  timer: number | null
  active: boolean
}

export type ShortcutCommandController = {
  clearSpaceHoldState(): void
  completeSpaceHold(): void
  execute(action: ShortcutAction, targetDoc: Document): boolean
  hasSpaceHoldState(): boolean
  startSpaceHold(targetDoc: Document, video: HTMLVideoElement): void
}

const SPACE_HOLD_DELAY_MS = 250

const clampVolume = (volume: number): number => {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : 0.1))
  return Number(clamped.toFixed(2))
}

const normalizeAudibleVolume = (volume: number): number | null => {
  if (!Number.isFinite(volume)) return null
  const normalized = clampVolume(volume)
  return normalized > 0 ? normalized : null
}

const rememberVolumeForRestore = (video: HTMLVideoElement, volume: number): void => {
  const normalized = normalizeAudibleVolume(volume)
  if (normalized !== null) video.dataset.shortcutOverrideLastVolume = normalized.toString()
}

const getLastAudibleVolume = (video: HTMLVideoElement): number => {
  const stored = Number.parseFloat(video.dataset.shortcutOverrideLastVolume ?? '')
  const storedVolume = normalizeAudibleVolume(stored)
  if (storedVolume !== null) return storedVolume

  const currentVolume = normalizeAudibleVolume(video.volume)
  return currentVolume ?? 0.1
}

const mirrorAudioState = (video: HTMLVideoElement, state: { muted?: boolean; volume?: number }) => {
  if (state.muted === false) video.muted = false
  if (typeof state.volume === 'number') video.volume = clampVolume(state.volume)
  if (state.muted === true) video.muted = true
}

const getRestorablePlaybackRate = (video: HTMLVideoElement): number =>
  Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1

const formatPlaybackRate = (rate: number): string =>
  `${rate.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`

const formatSeekHint = (seconds: number, direction: -1 | 1): string =>
  `${direction > 0 ? '+' : '-'}${seconds}s`

const showHint = (context: CommandContext, iconHtml: string, label: string) => {
  showMediaHint(iconHtml, label, context.targetDoc, context.settings.showHints)
}

const setPlaybackRate = (video: HTMLVideoElement, rate: number, context: CommandContext) => {
  video.playbackRate = rate
  sendNetflixApi('setPlaybackRate', rate)
  showHint(context, icons.speed, formatPlaybackRate(rate))
}

const adjustVolume = (video: HTMLVideoElement, delta: number, context: CommandContext) => {
  const copy = getCopy(context.settings.locale)
  const currentVolume = clampVolume(video.volume)
  const isSilent = video.muted || currentVolume === 0

  if (isSilent && delta < 0) {
    if (currentVolume > 0) rememberVolumeForRestore(video, currentVolume)
    showHint(context, icons.mute, copy.hints.mute)
    return
  }

  const baseVolume = isSilent ? 0 : currentVolume
  const nextVolume = clampVolume(baseVolume + delta)

  if (isSilent && nextVolume > 0) {
    sendNetflixApi('unmuteWithVolume', nextVolume)
  } else {
    sendNetflixApi('setVolume', nextVolume)
    if (nextVolume === 0) sendNetflixApi('setMuted', 1)
  }
  mirrorAudioState(video, { volume: nextVolume, muted: nextVolume === 0 })

  if (nextVolume > 0) {
    rememberVolumeForRestore(video, nextVolume)
  } else if (baseVolume > 0) {
    rememberVolumeForRestore(video, baseVolume)
  }

  const label = nextVolume === 0 ? copy.hints.mute : `${Math.round(nextVolume * 100)}%`
  showHint(context, nextVolume === 0 ? icons.mute : icons.volume, label)
}

const toggleMute = (video: HTMLVideoElement, context: CommandContext) => {
  const copy = getCopy(context.settings.locale)
  if (video.muted || video.volume === 0) {
    const restored = getLastAudibleVolume(video)
    sendNetflixApi('unmuteWithVolume', restored)
    mirrorAudioState(video, { volume: restored, muted: false })
    rememberVolumeForRestore(video, restored)
    showHint(context, icons.volume, copy.hints.unmute)
    return
  }

  rememberVolumeForRestore(video, video.volume)
  sendNetflixApi('setMuted', 1)
  mirrorAudioState(video, { muted: true })
  showHint(context, icons.mute, copy.hints.mute)
}

const seekCommand =
  (direction: -1 | 1): ShortcutCommand =>
  context => {
    const icon =
      direction === -1
        ? icons.rewind(context.settings.seek.seconds)
        : icons.forward(context.settings.seek.seconds)
    showHint(context, icon, formatSeekHint(context.settings.seek.seconds, direction))
    void sendNetflixApi('seek', direction * context.settings.seek.seconds * 1000).then(response => {
      const failureLabel = getSeekFailureLabel(response)
      if (failureLabel) showHint(context, icon, failureLabel)
    })
    return true
  }

const createCommandMap = (): Record<ShortcutAction, ShortcutCommand> => ({
  playPause: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false

    const copy = getCopy(context.settings.locale)
    if (video.paused) {
      void video.play().catch(() => undefined)
      sendNetflixApi('play')
      showHint(context, icons.play, copy.hints.play)
    } else {
      video.pause()
      sendNetflixApi('pause')
      showHint(context, icons.pause, copy.hints.pause)
    }
    return true
  },
  seekBackward: seekCommand(-1),
  seekForward: seekCommand(1),
  volumeUp: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    adjustVolume(video, 0.05, context)
    return true
  },
  volumeDown: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    adjustVolume(video, -0.05, context)
    return true
  },
  mute: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    toggleMute(video, context)
    return true
  },
  fullscreen: context => {
    toggleFullscreen(context.targetDoc)
    return true
  },
  skipIntro: context => {
    const button = findSkipIntroButton(context.targetDoc)
    if (!button) return false

    const copy = getCopy(context.settings.locale)
    button.click()
    showHint(context, icons.skipIntro, copy.hints.skipIntro)
    return true
  },
  speedUp: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(
      video,
      resolveNextPlaybackRate(video.playbackRate, 1, context.settings.speed),
      context
    )
    return true
  },
  speedDown: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(
      video,
      resolveNextPlaybackRate(video.playbackRate, -1, context.settings.speed),
      context
    )
    return true
  },
  speedReset: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(video, 1, context)
    return true
  },
})

export const createShortcutCommandController = (
  getSettings: () => ShortcutSettings
): ShortcutCommandController => {
  const commands = createCommandMap()
  let spaceHoldState: SpaceHoldState | null = null

  const createContext = (targetDoc: Document): CommandContext => ({
    settings: getSettings(),
    targetDoc,
  })

  const execute = (action: ShortcutAction, targetDoc: Document): boolean =>
    commands[action](createContext(targetDoc))

  const clearSpaceHoldState = (): void => {
    if (spaceHoldState?.timer != null) window.clearTimeout(spaceHoldState.timer)
    spaceHoldState = null
  }

  const startSpaceHold = (targetDoc: Document, video: HTMLVideoElement): void => {
    if (spaceHoldState) return

    const state: SpaceHoldState = {
      targetDoc,
      video,
      restoreRate: getRestorablePlaybackRate(video),
      wasPaused: video.paused,
      timer: null,
      active: false,
    }

    state.timer = window.setTimeout(() => {
      if (spaceHoldState !== state) return

      state.timer = null
      state.active = true

      if (state.wasPaused) {
        void state.video.play().catch(() => undefined)
        sendNetflixApi('play')
      }

      const context = createContext(state.targetDoc)
      setPlaybackRate(state.video, context.settings.speed.hold, context)
    }, SPACE_HOLD_DELAY_MS)

    spaceHoldState = state
  }

  const completeSpaceHold = (): void => {
    const state = spaceHoldState
    if (!state) return

    spaceHoldState = null

    if (state.timer !== null) {
      window.clearTimeout(state.timer)
      execute('playPause', state.targetDoc)
      return
    }

    if (!state.active) return

    const context = createContext(state.targetDoc)
    setPlaybackRate(state.video, state.restoreRate, context)

    if (state.wasPaused) {
      state.video.pause()
      sendNetflixApi('pause')
    }
  }

  return {
    clearSpaceHoldState,
    completeSpaceHold,
    execute,
    hasSpaceHoldState: () => spaceHoldState !== null,
    startSpaceHold,
  }
}
