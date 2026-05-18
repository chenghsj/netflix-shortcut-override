import {
  canHandlePlaybackShortcut,
  findVideo,
  getTargetDocument,
  interceptShortcutEvent,
  isPlainSpaceEvent,
  isTypingTarget,
} from '@/content/dom-utils'
import { createShortcutCommandController } from '@/content/shortcut-command-controller'
import {
  DEFAULT_SETTINGS,
  findActionForKey,
  normalizeSettings,
  type ShortcutSettings,
} from '@/shared/shortcuts'
import { getSettings, subscribeSettings } from '@/shared/storage'

let settings: ShortcutSettings = DEFAULT_SETTINGS
let settingsLoaded = false

const commandController = createShortcutCommandController(() => settings)

const stopContentListeners = () => {
  window.removeEventListener('keydown', handleKeydown, true)
  window.removeEventListener('keyup', handleKeyup, true)
  commandController.clearSpaceHoldState()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!chrome.runtime?.id) {
    stopContentListeners()
    return
  }
  if (!settingsLoaded) return
  if (!settings.enabled) return

  const targetDoc = getTargetDocument(event)
  if (isTypingTarget(targetDoc)) return

  const action = findActionForKey(settings, event)
  if (!action) return
  if (!canHandlePlaybackShortcut(targetDoc)) return

  if (action === 'playPause' && isPlainSpaceEvent(event)) {
    const video = findVideo(targetDoc)
    if (!video) return

    interceptShortcutEvent(event)
    if (!event.repeat) commandController.startSpaceHold(targetDoc, video)
    return
  }

  if (action === 'seekBackward' || action === 'seekForward') {
    interceptShortcutEvent(event)
    commandController.execute(action, targetDoc)
    return
  }

  if (commandController.execute(action, targetDoc)) interceptShortcutEvent(event)
}

const handleKeyup = (event: KeyboardEvent) => {
  if (!chrome.runtime?.id) {
    stopContentListeners()
    return
  }

  if (!isPlainSpaceEvent(event) || !commandController.hasSpaceHoldState()) return

  interceptShortcutEvent(event)
  commandController.completeSpaceHold()
}

void getSettings()
  .then(nextSettings => {
    settings = nextSettings
    settingsLoaded = true
  })
  .catch(() => {
    settings = DEFAULT_SETTINGS
    settingsLoaded = true
  })
subscribeSettings(nextSettings => {
  settings = normalizeSettings(nextSettings)
  settingsLoaded = true
})

window.addEventListener('keydown', handleKeydown, true)
window.addEventListener('keyup', handleKeyup, true)
