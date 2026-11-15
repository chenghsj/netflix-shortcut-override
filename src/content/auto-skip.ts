import { findAutoSkipButton, findVideo } from '@/content/dom-utils'
import type { AutoSkipSettings, ShortcutSettings } from '@/shared/shortcut-types'

const SCAN_DELAY_MS = 50
const SKIP_CONFIRM_TIMEOUT_MS = 1_200
const SEEK_TOLERANCE_SECONDS = 0.5

type SkipKind = keyof AutoSkipSettings
type SkipAttempt = {
  kind: SkipKind
  from: number
  retried: boolean
  timer?: number
}
type SkipOutcome = { landedAt: number } | { retryFrom: number }

export const createAutoSkip = (
  targetDoc: Document,
  onSkip: () => void,
  getVideo = () => findVideo(targetDoc)
) => {
  let options: AutoSkipSettings = { intro: false, recap: false }
  let observer: MutationObserver | null = null
  let scanTimer: number | undefined
  let watchPath = ''
  let trackedVideo: HTMLVideoElement | null = null
  let pending: SkipAttempt | undefined
  const outcomes = new Map<SkipKind, SkipOutcome>()

  const cancelAttempt = () => {
    window.clearTimeout(pending?.timer)
    pending = undefined
  }

  const clickSkip = (
    match: NonNullable<ReturnType<typeof findAutoSkipButton>>,
    video: HTMLVideoElement,
    retried: boolean
  ) => {
    const attempt: SkipAttempt = { kind: match.kind, from: video.currentTime, retried }
    attempt.timer = window.setTimeout(() => {
      attempt.timer = undefined
      scheduleScan()
    }, SKIP_CONFIRM_TIMEOUT_MS)
    pending = attempt
    onSkip()
    match.button.click()
  }

  const scan = () => {
    scanTimer = undefined
    if (!chrome.runtime?.id) {
      stop()
      return
    }

    const pathname = targetDoc.location.pathname
    if (pathname !== watchPath) {
      watchPath = pathname
      outcomes.clear()
      cancelAttempt()
    }

    const video = /^\/watch\/[^/]+/.test(watchPath) ? getVideo() : null
    trackVideo(video)
    // Netflix can show the destination's skip button before the current seek settles.
    if (!video || video.seeking) return

    if (pending) {
      const { kind, from, retried, timer } = pending
      if (timer !== undefined) return

      const retry = !retried && findAutoSkipButton(targetDoc, {
        intro: kind === 'intro',
        recap: kind === 'recap',
      })
      if (retry) {
        clickSkip(retry, video, true)
        return
      }
      outcomes.set(kind, { retryFrom: from })
      cancelAttempt()
    }

    const remaining = {
      intro: options.intro && !outcomes.has('intro'),
      recap: options.recap && !outcomes.has('recap'),
    }
    if (!remaining.intro && !remaining.recap) return

    const match = findAutoSkipButton(targetDoc, remaining)
    if (match) clickSkip(match, video, false)
  }

  const scheduleScan = () => {
    if (scanTimer === undefined) scanTimer = window.setTimeout(scan, SCAN_DELAY_MS)
  }

  const onVideoSeeked = () => {
    const video = trackedVideo
    if (!video || video.seeking) return
    scheduleScan()
    if (targetDoc.location.pathname !== watchPath || video !== getVideo()) return

    const position = video.currentTime
    for (const [kind, outcome] of outcomes) {
      const replaying = 'landedAt' in outcome
        ? position < outcome.landedAt - SEEK_TOLERANCE_SECONDS
        : position < outcome.retryFrom - SEEK_TOLERANCE_SECONDS
      if (replaying) outcomes.delete(kind)
    }

    if (!pending) return
    const distance = position - pending.from
    if (distance > SEEK_TOLERANCE_SECONDS) {
      outcomes.set(pending.kind, { landedAt: position })
      cancelAttempt()
      return
    }
    if (distance < -SEEK_TOLERANCE_SECONDS) cancelAttempt()
  }

  const trackVideo = (video: HTMLVideoElement | null) => {
    if (trackedVideo === video) return
    cancelAttempt()
    trackedVideo?.removeEventListener('seeked', onVideoSeeked)
    trackedVideo = video
    trackedVideo?.addEventListener('seeked', onVideoSeeked)
  }

  const stop = () => {
    observer?.disconnect()
    observer = null
    targetDoc.removeEventListener('transitionend', scheduleScan, true)
    targetDoc.removeEventListener('animationend', scheduleScan, true)
    targetDoc.removeEventListener('playing', scheduleScan, true)
    targetDoc.removeEventListener('seeked', scheduleScan, true)
    trackVideo(null)
    outcomes.clear()
    window.clearTimeout(scanTimer)
    scanTimer = undefined
  }

  const updateSettings = ({ enabled, autoSkip }: ShortcutSettings) => {
    options = autoSkip
    if (pending && !options[pending.kind]) cancelAttempt()
    if (!enabled || (!options.intro && !options.recap)) {
      stop()
      return
    }
    if (!observer) {
      observer = new MutationObserver(scheduleScan)
      observer.observe(targetDoc, {
        subtree: true,
        childList: true,
        characterData: true,
        attributeFilter: [
          'aria-disabled', 'aria-hidden', 'aria-label', 'class', 'data-uia', 'disabled',
          'hidden', 'inert', 'role', 'style',
        ],
      })
      // A newly inserted control may only become visible after its animation.
      targetDoc.addEventListener('transitionend', scheduleScan, true)
      targetDoc.addEventListener('animationend', scheduleScan, true)
      targetDoc.addEventListener('playing', scheduleScan, true)
      targetDoc.addEventListener('seeked', scheduleScan, true)
    }
    scheduleScan()
  }

  return { updateSettings, stop }
}
