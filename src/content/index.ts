import { getCopy } from '@/shared/i18n'
import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'
import {
  NETFLIX_API_MESSAGE_TYPE,
  type NetflixApiAction,
  type NetflixApiResponse,
} from '@/shared/netflix-api'
import {
  DEFAULT_SETTINGS,
  findActionForKey,
  normalizeSettings,
  resolveNextPlaybackRate,
  type ShortcutAction,
  type ShortcutSettings,
} from '@/shared/shortcuts'
import { getSettings, subscribeSettings } from '@/shared/storage'
import { mediaHintIcons as icons, showMediaHint } from '@/content/media-hint'

let settings: ShortcutSettings = DEFAULT_SETTINGS
let settingsLoaded = false
let netflixApiRequestId = 0

type SpaceHoldState = {
  targetDoc: Document
  video: HTMLVideoElement
  restoreRate: number
  wasPaused: boolean
  timer: number | null
  active: boolean
}

const hasNetflixPageBridge = (): boolean =>
  document.documentElement?.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR) === 'ready'

const sendNetflixPageApi = (
  action: NetflixApiAction,
  value?: number
): Promise<NetflixApiResponse> =>
  new Promise(resolve => {
    const id = `shortcut-override-${Date.now()}-${(netflixApiRequestId += 1)}`
    const timeout = window.setTimeout(() => {
      window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
      resolve({ success: false, error: 'No page bridge response.' })
    }, 160)

    const handleResponse = (event: Event) => {
      const detail =
        'detail' in event
          ? (event.detail as (NetflixApiResponse & { id?: string }) | null)
          : null
      if (!detail || detail.id !== id) return

      window.clearTimeout(timeout)
      window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
      resolve(detail)
    }

    window.addEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
    window.dispatchEvent(
      new CustomEvent(NETFLIX_API_REQUEST_EVENT, {
        detail: { source: 'shortcut-override', id, action, value },
      })
    )
  })

const sendNetflixBackgroundApi = (
  action: NetflixApiAction,
  value?: number
): Promise<NetflixApiResponse> =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({ type: NETFLIX_API_MESSAGE_TYPE, action, value }, response => {
      const error = chrome.runtime.lastError?.message
      if (error) {
        resolve({ success: false, error })
        return
      }

      resolve(response ?? { success: false, error: 'No background response.' })
    })
  })

const sendNetflixApi = async (
  action: NetflixApiAction,
  value?: number
): Promise<NetflixApiResponse> => {
  if (!hasNetflixPageBridge()) return sendNetflixBackgroundApi(action, value)

  const pageResponse = await sendNetflixPageApi(action, value)
  if (pageResponse.success) return pageResponse

  const backgroundResponse = await sendNetflixBackgroundApi(action, value)
  return backgroundResponse.success ? backgroundResponse : pageResponse
}

const getSeekFailureLabel = (response: NetflixApiResponse): string | null => {
  if (!response.success) return `Seek failed: ${response.error ?? 'background error'}`
  if (response.result?.seekCalled) return null
  if (response.result?.error) return `Seek failed: ${response.result.error}`
  if (response.result?.playerApiFound === false) return 'Seek failed: no Netflix API'
  if (response.result?.playerFound === false) return 'Seek failed: no Netflix player'
  return 'Seek failed: no seek call'
}

const intercept = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

const isTypingTarget = (targetDoc: Document): boolean => {
  const active = targetDoc.activeElement
  if (!(active instanceof HTMLElement)) return false

  return active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
}

const getTargetDocument = (event: KeyboardEvent): Document => event.view?.document ?? document

const findVideo = (targetDoc: Document): HTMLVideoElement | null => {
  const localVideo = targetDoc.querySelector('video')
  if (localVideo instanceof HTMLVideoElement) return localVideo

  const rootVideo = document.querySelector('video')
  return rootVideo instanceof HTMLVideoElement ? rootVideo : null
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

const SPACE_HOLD_DELAY_MS = 250
let spaceHoldState: SpaceHoldState | null = null

const showHint = (iconHtml: string, label: string, targetDoc: Document) => {
  showMediaHint(iconHtml, label, targetDoc, settings.showHints)
}

const skipIntroSelector = [
  '[data-uia*="skip-intro" i]',
  '[data-uia*="skip-recap" i]',
  '[data-uia*="skip-credits" i]',
  '[aria-label*="skip intro" i]',
  '[aria-label*="skip recap" i]',
  '[aria-label*="skip credits" i]',
  '[aria-label*="略過片頭"]',
  '[aria-label*="跳過片頭"]',
  '[aria-label*="オープニングをスキップ"]',
  '[aria-label*="イントロをスキップ"]',
  '[aria-label*="인트로 건너뛰기"]',
].join(', ')

const skipIntroText =
  /skip\s+(intro|recap|opening|credits)|略過片頭|跳過片頭|跳过片头|略過前情提要|跳過前情提要|跳过前情提要|オープニングをスキップ|イントロをスキップ|건너뛰기|인트로 건너뛰기/i

const isVisibleElement = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect()
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    style?.opacity !== '0'
  )
}

const getDocumentPathname = (targetDoc: Document): string =>
  targetDoc.defaultView?.location.pathname ?? targetDoc.location.pathname

const isWatchPage = (targetDoc: Document): boolean => {
  if (getDocumentPathname(targetDoc).startsWith('/watch')) return true
  return targetDoc !== document && getDocumentPathname(document).startsWith('/watch')
}

const hasVisiblePlaybackRoot = (targetDoc: Document): boolean => {
  const docs = targetDoc === document ? [targetDoc] : [targetDoc, document]
  return docs.some(doc =>
    Array.from(doc.querySelectorAll<HTMLElement>('.watch-video, [data-uia="player"]')).some(
      isVisibleElement
    )
  )
}

const canHandlePlaybackShortcut = (targetDoc: Document): boolean =>
  isWatchPage(targetDoc) || hasVisiblePlaybackRoot(targetDoc)

const findSkipIntroButton = (targetDoc: Document): HTMLElement | null => {
  const docs = targetDoc === document ? [targetDoc] : [targetDoc, document]
  for (const doc of docs) {
    const selectorMatch = Array.from(doc.querySelectorAll<HTMLElement>(skipIntroSelector)).find(
      isVisibleElement
    )
    if (selectorMatch) return selectorMatch

    const textMatch = Array.from(doc.querySelectorAll<HTMLElement>('button, [role="button"]')).find(
      element => isVisibleElement(element) && skipIntroText.test(element.textContent ?? '')
    )
    if (textMatch) return textMatch
  }
  return null
}

const formatPlaybackRate = (rate: number): string =>
  `${rate.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`

const formatSeekHint = (seconds: number, direction: -1 | 1): string =>
  `${direction > 0 ? '+' : '-'}${seconds}s`

const setPlaybackRate = (video: HTMLVideoElement, rate: number, targetDoc: Document) => {
  video.playbackRate = rate
  sendNetflixApi('setPlaybackRate', rate)
  showHint(icons.speed, formatPlaybackRate(rate), targetDoc)
}

const isPlainSpaceEvent = (event: KeyboardEvent): boolean =>
  event.code === 'Space' &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  !event.metaKey

const getRestorablePlaybackRate = (video: HTMLVideoElement): number =>
  Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1

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

    setPlaybackRate(state.video, settings.speed.hold, state.targetDoc)
  }, SPACE_HOLD_DELAY_MS)

  spaceHoldState = state
}

const completeSpaceHold = (): void => {
  const state = spaceHoldState
  if (!state) return

  spaceHoldState = null

  if (state.timer !== null) {
    window.clearTimeout(state.timer)
    executeAction('playPause', state.targetDoc)
    return
  }

  if (!state.active) return

  setPlaybackRate(state.video, state.restoreRate, state.targetDoc)

  if (state.wasPaused) {
    state.video.pause()
    sendNetflixApi('pause')
  }
}

const adjustVolume = (video: HTMLVideoElement, delta: number, targetDoc: Document) => {
  const copy = getCopy(settings.locale)
  const currentVolume = clampVolume(video.volume)
  const isSilent = video.muted || currentVolume === 0

  if (isSilent && delta < 0) {
    if (currentVolume > 0) rememberVolumeForRestore(video, currentVolume)
    showHint(icons.mute, copy.hints.mute, targetDoc)
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
  showHint(nextVolume === 0 ? icons.mute : icons.volume, label, targetDoc)
}

const toggleMute = (video: HTMLVideoElement, targetDoc: Document) => {
  const copy = getCopy(settings.locale)
  if (video.muted || video.volume === 0) {
    const restored = getLastAudibleVolume(video)
    sendNetflixApi('unmuteWithVolume', restored)
    mirrorAudioState(video, { volume: restored, muted: false })
    rememberVolumeForRestore(video, restored)
    showHint(icons.volume, copy.hints.unmute, targetDoc)
    return
  }

  rememberVolumeForRestore(video, video.volume)
  sendNetflixApi('setMuted', 1)
  mirrorAudioState(video, { muted: true })
  showHint(icons.mute, copy.hints.mute, targetDoc)
}

const toggleFullscreen = (targetDoc: Document) => {
  if (targetDoc.fullscreenElement) {
    void targetDoc.exitFullscreen()
  } else {
    const target =
      targetDoc.querySelector<HTMLElement>('.watch-video') ?? targetDoc.documentElement
    void target.requestFullscreen()
  }
}

const executeAction = (action: ShortcutAction, targetDoc: Document): boolean => {
  const copy = getCopy(settings.locale)
  const video = findVideo(targetDoc)

  switch (action) {
    case 'seekBackward':
      {
        const icon = icons.rewind(settings.seek.seconds)
        showHint(icon, formatSeekHint(settings.seek.seconds, -1), targetDoc)
        void sendNetflixApi('seek', -settings.seek.seconds * 1000).then(response => {
          const failureLabel = getSeekFailureLabel(response)
          if (failureLabel) showHint(icon, failureLabel, targetDoc)
        })
      }
      return true
    case 'seekForward':
      {
        const icon = icons.forward(settings.seek.seconds)
        showHint(icon, formatSeekHint(settings.seek.seconds, 1), targetDoc)
        void sendNetflixApi('seek', settings.seek.seconds * 1000).then(response => {
          const failureLabel = getSeekFailureLabel(response)
          if (failureLabel) showHint(icon, failureLabel, targetDoc)
        })
      }
      return true
    case 'fullscreen':
      toggleFullscreen(targetDoc)
      return true
    case 'skipIntro': {
      const button = findSkipIntroButton(targetDoc)
      if (!button) return false
      button.click()
      showHint(icons.skipIntro, copy.hints.skipIntro, targetDoc)
      return true
    }
    default:
      break
  }

  if (!video) return false

  switch (action) {
    case 'playPause':
      if (video.paused) {
        void video.play().catch(() => undefined)
        sendNetflixApi('play')
        showHint(icons.play, copy.hints.play, targetDoc)
      } else {
        video.pause()
        sendNetflixApi('pause')
        showHint(icons.pause, copy.hints.pause, targetDoc)
      }
      return true
    case 'volumeUp':
      adjustVolume(video, 0.05, targetDoc)
      return true
    case 'volumeDown':
      adjustVolume(video, -0.05, targetDoc)
      return true
    case 'mute':
      toggleMute(video, targetDoc)
      return true
    case 'speedUp':
      setPlaybackRate(video, resolveNextPlaybackRate(video.playbackRate, 1, settings.speed), targetDoc)
      return true
    case 'speedDown':
      setPlaybackRate(video, resolveNextPlaybackRate(video.playbackRate, -1, settings.speed), targetDoc)
      return true
    case 'speedReset':
      setPlaybackRate(video, 1, targetDoc)
      return true
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!chrome.runtime?.id) {
    window.removeEventListener('keydown', handleKeydown, true)
    window.removeEventListener('keyup', handleKeyup, true)
    clearSpaceHoldState()
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

    intercept(event)
    if (!event.repeat) startSpaceHold(targetDoc, video)
    return
  }

  if (action === 'seekBackward' || action === 'seekForward') {
    intercept(event)
    executeAction(action, targetDoc)
    return
  }

  if (executeAction(action, targetDoc)) intercept(event)
}

const handleKeyup = (event: KeyboardEvent) => {
  if (!chrome.runtime?.id) {
    window.removeEventListener('keydown', handleKeydown, true)
    window.removeEventListener('keyup', handleKeyup, true)
    clearSpaceHoldState()
    return
  }

  if (!isPlainSpaceEvent(event) || !spaceHoldState) return

  intercept(event)
  completeSpaceHold()
}

void getSettings().then(nextSettings => {
  settings = nextSettings
  settingsLoaded = true
}).catch(() => {
  settings = DEFAULT_SETTINGS
  settingsLoaded = true
})
subscribeSettings(nextSettings => {
  settings = normalizeSettings(nextSettings)
  settingsLoaded = true
})

window.addEventListener('keydown', handleKeydown, true)
window.addEventListener('keyup', handleKeyup, true)
