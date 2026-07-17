import {
  canHandlePlaybackShortcut,
  findVideo,
  getTargetDocument,
  interceptShortcutEvent,
  isPlainSpaceEvent,
  isTypingTarget,
} from '@/content/dom-utils'
import { PipManager } from '@/content/pip/pip-manager'
import { createShortcutCommandController } from '@/content/shortcuts/shortcut-command-controller'
import {
  DEFAULT_SETTINGS,
  findActionForKey,
  findRemappedNetflixNativeActionForKey,
  normalizeSettings,
  type ShortcutSettings,
} from '@/shared/shortcuts'
import { getSettings, subscribeSettings } from '@/shared/storage'

let settings: ShortcutSettings = DEFAULT_SETTINGS
let settingsLoaded = false

const commandController = createShortcutCommandController(() => settings)
let pipManager: PipManager | null = null

const clearSpaceHoldOnWindowBlur = () => {
  commandController.clearSpaceInteraction()
}

const stopContentListeners = () => {
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('keyup', handleKeyup, true)
  window.removeEventListener('blur', clearSpaceHoldOnWindowBlur)
  commandController.clearSpaceInteraction()
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

  const isSpaceInteraction = isPlainSpaceEvent(event) && (action === null || action === 'playPause')
  if (isSpaceInteraction) {
    const video = findVideo(targetDoc)
    if (!video) return

    if (event.repeat) {
      if (commandController.shouldInterceptSpaceRepeat()) interceptShortcutEvent(event)
      return
    }

    const isPipSpace = pipManager?.isPipDocument(targetDoc) === true
    const shouldTrackSpace = action === 'playPause' || isPipSpace || settings.spaceHold.enabled
    if (!shouldTrackSpace) return
    const handleShortPress = action === 'playPause' || isPipSpace
    commandController.beginSpaceInteraction(
      targetDoc,
      video,
      settings.spaceHold.enabled,
      handleShortPress
    )
    if (handleShortPress) interceptShortcutEvent(event)
    return
  }

  if (!action) {
    if (remappedNetflixNativeAction) interceptShortcutEvent(event)
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
    commandController.clearSpaceInteraction()
    return
  }

  if (!isPlainSpaceEvent(event)) return

  if (commandController.completeSpaceInteraction()) interceptShortcutEvent(event)
}

pipManager = new PipManager({
  sourceDocument: document,
  onKeydown: (event, targetDoc) => handleKeydown(event, targetDoc),
  onKeyup: event => handleKeyup(event),
  onBlur: () => commandController.clearSpaceInteraction(),
  onClick: (event, targetDoc) => {
    if (!settingsLoaded || !settings.enabled) return
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    commandController.execute('playPause', targetDoc)
  },
})

const applySettings = (nextSettings: ShortcutSettings) => {
  settings = nextSettings
  settingsLoaded = true
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

window.addEventListener('keydown', handleKeydown, true)
window.addEventListener('keyup', handleKeyup, true)
window.addEventListener('blur', clearSpaceHoldOnWindowBlur)
