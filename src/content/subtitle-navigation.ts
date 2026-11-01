import { findVideo } from './dom-utils'
import { normalizeNetflixTimedText } from '@/shared/netflix-subtitles'
import { subtitleStarts, subtitleTarget, SUBTITLE_NAVIGATION_FAILURE_COPY, type SubtitleNavigationFailureCode, SUBTITLE_NAVIGATION_COPY, type SubtitleNavigationAction } from '@/shared/subtitle-navigation'
import { resolveLocalePreference } from '@/shared/browser-locale'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import type { NetflixPlaybackSession } from './netflix-playback-session'
import { getHintManager, type HintManager, type HintRequest } from './hints/hint-manager'
import { CAPTION_REQUEST_EVENT, CAPTION_RESPONSE_EVENT, readCaptionEvent } from '@/shared/netflix-caption-events'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { sendNetflixApi } from './netflix-api-client'

type Metadata = { key: string; watchId: string; url: string; currentMs: number }
class SubtitleNavigationFailure extends Error {
  diagnostic?: string
  readonly code: SubtitleNavigationFailureCode
  constructor(code: SubtitleNavigationFailureCode) { super(code); this.code = code }
}
let requestId = 0
export function requestCaptionMetadata(signal?: AbortSignal): Promise<Metadata> {
  return new Promise((resolve, reject) => {
    const id = `caption-${Date.now()}-${++requestId}`
    const cleanup = () => { window.clearTimeout(timer); window.removeEventListener(CAPTION_RESPONSE_EVENT, handler); signal?.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(new SubtitleNavigationFailure('bridge')) }
    const deliver = (value: unknown, error: unknown) => {
      cleanup()
      const metadata = value as Partial<Metadata> | null | undefined
      if (!metadata || typeof metadata.key !== 'string' || typeof metadata.watchId !== 'string' || typeof metadata.url !== 'string' || typeof metadata.currentMs !== 'number' || !Number.isFinite(metadata.currentMs)) {
        reject(new SubtitleNavigationFailure(typeof error === 'string' && ['watch', 'player', 'track', 'document'].includes(error) ? error as SubtitleNavigationFailureCode : 'bridge'))
      } else resolve(metadata as Metadata)
    }
    const handler = (event: Event) => {
      const detail = readCaptionEvent(event)
      if (detail?.id === id) deliver(detail.metadata, detail.error)
    }
    const timer = window.setTimeout(() => { cleanup(); reject(new SubtitleNavigationFailure('bridge')) }, 1000)
    if (signal?.aborted) { abort(); return }
    signal?.addEventListener('abort', abort, { once: true })
    if (!getBrowserCapabilities().requiresNetflixPageBridge) {
      // Firefox playback commands already use MAIN-world background injection.
      // Do not depend on a dynamically imported page bridge for metadata either.
      void sendNetflixApi('getCaptionMetadata').then(
        response => deliver(response.success ? response.result?.captionMetadata : null, response.result?.error),
        () => deliver(null, 'bridge'),
      )
      return
    }
    window.addEventListener(CAPTION_RESPONSE_EVENT, handler)
    window.dispatchEvent(new CustomEvent(CAPTION_REQUEST_EVENT, { detail: JSON.stringify({ source: 'shortcut-override', id }) }))
  })
}

function fetchCaption(url: string, watchId: string, signal: AbortSignal): Promise<{ text?: string; error?: boolean }> {
  return new Promise((resolve, reject) => {
    const cleanup = () => { window.clearTimeout(timer); signal.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); reject(new SubtitleNavigationFailure('download')) }
    const timer = window.setTimeout(() => { cleanup(); reject(new SubtitleNavigationFailure('timeout')) }, 12_000)
    if (signal.aborted) { abort(); return }
    signal.addEventListener('abort', abort, { once: true })
    Promise.resolve(chrome.runtime.sendMessage({ type: 'FETCH_NETFLIX_CAPTION', url, watchId }))
      .then(response => {
        cleanup()
        if (response?.error || typeof response?.text !== 'string') {
          const failure = new SubtitleNavigationFailure(response?.code === 'CAPTION_PERMISSION_REQUIRED' ? 'permission' : response?.code === 'CAPTION_TIMEOUT' ? 'timeout' : 'download')
          if (typeof response?.code === 'string' && /^(CAPTION_[A-Z0-9_]+|VIDEO_CHANGED)$/.test(response.code)) failure.diagnostic = response.code
          reject(failure)
        }
        else resolve(response)
      }, () => { cleanup(); reject(new SubtitleNavigationFailure('download')) })
  })
}

export function createSubtitleNavigation(getSettings: () => ShortcutSettings, session: NetflixPlaybackSession, onSeek: () => void) {
  let cache: { key: string; starts: number[] } | null = null
  let busy = false
  let token = 0
  let pending: AbortController | null = null
  let pendingAction: Exclude<SubtitleNavigationAction, 'playback'> | null = null
  const cancel = () => { token++; pending?.abort() }
  return {
    cancel,
    updateSettings(nextSettings: ShortcutSettings) {
      if (!nextSettings.enabled || !nextSettings.subtitleNavigation.enabled ||
        (pendingAction && !nextSettings.subtitleNavigation.bindings[pendingAction].enabled)) cancel()
    },
    async execute(action: Exclude<SubtitleNavigationAction, 'playback'>, targetDoc: Document) {
      if (busy) return
      busy = true
      pendingAction = action
      const currentToken = ++token
      pending = new AbortController()
      const signal = pending.signal
      const targetWindow = targetDoc.defaultView
      // A late response must not act on the source video after its PiP closes.
      targetWindow?.addEventListener('pagehide', cancel, { once: true })
      const locale = resolveLocalePreference(getSettings().locale)
      let loadingFeedback: { manager: HintManager; request: HintRequest } | null = null
      const dismissLoading = () => {
        if (!loadingFeedback) return
        loadingFeedback.manager.dismiss(loadingFeedback.request)
        loadingFeedback = null
      }
      const hint = (label: string) => getHintManager(targetDoc).show({ type: 'text', label })
      const active = () => {
        const settings = getSettings()
        return currentToken === token && targetWindow?.closed !== true && settings.enabled && settings.subtitleNavigation.enabled && settings.subtitleNavigation.bindings[action].enabled
      }
      const videoAtStart = findVideo(targetDoc)
      // Native media events don't bubble. Capture them on the documents so
      // replacement videos and the PiP source-video fallback remain covered.
      const playbackDocuments = targetDoc === document ? [targetDoc] : [targetDoc, document]
      const onPlaybackChange = (event: Event) => {
        if (event.target === videoAtStart || event.target === findVideo(targetDoc)) cancel()
      }
      for (const doc of playbackDocuments) {
        doc.addEventListener('play', onPlaybackChange, true)
        doc.addEventListener('pause', onPlaybackChange, true)
      }
      const stopObservingPlayback = () => {
        for (const doc of playbackDocuments) {
          doc.removeEventListener('play', onPlaybackChange, true)
          doc.removeEventListener('pause', onPlaybackChange, true)
        }
      }
      try {
        const metadata = await requestCaptionMetadata(signal)
        if (!active()) return
        if (cache?.key !== metadata.key) {
          cache = null
          const manager = getHintManager(targetDoc)
          const request: HintRequest = { type: 'text', label: SUBTITLE_NAVIGATION_COPY[locale].loading, durationMs: null, loading: true }
          loadingFeedback = { manager, request }
          manager.show(request)
          const response = await fetchCaption(metadata.url, metadata.watchId, signal)
          dismissLoading()
          let starts: number[]
          try { starts = subtitleStarts(normalizeNetflixTimedText(response.text ?? '')) }
          catch { throw new SubtitleNavigationFailure('parse') }
          if (!starts.length) throw new SubtitleNavigationFailure('parse')
          if (!active()) return
          cache = { key: metadata.key, starts }
        }
        const latest = await requestCaptionMetadata(signal)
        if (!active() || latest.key !== metadata.key) return
        const target = subtitleTarget(cache.starts, latest.currentMs, action)
        if (target === null) return
        onSeek()
        const result = await session.seekTo(target)
        if (!active()) return
        if (result.failureLabel) throw new SubtitleNavigationFailure('seek')
        if (action === 'replay') {
          const check = await requestCaptionMetadata(signal)
          if (!active() || check.key !== metadata.key) return
          const video = findVideo(targetDoc)
          if (!video) return
          // The replay's own play event must not cancel its completion.
          stopObservingPlayback()
          const played = await session.play(video)
          if (played.failureLabel) throw new SubtitleNavigationFailure('seek')
        }
      } catch (error) {
        if (active()) {
          const label = SUBTITLE_NAVIGATION_FAILURE_COPY[locale][error instanceof SubtitleNavigationFailure ? error.code : 'download']
          hint(error instanceof SubtitleNavigationFailure && error.diagnostic ? `${label} (${error.diagnostic})` : label)
        }
      } finally {
        dismissLoading()
        stopObservingPlayback()
        targetWindow?.removeEventListener('pagehide', cancel)
        busy = false
        pending = null
        pendingAction = null
      }
    },
  }
}
