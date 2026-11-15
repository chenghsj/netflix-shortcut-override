import { findAutoNextEpisodeButton, findVideo } from '@/content/dom-utils'
import type { ShortcutSettings } from '@/shared/shortcut-types'

const SCAN_DELAY_MS = 50
const VISIBILITY_CHECK_INTERVAL_MS = 100
const RETRY_DELAY_MS = 1_200
const MAX_ATTEMPTS = 2

export const createAutoNextEpisode = (
  targetDoc: Document,
  onAdvance: () => void,
  getVideo = () => findVideo(targetDoc)
) => {
  let observer: MutationObserver | null = null
  let scanTimer: number | undefined
  let visibilityTimer: number | undefined
  let retryTimer: number | undefined
  let watchPath = ''
  let attempts = 0
  // A lingering end card from the previous episode must not advance the new one.
  const buttonOwners = new WeakMap<HTMLElement, string>()

  const scan = () => {
    scanTimer = undefined
    if (!chrome.runtime?.id) {
      stop()
      return
    }
    const pathname = targetDoc.location.pathname
    if (pathname !== watchPath) {
      watchPath = pathname
      attempts = 0
      window.clearTimeout(retryTimer)
      retryTimer = undefined
    }
    if (!/^\/watch\/[^/]+/.test(watchPath) || retryTimer !== undefined || attempts >= MAX_ATTEMPTS) return
    const video = getVideo()
    if (!video || video.seeking) return
    const button = findAutoNextEpisodeButton(targetDoc)
    if (!button) return
    const owner = buttonOwners.get(button)
    if (owner !== undefined && owner !== watchPath) return
    buttonOwners.set(button, watchPath)
    attempts += 1
    retryTimer = window.setTimeout(() => {
      retryTimer = undefined
      scheduleScan()
    }, RETRY_DELAY_MS)
    onAdvance()
    button.click()
  }

  const scheduleScan = () => {
    if (scanTimer === undefined) scanTimer = window.setTimeout(scan, SCAN_DELAY_MS)
  }

  const stop = () => {
    observer?.disconnect()
    observer = null
    for (const event of ['transitionend', 'animationend', 'playing', 'seeked', 'ended']) {
      targetDoc.removeEventListener(event, scheduleScan, true)
    }
    window.clearTimeout(scanTimer)
    window.clearTimeout(retryTimer)
    window.clearInterval(visibilityTimer)
    scanTimer = undefined
    retryTimer = undefined
    visibilityTimer = undefined
    attempts = 0
  }

  const updateSettings = ({ enabled, autoNextEpisode }: ShortcutSettings) => {
    if (!enabled || !autoNextEpisode) {
      stop()
      return
    }
    if (!observer) {
      observer = new MutationObserver(scheduleScan)
      observer.observe(targetDoc, {
        subtree: true,
        childList: true,
        attributeFilter: ['aria-disabled', 'aria-hidden', 'class', 'data-uia', 'disabled', 'hidden', 'inert', 'style'],
      })
      // CSS animation and layout can reveal an existing button without a DOM
      // mutation. Check during the animation rather than waiting for its end.
      visibilityTimer = window.setInterval(scheduleScan, VISIBILITY_CHECK_INTERVAL_MS)
      for (const event of ['transitionend', 'animationend', 'playing', 'seeked', 'ended']) {
        targetDoc.addEventListener(event, scheduleScan, true)
      }
    }
    scheduleScan()
  }

  return { updateSettings, stop }
}
