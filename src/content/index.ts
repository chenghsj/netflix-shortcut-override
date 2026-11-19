import { createSubtitleNavigation } from './subtitle-navigation'
import { applySubtitleSize } from './subtitle-size'
import { applyPauseOverlayVisibility } from './pause-overlay'
import { createAutoSkip } from './auto-skip'
import { createAutoNextEpisode } from './auto-next-episode'
import { resolvePlaybackShortcut } from '@/shared/shortcut-routing'
import {
  canHandlePlaybackShortcut,
  findVideo,
  interceptShortcutEvent,
  isTypingTarget,
} from '@/content/dom-utils'
import { PipManager } from '@/content/pip/pip-manager'
import { isPipDocument } from '@/content/pip/pip-document'
import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import { createShortcutCommandController } from '@/content/shortcuts/shortcut-command-controller'
import type { ShortcutRequest } from '@/content/shortcuts/shortcut-command-types'
import { createPlaybackRequestArbiter, type PlaybackEffect } from '@/content/shortcuts/playback-request-arbiter'
import { findRemappedNetflixNativeActionForKey, getBindingKeys, keyBindingFromEvent, keyListsEqual } from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS, normalizeSettings } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { observeSettings, updateSettings } from '@/shared/storage'
import {
  isCompatibilityDiagnosticsRequest,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'
import { NETFLIX_API_BRIDGE_READY_ATTR } from '@/shared/netflix-api-events'
import type { SupportedMediaSessionAction } from '@/shared/media-session-events'
import { createMediaSessionRouting, getPlaybackIntent, MEDIA_KEY_PAIR_WINDOW_MS } from './media-session-routing'
import { sendNetflixApi } from '@/content/netflix-api-client'

let settings: ShortcutSettings = DEFAULT_SETTINGS
let settingsLoaded = false
let pipManager: PipManager | null = null
const playbackRequests = createPlaybackRequestArbiter(MEDIA_KEY_PAIR_WINDOW_MS)
let shortcutRequestSequence = 0
const createShortcutRequest = (): ShortcutRequest => ({ time: performance.now(), order: ++shortcutRequestSequence })
const supportsPictureInPicture = (targetDoc: Document = document) =>
  pipManager?.isActive === true || PipManager.isSupported(targetDoc.defaultView ?? window)
const recordPlaybackIntent = (intent: PlaybackEffect = 'seek', request = createShortcutRequest()): void => {
  commandController.cancelHoldSpeedInteraction(request)
  playbackRequests.confirm(request, intent)
}
type PipSettingsPatch = Partial<ShortcutSettings['pip']>

const persistPipSettings = (patch: PipSettingsPatch) => updateSettings(current => ({
  ...current,
  pip: { ...current.pip, ...patch },
}))

const playbackSession = createNetflixPlaybackSession()
const recordUserSeek = (request = createShortcutRequest()) => {
  recordPlaybackIntent('seek', request)
  pipManager?.recordUserSeek()
}
const subtitleNavigation = createSubtitleNavigation(() => settings, playbackSession, recordUserSeek)
const autoSkip = createAutoSkip(document, () => {
  subtitleNavigation.cancel()
  recordUserSeek()
}, () => pipManager?.currentVideo ?? findVideo(document))
const autoNextEpisode = createAutoNextEpisode(document, () => {
  subtitleNavigation.cancel()
}, () => pipManager?.currentVideo ?? findVideo(document))
const commandController = createShortcutCommandController(
  () => settings,
  playbackSession,
  {
    createPlaybackDispatcher: (targetDoc, request = createShortcutRequest()) => {
      const watchPath = document.location.pathname
      const video = findVideo(targetDoc)
      return (intent, execute, cancel) => {
        commandController.cancelHoldSpeedInteraction(request)
        subtitleNavigation.cancel()
        playbackRequests.dispatch(request, intent, () => {
          if (settings.enabled && chrome.runtime?.id && document.location.pathname === watchPath &&
            targetDoc.defaultView?.closed !== true && !isTypingTarget(targetDoc) && findVideo(targetDoc) === video) execute()
          else cancel?.()
        }, cancel)
      }
    },
    onSeekRequested: recordUserSeek,
    onSubtitleSizeChanged: (subtitleSize, targetDoc) => {
      if (isPipDocument(targetDoc)) {
        applySettings(normalizeSettings({ ...settings, pip: { ...settings.pip, subtitleSize } }))
        void persistPipSettings({ subtitleSize }).catch(() => undefined)
      } else {
        applySettings(normalizeSettings({ ...settings, subtitleSize }))
        void updateSettings(current => ({ ...current, subtitleSize })).catch(() => undefined)
      }
    },
    onSubtitlesToggled: (subtitlesEnabled, targetDoc) => {
      if (!isPipDocument(targetDoc)) return

      const nextSettings = normalizeSettings({
        ...settings,
        pip: { ...settings.pip, subtitlesEnabled },
      })
      applySettings(nextSettings)
      void persistPipSettings({ subtitlesEnabled }).catch(() => undefined)
    },
  }
)

const clearHoldSpeedOnWindowBlur = () => {
  mediaSessionRouting.clear(true)
  commandController.clearHoldSpeedInteraction()
}

const clearHoldSpeedOnVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    commandController.clearHoldSpeedInteraction()
  }
}

const stopContentListeners = () => {
  mediaSessionRouting.destroy()
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('keyup', handleKeyup, true)
  window.removeEventListener('blur', clearHoldSpeedOnWindowBlur)
  document.removeEventListener('visibilitychange', clearHoldSpeedOnVisibilityChange)
  commandController.clearHoldSpeedInteraction()
  commandController.cancelPendingAction()
  subtitleNavigation.cancel()
  autoSkip.stop()
  autoNextEpisode.stop()
  applySubtitleSize(document, 'medium')
  applyPauseOverlayVisibility(document, false)
  pipManager?.destroy()
}

const routeKeydown = (
  event: KeyboardEvent, targetDoc: Document, mediaAction: SupportedMediaSessionAction | undefined, request: ShortcutRequest,
) => {
  if (!chrome.runtime?.id) {
    stopContentListeners()
    return
  }
  if (!settingsLoaded) return

  if (isTypingTarget(targetDoc)) return
  if (!settings.enabled) return

  const code = keyBindingFromEvent(event).code
  if (event.repeat && commandController.shouldInterceptHoldSpeedRepeat(code)) {
    interceptShortcutEvent(event)
    return
  }

  const shortcut = resolvePlaybackShortcut(settings, event, supportsPictureInPicture(targetDoc))
  if (shortcut && !shortcut.supported) return
  if (shortcut?.group === 'subtitleNavigation') {
    const subtitleNavigationAction = shortcut.action
    if (!canHandlePlaybackShortcut(targetDoc) || !findVideo(targetDoc)) return
    interceptShortcutEvent(event)
    if (event.repeat) return
    commandController.clearHoldSpeedInteraction()
    commandController.cancelPendingAction()
    if (subtitleNavigationAction === 'playback') {
      subtitleNavigation.cancel()
      executePlaybackControl(targetDoc, request, mediaAction, code)
    } else {
      recordPlaybackIntent('seek', request)
      void subtitleNavigation.execute(subtitleNavigationAction, targetDoc, request)
    }
    return
  }

  const action = shortcut?.group === 'general' ? shortcut.action : null
  const remappedNetflixNativeAction = findRemappedNetflixNativeActionForKey(settings, event)

  if (action === 'pictureInPicture') {
    if (event.repeat) return
    const canTogglePip =
      pipManager?.isActive === true ||
      (canHandlePlaybackShortcut(targetDoc) &&
        PipManager.isSupported(targetDoc.defaultView ?? window) &&
        findVideo(targetDoc) !== null)
    if (!canTogglePip) return

    interceptShortcutEvent(event)
    commandController.cancelPendingAction()
    void pipManager?.toggle().catch(() => undefined)
    return
  }

  if (!canHandlePlaybackShortcut(targetDoc)) return

  if (action) subtitleNavigation.cancel()
  if (action === 'playPause') {
    const video = findVideo(targetDoc)
    if (!video) return

    if (event.repeat) {
      interceptShortcutEvent(event)
      return
    }

    if (mediaAction || code === 'MediaPlay' || code === 'MediaPause' || code === 'MediaStop') {
      executePlaybackControl(targetDoc, request, mediaAction, code)
      interceptShortcutEvent(event)
      return
    }

    if (settings.holdSpeed.enabled) {
      recordPlaybackIntent('toggle', request)
      commandController.beginHoldSpeedInteraction(targetDoc, video, code, request)
    } else {
      commandController.execute('playPause', targetDoc, request)
    }
    interceptShortcutEvent(event)
    return
  }

  if (!action) {
    if (remappedNetflixNativeAction) interceptShortcutEvent(event)
    return
  }

  if ((action === 'setPreferredSpeed' || settings.preferredSpeedShortcuts.some(shortcut => shortcut.id === action) || action === 'cycleSubtitleTrack' || action === 'previousSubtitleTrack' || action === 'previousAudioTrack' || action === 'nextAudioTrack' || action === 'cycleSubtitleSize' || settings.subtitleSizeShortcuts.some(shortcut => shortcut.id === action) || action === 'previousEpisode' || action === 'nextEpisode' || settings.seekShortcuts.some(shortcut => shortcut.id === action && shortcut.kind === 'percentage')) && event.repeat) {
    interceptShortcutEvent(event)
    return
  }

  if (action === 'fullscreen' && pipManager?.isPipDocument(targetDoc)) {
    interceptShortcutEvent(event)
    return
  }

  if (action === 'seekBackward' || action === 'seekForward') {
    interceptShortcutEvent(event)
    commandController.execute(action, targetDoc, request)
    return
  }

  if (commandController.execute(action, targetDoc, request)) {
    interceptShortcutEvent(event)
  }
}

const executePlaybackControl = (targetDoc: Document, request: ShortcutRequest, mediaAction?: SupportedMediaSessionAction, code?: string) => {
  const intent = getPlaybackIntent(mediaAction, code)
  if (intent !== 'toggle') {
    commandController.setPlaybackPaused(intent === 'pause', targetDoc, request)
  } else commandController.execute('playPause', targetDoc, request)
}

const handleKeyup = (event: KeyboardEvent) => {
  if (!chrome.runtime?.id) {
    stopContentListeners()
    return
  }

  if (!settingsLoaded || !settings.enabled) {
    commandController.clearHoldSpeedInteraction()
    return
  }

  const code = keyBindingFromEvent(event).code
  const completed = commandController.completeHoldSpeedInteraction(code)
  if (completed) interceptShortcutEvent(event)
}

const mediaSessionRouting = createMediaSessionRouting({
  getSettings: () => settingsLoaded ? settings : null,
  getPlaybackDocument: () => pipManager?.getPipDocument() ?? document,
  supportsPictureInPicture,
  isPipDocument: targetDoc => pipManager?.isPipDocument(targetDoc) ?? false,
  createRequest: createShortcutRequest,
  routeKeydown,
  onPlaybackEffect: recordPlaybackIntent,
  onWatchChanged: () => {
    commandController.clearHoldSpeedInteraction(false)
  },
  playbackRequests,
})
const handleKeydown = mediaSessionRouting.handleKeydown

pipManager = new PipManager({
  sourceDocument: document,
  playbackSession,
  commands: commandController,
  onKeydown: (event, targetDoc) => handleKeydown(event, targetDoc),
  onKeyup: event => handleKeyup(event),
  onBlur: clearHoldSpeedOnWindowBlur,
  onUserSeek: () => recordPlaybackIntent(),
  onClick: (event, targetDoc) => {
    if (!settingsLoaded || !settings.enabled) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    commandController.execute('playPause', targetDoc)
  },
  settings,
  onSettingsChange: nextSettings => {
    const normalizedSettings = normalizeSettings(nextSettings)
    const patch: PipSettingsPatch = {
      ...(settings.pip.subtitlesEnabled !== normalizedSettings.pip.subtitlesEnabled
        ? { subtitlesEnabled: normalizedSettings.pip.subtitlesEnabled }
        : {}),
      ...(settings.pip.subtitleSize !== normalizedSettings.pip.subtitleSize
        ? { subtitleSize: normalizedSettings.pip.subtitleSize }
        : {}),
      ...(settings.pip.subtitleBackground !== normalizedSettings.pip.subtitleBackground
        ? { subtitleBackground: normalizedSettings.pip.subtitleBackground }
        : {}),
    }
    applySettings(normalizedSettings)
    void persistPipSettings(patch).catch(() => undefined)
  },
})
const applySettings = (nextSettings: ShortcutSettings) => {
  // A handled command may save a preference (for example, subtitle size).
  // Keep its paired notification suppressed unless shortcut routing changed.
  if (settings.enabled !== nextSettings.enabled ||
    settings.subtitleNavigation.enabled !== nextSettings.subtitleNavigation.enabled ||
    JSON.stringify(settings.bindings) !== JSON.stringify(nextSettings.bindings) ||
    JSON.stringify(settings.subtitleNavigation.bindings) !== JSON.stringify(nextSettings.subtitleNavigation.bindings)) {
    mediaSessionRouting.clear()
  }
  if (settings.enabled && !nextSettings.enabled) commandController.cancelPendingAction()
  if (!nextSettings.enabled || !nextSettings.holdSpeed.enabled || !nextSettings.bindings.playPause.enabled ||
    !keyListsEqual(getBindingKeys(settings.bindings.playPause), getBindingKeys(nextSettings.bindings.playPause))) {
    commandController.cancelHoldSpeedInteraction()
  }
  subtitleNavigation.updateSettings(nextSettings)
  settings = nextSettings
  settingsLoaded = true
  mediaSessionRouting.sync()
  autoSkip.updateSettings(nextSettings)
  autoNextEpisode.updateSettings(nextSettings)
  applySubtitleSize(document, nextSettings.enabled ? nextSettings.subtitleSize : 'medium')
  applyPauseOverlayVisibility(document, nextSettings.enabled && nextSettings.hidePauseOverlay)
  pipManager?.updateSettings(nextSettings)
}

const settingsObservation = observeSettings(nextSettings => {
  applySettings(normalizeSettings({
    ...nextSettings,
    uiStyle: nextSettings.uiStyle ?? settings.uiStyle,
  }))
})
void settingsObservation.ready.catch(() => {
  if (!settingsLoaded) applySettings(DEFAULT_SETTINGS)
})

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isCompatibilityDiagnosticsRequest(message)) return false

  const bridgeReady =
    document.documentElement?.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR) === 'ready'

  void sendNetflixApi('diagnose')
    .then(response => {
      const diagnostics: CompatibilityDiagnostics = {
        contentScriptReady: true,
        settingsLoaded,
        enabled: settings.enabled,
        videoFound: findVideo(document) !== null,
        bridgeReady,
        playerApiFound: response.result?.playerApiFound === true,
        playerFound: response.result?.playerFound === true,
        ...(response.result?.subtitleDiagnostics
          ? { subtitleDiagnostics: response.result.subtitleDiagnostics }
          : {}),
        pipSupported: PipManager.isSupported(window),
        pipActive: pipManager?.isActive === true,
        ...(response.success
          ? response.result?.error
            ? { error: response.result.error }
            : {}
          : { error: response.error ?? 'Unable to inspect Netflix compatibility.' }),
      }
      sendResponse(diagnostics)
    })
    .catch(error => {
      sendResponse({
        contentScriptReady: true,
        settingsLoaded,
        enabled: settings.enabled,
        videoFound: findVideo(document) !== null,
        bridgeReady,
        playerApiFound: false,
        playerFound: false,
        pipSupported: PipManager.isSupported(window),
        pipActive: pipManager?.isActive === true,
        error: error instanceof Error ? error.message : 'Unable to inspect Netflix compatibility.',
      } satisfies CompatibilityDiagnostics)
    })

  return true
})

window.addEventListener('keydown', handleKeydown, true)
window.addEventListener('keyup', handleKeyup, true)
window.addEventListener('blur', clearHoldSpeedOnWindowBlur)
document.addEventListener('visibilitychange', clearHoldSpeedOnVisibilityChange)
