import { createSubtitlePractice } from './subtitle-practice'
import { practiceAction } from '@/shared/subtitle-practice'
import {
  canHandlePlaybackShortcut,
  findVideo,
  getTargetDocument,
  interceptShortcutEvent,
  isTypingTarget,
} from '@/content/dom-utils'
import { PipManager } from '@/content/pip/pip-manager'
import { isPipDocument } from '@/content/pip/pip-document'
import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import { createShortcutCommandController } from '@/content/shortcuts/shortcut-command-controller'
import {
  findActionForKey,
  findRemappedNetflixNativeActionForKey,
} from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS, normalizeSettings } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { getSettings, saveSettings, subscribeSettings } from '@/shared/storage'
import {
  isCompatibilityDiagnosticsRequest,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'
import { NETFLIX_API_BRIDGE_READY_ATTR } from '@/shared/netflix-api-events'
import { sendNetflixApi } from '@/content/netflix-api-client'

let settings: ShortcutSettings = DEFAULT_SETTINGS
let settingsLoaded = false
let pipManager: PipManager | null = null

const playbackSession = createNetflixPlaybackSession()
const subtitlePractice = createSubtitlePractice(() => settings, playbackSession, () => pipManager?.recordUserSeek())
const commandController = createShortcutCommandController(
  () => settings,
  playbackSession,
  {
    onPlaybackToggleRequested: () => subtitlePractice.cancel(),
    onSeekRequested: () => pipManager?.recordUserSeek(),
    onSubtitlesToggled: (subtitlesEnabled, targetDoc) => {
      if (!isPipDocument(targetDoc)) return

      const nextSettings = normalizeSettings({
        ...settings,
        pip: { ...settings.pip, subtitlesEnabled },
      })
      applySettings(nextSettings, true)
      void saveSettings(nextSettings).catch(() => undefined)
    },
  }
)

const clearHoldSpeedOnWindowBlur = () => {
  commandController.clearHoldSpeedInteraction()
}

const clearHoldSpeedOnVisibilityChange = () => {
  if (document.visibilityState === 'hidden') commandController.clearHoldSpeedInteraction()
}

const stopContentListeners = () => {
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('keyup', handleKeyup, true)
  window.removeEventListener('blur', clearHoldSpeedOnWindowBlur)
  document.removeEventListener('visibilitychange', clearHoldSpeedOnVisibilityChange)
  commandController.clearHoldSpeedInteraction()
  subtitlePractice.cancel()
  pipManager?.destroy()
}

const handleKeydown = (event: KeyboardEvent, explicitTargetDoc?: Document) => {
  if (!chrome.runtime?.id) {
    stopContentListeners()
    return
  }
  if (!settingsLoaded) return

  const targetDoc = explicitTargetDoc ?? getTargetDocument(event)
  if (isTypingTarget(targetDoc)) return
  if (!settings.enabled) return

  if (event.repeat && commandController.shouldInterceptHoldSpeedRepeat(event.code)) {
    interceptShortcutEvent(event)
    return
  }

  const practice = settings.subtitlePractice.enabled ? practiceAction(event, settings) : null
  if (practice) {
    if (!canHandlePlaybackShortcut(targetDoc) || !findVideo(targetDoc)) return
    interceptShortcutEvent(event)
    if (event.repeat) return
    commandController.clearHoldSpeedInteraction()
    if (practice === 'playback') {
      subtitlePractice.cancel()
      commandController.execute('playPause', targetDoc)
    } else {
      void subtitlePractice.execute(practice, targetDoc)
    }
    return
  }

  const action = findActionForKey(settings, event)
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
    void pipManager?.toggle().catch(() => undefined)
    return
  }

  if (!canHandlePlaybackShortcut(targetDoc)) return

  if (action) subtitlePractice.cancel()
  if (action === 'playPause') {
    const video = findVideo(targetDoc)
    if (!video) return

    if (event.repeat) {
      interceptShortcutEvent(event)
      return
    }

    if (settings.holdSpeed.enabled) {
      commandController.beginHoldSpeedInteraction(targetDoc, video, event.code)
    } else {
      commandController.execute('playPause', targetDoc)
    }
    interceptShortcutEvent(event)
    return
  }

  if (!action) {
    if (remappedNetflixNativeAction) interceptShortcutEvent(event)
    return
  }

  if (action === 'setPreferredSpeed' && event.repeat) {
    interceptShortcutEvent(event)
    return
  }

  if (action === 'fullscreen' && pipManager?.isPipDocument(targetDoc)) {
    interceptShortcutEvent(event)
    return
  }

  if (action === 'seekBackward' || action === 'seekForward') {
    interceptShortcutEvent(event)
    commandController.execute(action, targetDoc)
    return
  }

  if (commandController.execute(action, targetDoc)) {
    interceptShortcutEvent(event)
  }
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

  if (commandController.completeHoldSpeedInteraction(event.code)) interceptShortcutEvent(event)
}

pipManager = new PipManager({
  sourceDocument: document,
  playbackSession,
  commands: commandController,
  onKeydown: (event, targetDoc) => handleKeydown(event, targetDoc),
  onKeyup: event => handleKeyup(event),
  onBlur: () => commandController.clearHoldSpeedInteraction(),
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
    applySettings(normalizedSettings)
    void saveSettings(normalizedSettings).catch(() => undefined)
  },
})
const applySettings = (
  nextSettings: ShortcutSettings,
  subtitleStateConfirmed = false
) => {
  subtitlePractice.updateSettings(nextSettings)
  settings = nextSettings
  settingsLoaded = true
  if (subtitleStateConfirmed) pipManager?.confirmSubtitleState(nextSettings)
  else pipManager?.updateSettings(nextSettings)
}

void getSettings()
  .then(nextSettings => {
    applySettings(nextSettings)
  })
  .catch(() => {
    applySettings(DEFAULT_SETTINGS)
  })
subscribeSettings(nextSettings => {
  applySettings(normalizeSettings(nextSettings))
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
