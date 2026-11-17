import { isPipDocument } from '@/content/pip/pip-document'
import { TRACK_HINT_VISIBLE_DURATION_MS } from '@/content/hints/hint-constants'
import { navigateEpisode } from '@/content/episode-navigation'
import { isShortcutAction } from '@/shared/shortcut-bindings'
import { SEEK_SHORTCUT_COPY, resolveSeekShortcut } from '@/shared/seek-shortcuts'
import { findSkipIntroButton, findVideo, toggleFullscreen } from '@/content/dom-utils'
import {
  getHintManager,
  mediaHintIcons as icons,
  type HintIcon,
  type HintRequest,
} from '@/content/hints/hint-manager'
import {
  createNetflixPlaybackSession,
  type PlaybackAudioResult,
  type PlaybackCommandResult,
  type PlaybackSubtitleResult,
  type NetflixPlaybackSession,
} from '@/content/netflix-playback-session'
import {
  createHoldSpeedInteractionController,
  type HoldSpeedInteractionController,
} from './hold-speed-interaction-controller'
import type { CommandContext, ShortcutCommand } from './shortcut-command-types'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { getActiveFavorites } from '@/shared/feature-management'
import { getCopy } from '@/shared/i18n'
import { formatPlaybackRate, resolveNextPlaybackRate } from '@/shared/playback-speed'
import { nextSubtitleSize, subtitleSizeFromPercent, subtitleSizePercent } from '@/shared/subtitle-size-shortcuts'
import { type SubtitleSize, type Locale, type ShortcutAction, type BuiltinShortcutAction, type ShortcutSettings } from '@/shared/shortcut-types'

const SUBTITLES_OFF_HINT_COLOR = 'rgba(255, 255, 255, 0.62)'
const EXPLICIT_SPEED_ACTIONS = new Set<ShortcutAction>([
  'speedUp',
  'speedDown',
  'setPreferredSpeed',
  'speedReset',
])

export type ShortcutCommandController = HoldSpeedInteractionController & {
  cancelPendingAction(): void
  execute(action: ShortcutAction, targetDoc: Document): boolean
  setVolume(volume: number, targetDoc: Document): boolean
}

type ShortcutCommandControllerOptions = {
  onPlaybackToggleRequested?: () => void
  onSeekRequested?: () => void
  onSubtitleSizeChanged?: (size: SubtitleSize, targetDoc: Document) => void
  onSubtitlesToggled?: (enabled: boolean, targetDoc: Document) => void
}

const showHintRequest = (context: CommandContext, request: HintRequest): void => {
  getHintManager(context.targetDoc).show(request)
}

const localizeTrackLanguage = (language: string | undefined, locale: Locale): string | undefined => {
  if (!language) return undefined
  try {
    const languageNames = new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' })
    return languageNames.of(language.replaceAll('_', '-'))
  } catch {
    // Netflix may provide a language identifier that is not a valid language tag.
    return undefined
  }
}

const formatSubtitleTrackHint = (track: PlaybackSubtitleResult['track'], locale: Locale): string | undefined => {
  const name = localizeTrackLanguage(track.language, locale)
  return name ? (track.isClosedCaption ? `${name} (CC)` : name) : track.name
}

const formatAudioTrackHint = (track: PlaybackAudioResult['track'], locale: Locale): string | undefined => {
  const language = track.language?.replaceAll('_', '-')
  const name = locale === 'zh-TW' && language?.toLowerCase() === 'ja'
    ? '日語'
    : localizeTrackLanguage(language, locale)
  if (name) return track.isAudioDescription ? `${name} (${getAudioFavoritesCopy(locale).audioDescription})` : name
  // Keep Netflix's label when its language tag is unavailable, omitting the
  // original-audio marker just as the localized language-only label does.
  return track.name?.replace(
    /\s*(?:\(|\[|（)\s*(?:original|原始|原音|原聲|原声|オリジナル|오리지널)\s*(?:\)|\]|）)/giu,
    '',
  ).trim() || track.language
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
    onSeekRequested?: () => void,
    secondsOverride?: number,
  ): ShortcutCommand =>
  context => {
    const seconds = secondsOverride ?? context.settings.seek.seconds
    const failureIcon =
      direction === -1
        ? icons.rewind(seconds)
        : icons.forward(seconds)
    showHintRequest(context, {
      type: 'seek',
      direction,
      seconds,
    })
    onSeekRequested?.()
    void playbackSession.seekBy(direction * seconds * 1000).then(result => {
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
    const enabled = result.subtitlesEnabled
    if (enabled !== null) {
      onSubtitlesToggled?.(enabled, context.targetDoc)
    }
    if (!context.isCurrentAction()) return

    if (enabled === null) {
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

const cycleSubtitleTrack =
  (
    playbackSession: NetflixPlaybackSession,
    direction: -1 | 1,
    getSettings: () => ShortcutSettings,
    onSubtitlesToggled?: ShortcutCommandControllerOptions['onSubtitlesToggled'],
  ): ShortcutCommand =>
  context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    const watchPath = document.location.pathname
    const action = direction === -1 ? 'previousSubtitleTrack' : 'cycleSubtitleTrack'
    const isAvailable = () => !context.isCancelled() && getSettings().enabled && getSettings().bindings[action].enabled &&
      document.location.pathname === watchPath && context.targetDoc.defaultView?.closed !== true &&
      findVideo(context.targetDoc) === video
    void playbackSession.cycleSubtitleTrack(getActiveFavorites(context.settings, 'subtitleFavorites'), direction, isAvailable).then(({ failureLabel, subtitlesEnabled, track, noTracksAvailable }) => {
      if (subtitlesEnabled === true) {
        onSubtitlesToggled?.(true, context.targetDoc)
      }
      if (!isAvailable() || !context.isCurrentAction()) return

      const locale = resolveLocalePreference(context.settings.locale)
      let label = formatSubtitleTrackHint(track, locale)
      if (failureLabel) label = getCopy(locale).subtitleTrackSwitchFailed
      else if (noTracksAvailable) {
        label = getCopy(locale).subtitleFavorites.unavailable
      }
      showHintRequest(context, label
        ? { type: 'media', icon: icons.subtitles, label, durationMs: TRACK_HINT_VISIBLE_DURATION_MS }
        : { type: 'playback', icon: icons.subtitles })
    })
    return true
  }

const episodeCommand = (direction: -1 | 1): ShortcutCommand => context => {
  void navigateEpisode(context.targetDoc, direction, context.isCurrentAction).then(success => {
    if (success || !context.isCurrentAction()) return
    const locale = resolveLocalePreference(context.settings.locale)
    showHintRequest(context, { type: 'text', label: SEEK_SHORTCUT_COPY[locale].unavailable })
  })
  return true
}

const frameCommand = (
  playbackSession: NetflixPlaybackSession, direction: -1 | 1,
  onSeekRequested?: () => void,
): ShortcutCommand => context => {
  if (!findVideo(context.targetDoc)) return false
  onSeekRequested?.()
  void playbackSession.stepFrame(direction).then(({ failureLabel }) => {
    if (!context.isCurrentAction()) return
    const icon = direction === -1 ? icons.frameBackward : icons.frameForward
    showHintRequest(context, failureLabel
      ? { type: 'media', icon, label: getCopy(resolveLocalePreference(context.settings.locale)).frameStepFailed, compact: true }
      : { type: 'playback', icon })
  })
  return true
}

const audioTrackCommand = (
  playbackSession: NetflixPlaybackSession, direction: -1 | 1, getSettings: () => ShortcutSettings,
): ShortcutCommand => context => {
  const video = findVideo(context.targetDoc)
  if (!video) return false
  const watchPath = document.location.pathname
  const action = direction === -1 ? 'previousAudioTrack' : 'nextAudioTrack'
  const isAvailable = () => !context.isCancelled() && getSettings().enabled && getSettings().bindings[action].enabled &&
    document.location.pathname === watchPath && context.targetDoc.defaultView?.closed !== true &&
    findVideo(context.targetDoc) === video
  const favorites = getActiveFavorites(context.settings, 'audioFavorites')
  void playbackSession.cycleAudioTrack(direction, isAvailable, favorites).then(({ failureLabel, noTracksAvailable, track }) => {
    if (!isAvailable() || !context.isCurrentAction()) return
    const locale = resolveLocalePreference(context.settings.locale)
    const copy = getCopy(locale)
    let label = formatAudioTrackHint(track, locale) ?? copy.actions[action]
    if (noTracksAvailable) label = favorites.length
      ? getAudioFavoritesCopy(locale).unavailable
      : copy.audioTracksUnavailable
    if (failureLabel) label = copy.audioTrackSwitchFailed
    showHintRequest(context, {
      type: 'media', icon: icons.volume,
      label, compact: true, durationMs: TRACK_HINT_VISIBLE_DURATION_MS,
    })
  })
  return true
}

const changeSubtitleSize = (
  context: CommandContext, sizes: readonly number[], cycle: boolean, options: ShortcutCommandControllerOptions,
): boolean => {
  if (!findVideo(context.targetDoc) || !options.onSubtitleSizeChanged) return false
  const current = isPipDocument(context.targetDoc) ? context.settings.pip.subtitleSize : context.settings.subtitleSize
  const size = cycle ? nextSubtitleSize(sizes, current) : subtitleSizeFromPercent(sizes[0])
  options.onSubtitleSizeChanged(size, context.targetDoc)
  showHintRequest(context, { type: 'media', icon: icons.subtitles, label: `${subtitleSizePercent(size)}%` })
  return true
}

const createCommandMap = (
  playbackSession: NetflixPlaybackSession,
  options: ShortcutCommandControllerOptions,
  getSettings: () => ShortcutSettings,
): Record<BuiltinShortcutAction, ShortcutCommand> => ({
  previousEpisode: episodeCommand(-1),
  nextEpisode: episodeCommand(1),
  previousFrame: frameCommand(playbackSession, -1, options.onSeekRequested),
  nextFrame: frameCommand(playbackSession, 1, options.onSeekRequested),
  previousAudioTrack: audioTrackCommand(playbackSession, -1, getSettings),
  nextAudioTrack: audioTrackCommand(playbackSession, 1, getSettings),
  playPause: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false

    options.onPlaybackToggleRequested?.()
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
  cycleSubtitleTrack: cycleSubtitleTrack(playbackSession, 1, getSettings, options.onSubtitlesToggled),
  previousSubtitleTrack: cycleSubtitleTrack(playbackSession, -1, getSettings, options.onSubtitlesToggled),
  cycleSubtitleSize: context => changeSubtitleSize(context, context.settings.subtitleSizeCycle, true, options),
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
  setPreferredSpeed: context => {
    const video = findVideo(context.targetDoc)
    if (!video) return false
    showPlaybackRate(
      playbackSession,
      video,
      context.settings.speed.preferred,
      context,
      true,
      icons.speedUp
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
  let cancellationVersion = 0
  const commands = createCommandMap(playbackSession, options, getSettings)
  let holdSpeedInteraction: HoldSpeedInteractionController | null = null

  const createContext = (targetDoc: Document, actionToken = currentActionToken): CommandContext => {
    // Consecutive presses share a lifetime while only the latest owns feedback.
    const version = cancellationVersion
    return {
      settings: getSettings(),
      targetDoc,
      isCurrentAction: () => actionToken === currentActionToken && getSettings().enabled,
      isCancelled: () => version !== cancellationVersion,
    }
  }

  const startAction = (): number => {
    currentActionToken += 1
    return currentActionToken
  }

  const execute = (action: ShortcutAction, targetDoc: Document): boolean => {
    if (EXPLICIT_SPEED_ACTIONS.has(action) || getSettings().preferredSpeedShortcuts.some(shortcut => shortcut.id === action) || action === 'previousFrame' || action === 'nextFrame') {
      holdSpeedInteraction?.cancelHoldSpeedInteraction()
    }
    const actionToken = startAction()
    const context = createContext(targetDoc, actionToken)
    if (isShortcutAction(action)) return commands[action](context)
    const speedShortcut = context.settings.preferredSpeedShortcuts.find(shortcut => shortcut.id === action)
    if (speedShortcut) {
      const video = findVideo(targetDoc)
      if (!video || !context.settings.bindings[action]?.enabled) return false
      showPlaybackRate(playbackSession, video, speedShortcut.speed, context, true, icons.speedUp)
      return true
    }
    const sizeShortcut = context.settings.subtitleSizeShortcuts.find(shortcut => shortcut.id === action)
    if (sizeShortcut) return context.settings.bindings[action]?.enabled
      ? changeSubtitleSize(context, sizeShortcut.sizes, sizeShortcut.kind === 'cycle', options) : false
    const shortcut = resolveSeekShortcut(context.settings, action)
    if (!shortcut || !context.settings.bindings[action]?.enabled) return false
    if (shortcut.kind === 'relative') {
      return seekCommand(playbackSession, shortcut.value < 0 ? -1 : 1, options.onSeekRequested, Math.abs(shortcut.value))(context)
    }
    const video = findVideo(targetDoc)
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return false
    const targetMilliseconds = Math.round(video.duration * 1000 * (shortcut.value / 100))
    const icon = targetMilliseconds < video.currentTime * 1000 ? icons.positionBackward : icons.positionForward
    options.onSeekRequested?.()
    const completion = playbackSession.seekTo(targetMilliseconds)
    showHintRequest(context, { type: 'position', icon, label: `${shortcut.value}%` })
    showCommandFailure(context, completion, icon)
    return true
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

  holdSpeedInteraction = createHoldSpeedInteractionController({
    createContext,
    startAction,
    executeShortPress: targetDoc => execute('playPause', targetDoc),
    hideHoldSpeedHint: targetDoc => getHintManager(targetDoc).hideHoldSpeed(),
    playbackSession,
    showHoldSpeedHint: (context, label) => {
      showHintRequest(context, { type: 'holdSpeed', label })
    },
  })

  return {
    ...holdSpeedInteraction,
    cancelPendingAction: () => { cancellationVersion += 1; startAction() },
    execute,
    setVolume,
  }
}
