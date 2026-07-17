import { findSkipIntroButton, findVideo, toggleFullscreen } from '@/content/dom-utils'
import {
  createHintIcon,
  getHintManager,
  mediaHintIcons as icons,
  type HintIcon,
  type HintRequest,
} from '@/content/hints/hint-manager'
import { getSeekFailureLabel, sendNetflixApi } from '@/content/netflix-api-client'
import {
  createSpaceInteractionController,
  type SpaceInteractionController,
} from './space-interaction-controller'
import type { CommandContext, ShortcutCommand } from './shortcut-command-types'
import {
  resolveNextPlaybackRate,
  type ShortcutAction,
  type ShortcutSettings,
} from '@/shared/shortcuts'

export type ShortcutCommandController = SpaceInteractionController & {
  execute(action: ShortcutAction, targetDoc: Document): boolean
}

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

const formatPlaybackRate = (rate: number): string =>
  `${rate.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`

const showHintRequest = (context: CommandContext, request: HintRequest): void => {
  getHintManager(context.targetDoc).show(request)
}

const showHint = (context: CommandContext, icon: HintIcon | string, label: string): void => {
  showHintRequest(context, {
    type: 'media',
    icon: typeof icon === 'string' ? createHintIcon(icon) : icon,
    label,
  })
}

const showVolume = (context: CommandContext, icon: HintIcon | string, label: string): void =>
  showHintRequest(context, {
    type: 'volume',
    icon: typeof icon === 'string' ? createHintIcon(icon) : icon,
    label,
  })

const setPlaybackRate = (
  video: HTMLVideoElement,
  rate: number,
  context: CommandContext,
  displayHint = true,
  icon: HintIcon = createHintIcon(icons.speed)
) => {
  video.playbackRate = rate
  sendNetflixApi('setPlaybackRate', rate)
  if (displayHint) {
    showHintRequest(context, { type: 'speed', icon, label: formatPlaybackRate(rate) })
  }
}

const adjustVolume = (video: HTMLVideoElement, delta: number, context: CommandContext) => {
  const currentVolume = clampVolume(video.volume)
  const isSilent = video.muted || currentVolume === 0

  if (isSilent && delta < 0) {
    if (currentVolume > 0) rememberVolumeForRestore(video, currentVolume)
    showVolume(context, icons.mute, '0%')
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

  const icon = nextVolume === 0 ? icons.mute : delta > 0 ? icons.volume : icons.volumeDown
  showVolume(context, icon, `${Math.round(nextVolume * 100)}%`)
}

const toggleMute = (video: HTMLVideoElement, context: CommandContext) => {
  if (video.muted || video.volume === 0) {
    const restored = getLastAudibleVolume(video)
    sendNetflixApi('unmuteWithVolume', restored)
    mirrorAudioState(video, { volume: restored, muted: false })
    rememberVolumeForRestore(video, restored)
    showVolume(context, icons.volume, `${Math.round(restored * 100)}%`)
    return
  }

  rememberVolumeForRestore(video, video.volume)
  sendNetflixApi('setMuted', 1)
  mirrorAudioState(video, { muted: true })
  showVolume(context, icons.mute, '0%')
}

const seekCommand =
  (direction: -1 | 1): ShortcutCommand =>
  context => {
    const failureIcon =
      direction === -1
        ? icons.rewind(context.settings.seek.seconds)
        : icons.forward(context.settings.seek.seconds)
    showHintRequest(context, {
      type: 'seek',
      direction,
      seconds: context.settings.seek.seconds,
    })
    void sendNetflixApi('seek', direction * context.settings.seek.seconds * 1000).then(response => {
      if (!context.isCurrentAction()) return

      const failureLabel = getSeekFailureLabel(response)
      if (failureLabel) showHint(context, failureIcon, failureLabel)
    })
    return true
  }

const togglePlayback = (video: HTMLVideoElement, context: CommandContext): void => {
  if (video.paused) {
    void video.play().catch(() => undefined)
    sendNetflixApi('play')
    showHintRequest(context, { type: 'playback', icon: createHintIcon(icons.playbackPlay) })
    return
  }

  video.pause()
  sendNetflixApi('pause')
  showHintRequest(context, { type: 'playback', icon: createHintIcon(icons.playbackPause) })
}

const createCommandMap = (): Record<ShortcutAction, ShortcutCommand> => ({
  playPause: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false

    togglePlayback(video, context)
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
  pictureInPicture: () => false,
  skipIntro: context => {
    const button = findSkipIntroButton(context.targetDoc)
    if (!button) return false

    button.click()
    return true
  },
  speedUp: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(
      video,
      resolveNextPlaybackRate(video.playbackRate, 1, context.settings.speed),
      context,
      true,
      createHintIcon(icons.speedUp)
    )
    return true
  },
  speedDown: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(
      video,
      resolveNextPlaybackRate(video.playbackRate, -1, context.settings.speed),
      context,
      true,
      createHintIcon(icons.speedDown)
    )
    return true
  },
  speedReset: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    setPlaybackRate(video, 1, context, true, createHintIcon(icons.playbackPlay))
    return true
  },
})

export const createShortcutCommandController = (
  getSettings: () => ShortcutSettings
): ShortcutCommandController => {
  let currentActionToken = 0
  const commands = createCommandMap()

  const createContext = (targetDoc: Document, actionToken = currentActionToken): CommandContext => ({
    settings: getSettings(),
    targetDoc,
    isCurrentAction: () => actionToken === currentActionToken,
  })

  const startAction = (): number => {
    currentActionToken += 1
    return currentActionToken
  }

  const execute = (action: ShortcutAction, targetDoc: Document): boolean => {
    const actionToken = startAction()
    return commands[action](createContext(targetDoc, actionToken))
  }

  const spaceInteraction = createSpaceInteractionController({
    createContext,
    startAction,
    executeShortPress: targetDoc => execute('playPause', targetDoc),
    hideHints: targetDoc => getHintManager(targetDoc).hide(),
    setPlaybackRate,
    showSpaceHoldHint: (context, label) => {
      showHintRequest(context, { type: 'spaceHold', label })
    },
  })

  return {
    ...spaceInteraction,
    execute,
  }
}
