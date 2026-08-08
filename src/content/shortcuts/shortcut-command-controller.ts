import { findSkipIntroButton, findVideo, toggleFullscreen } from '@/content/dom-utils'
import {
  getHintManager,
  mediaHintIcons as icons,
  type HintIcon,
  type HintRequest,
} from '@/content/hints/hint-manager'
import {
  createNetflixPlaybackSession,
  type PlaybackCommandResult,
  type NetflixPlaybackSession,
} from '@/content/netflix-playback-session'
import {
  createSpaceInteractionController,
  type SpaceInteractionController,
} from './space-interaction-controller'
import type { CommandContext, ShortcutCommand } from './shortcut-command-types'
import { resolveNextPlaybackRate } from '@/shared/playback-speed'
import type { ShortcutAction, ShortcutSettings } from '@/shared/shortcut-types'

const SUBTITLES_OFF_HINT_COLOR = 'rgba(255, 255, 255, 0.62)'

export type ShortcutCommandController = SpaceInteractionController & {
  execute(action: ShortcutAction, targetDoc: Document): boolean
  setVolume(volume: number, targetDoc: Document): boolean
}

type ShortcutCommandControllerOptions = {
  onSeekRequested?: () => void
  onSubtitlesToggled?: (enabled: boolean, targetDoc: Document) => void
}

const formatPlaybackRate = (rate: number): string =>
  `${rate.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`

const showHintRequest = (context: CommandContext, request: HintRequest): void => {
  getHintManager(context.targetDoc).show(request)
}

const showVolume = (context: CommandContext, icon: HintIcon, label: string): void =>
  showHintRequest(context, {
    type: 'volume',
    icon,
    label,
  })

const showCommandFailure = (
  context: CommandContext,
  completion: Promise<PlaybackCommandResult>,
  icon: HintIcon
): void => {
  void completion.then(result => {
    if (!result.failureLabel || !context.isCurrentAction()) return

    showHintRequest(context, {
      type: 'media',
      icon,
      label: result.failureLabel,
    })
  })
}

const showPlaybackRate = (
  playbackSession: NetflixPlaybackSession,
  video: HTMLVideoElement,
  rate: number,
  context: CommandContext,
  displayHint = true,
  icon: HintIcon = icons.speed
) => {
  showCommandFailure(context, playbackSession.setPlaybackRate(video, rate), icon)
  if (displayHint) {
    showHintRequest(context, { type: 'speed', icon, label: formatPlaybackRate(rate) })
  }
}

const seekCommand =
  (
    playbackSession: NetflixPlaybackSession,
    direction: -1 | 1,
    onSeekRequested?: () => void
  ): ShortcutCommand =>
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
    onSeekRequested?.()
    void playbackSession.seekBy(direction * context.settings.seek.seconds * 1000).then(result => {
      if (!context.isCurrentAction()) return

      if (result.failureLabel) {
        showHintRequest(context, {
          type: 'media',
          icon: failureIcon,
          label: result.failureLabel,
        })
      }
    })
    return true
  }

const togglePlayback = (
  playbackSession: NetflixPlaybackSession,
  video: HTMLVideoElement,
  context: CommandContext
): void => {
  const wasPaused = video.paused
  const completion = playbackSession.togglePlayback(video)
  showHintRequest(context, {
    type: 'playback',
    icon: wasPaused ? icons.playbackPlay : icons.playbackPause,
  })
  showCommandFailure(
    context,
    completion,
    wasPaused ? icons.playbackPlay : icons.playbackPause
  )
}

const toggleSubtitles = (
  playbackSession: NetflixPlaybackSession,
  context: CommandContext,
  onSubtitlesToggled?: ShortcutCommandControllerOptions['onSubtitlesToggled']
): void => {
  void playbackSession.toggleSubtitles().then(result => {
    const enabled = result.response.result?.subtitlesEnabled
    if (!result.failureLabel && typeof enabled === 'boolean') {
      onSubtitlesToggled?.(enabled, context.targetDoc)
    }
    if (!context.isCurrentAction()) return

    if (result.failureLabel || typeof enabled !== 'boolean') {
      showHintRequest(context, {
        type: 'media',
        icon: icons.subtitles,
        label: result.failureLabel ?? 'Unable to toggle subtitles',
      })
      return
    }

    showHintRequest(context, {
      type: 'playback',
      icon: icons.subtitles,
      ...(enabled ? {} : { color: SUBTITLES_OFF_HINT_COLOR }),
    })
  })
}

const createCommandMap = (
  playbackSession: NetflixPlaybackSession,
  options: ShortcutCommandControllerOptions
): Record<ShortcutAction, ShortcutCommand> => ({
  playPause: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false

    togglePlayback(playbackSession, video, context)
    return true
  },
  seekBackward: seekCommand(playbackSession, -1, options.onSeekRequested),
  seekForward: seekCommand(playbackSession, 1, options.onSeekRequested),
  volumeUp: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    const state = playbackSession.adjustVolume(video, 0.05)
    const icon = state.muted || state.volume === 0 ? icons.mute : icons.volume
    showVolume(context, icon, `${Math.round(state.volume * 100)}%`)
    showCommandFailure(context, state.completion, icon)
    return true
  },
  volumeDown: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    const state = playbackSession.adjustVolume(video, -0.05)
    const icon = state.muted || state.volume === 0 ? icons.mute : icons.volumeDown
    showVolume(context, icon, `${Math.round(state.volume * 100)}%`)
    showCommandFailure(context, state.completion, icon)
    return true
  },
  mute: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    const state = playbackSession.toggleMute(video)
    const icon = state.muted ? icons.mute : icons.volume
    showVolume(context, icon, `${state.muted ? 0 : Math.round(state.volume * 100)}%`)
    showCommandFailure(context, state.completion, icon)
    return true
  },
  toggleSubtitles: context => {
    toggleSubtitles(playbackSession, context, options.onSubtitlesToggled)
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
    showPlaybackRate(
      playbackSession,
      video,
      resolveNextPlaybackRate(video.playbackRate, 1, context.settings.speed),
      context,
      true,
      icons.speedUp
    )
    return true
  },
  speedDown: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    showPlaybackRate(
      playbackSession,
      video,
      resolveNextPlaybackRate(video.playbackRate, -1, context.settings.speed),
      context,
      true,
      icons.speedDown
    )
    return true
  },
  speedReset: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    showPlaybackRate(
      playbackSession,
      video,
      1,
      context,
      true,
      icons.playbackPlay
    )
    return true
  },
})

export const createShortcutCommandController = (
  getSettings: () => ShortcutSettings,
  playbackSession: NetflixPlaybackSession = createNetflixPlaybackSession(),
  options: ShortcutCommandControllerOptions = {}
): ShortcutCommandController => {
  let currentActionToken = 0
  const commands = createCommandMap(playbackSession, options)

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

  const setVolume = (volume: number, targetDoc: Document): boolean => {
    const actionToken = startAction()
    const context = createContext(targetDoc, actionToken)
    const video = findVideo(targetDoc)
    if (!video) return false

    const previousVolume = video.muted ? 0 : video.volume
    const state = playbackSession.setVolume(video, volume)
    const icon =
      state.muted || state.volume === 0
        ? icons.mute
        : state.volume < previousVolume
          ? icons.volumeDown
          : icons.volume
    showVolume(context, icon, `${state.muted ? 0 : Math.round(state.volume * 100)}%`)
    showCommandFailure(context, state.completion, icon)
    return true
  }

  const spaceInteraction = createSpaceInteractionController({
    createContext,
    startAction,
    executeShortPress: targetDoc => execute('playPause', targetDoc),
    hideHints: targetDoc => getHintManager(targetDoc).hide(),
    playbackSession,
    showSpaceHoldHint: (context, label) => {
      showHintRequest(context, { type: 'spaceHold', label })
    },
  })

  return {
    ...spaceInteraction,
    execute,
    setVolume,
  }
}
