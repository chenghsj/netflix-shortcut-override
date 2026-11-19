import { canHandlePlaybackShortcut, findVideo, getTargetDocument, interceptShortcutEvent, isTypingTarget } from './dom-utils'
import type { PlaybackIntent, ShortcutRequest } from './shortcuts/shortcut-command-types'
import type { createPlaybackRequestArbiter, PlaybackEffect } from './shortcuts/playback-request-arbiter'
import { resolvePlaybackShortcut } from '@/shared/shortcut-routing'
import { getBindingKeys, keyBindingFromEvent } from '@/shared/shortcut-bindings'
import { resolveSeekShortcut } from '@/shared/seek-shortcuts'
import type { KeyBinding, ShortcutSettings } from '@/shared/shortcut-types'
import {
  MEDIA_SESSION_ACTION_EVENT, MEDIA_SESSION_ACTIONS, MEDIA_SESSION_KEYS, MEDIA_SESSION_READY_EVENT,
  MEDIA_SESSION_RESULT_EVENT, MEDIA_SESSION_SETTINGS_EVENT, readMediaSessionRequest,
  type SupportedMediaSessionAction,
} from '@/shared/media-session-events'

export const MEDIA_KEY_PAIR_WINDOW_MS = 120

type MediaKeyContext = ShortcutRequest & {
  targetDoc: Document
  video: HTMLVideoElement | null
  watchPath: string
  pictureInPicture?: boolean
}
type MediaKeyNotification = MediaKeyContext & {
  source: 'keyboard' | 'mediaSession'
  keys: readonly string[]
  handled: boolean
}
type PendingMediaSessionAction = MediaKeyContext & {
  action: SupportedMediaSessionAction
  video: HTMLVideoElement
  keys: readonly string[]
  timer: number
  requestId?: string
}

export const getPlaybackIntent = (mediaAction?: SupportedMediaSessionAction, code?: string): PlaybackIntent => {
  const intent = mediaAction ?? (code === 'MediaPlay' ? 'play'
    : code === 'MediaPause' || code === 'MediaStop' ? 'pause' : undefined)
  return intent === 'play' ? 'play' : intent === 'pause' || intent === 'stop' ? 'pause' : 'toggle'
}

type MediaSessionRoutingOptions = {
  // Null while the content entry point is still loading saved settings.
  getSettings: () => ShortcutSettings | null
  getPlaybackDocument: () => Document
  supportsPictureInPicture: (targetDoc: Document) => boolean
  isPipDocument: (targetDoc: Document) => boolean
  createRequest: () => ShortcutRequest
  routeKeydown: (
    event: KeyboardEvent, targetDoc: Document, action: SupportedMediaSessionAction | undefined, request: ShortcutRequest,
  ) => void
  onPlaybackEffect: (effect: PlaybackEffect, request: ShortcutRequest) => void
  onWatchChanged: () => void
  playbackRequests: ReturnType<typeof createPlaybackRequestArbiter>
}

// Own notification pairing, standalone deadlines and native acknowledgments.
// Playback decisions stay in the arbiter; executing a selected shortcut stays
// with the caller, which receives the first notification's request context.
export function createMediaSessionRouting(options: MediaSessionRoutingOptions) {
  const playbackRequests = options.playbackRequests
  let mediaSessionWatchPath: string | null = null
  const mediaKeyNotifications = new Set<MediaKeyNotification>()
  const pendingMediaSessionActions = new Set<PendingMediaSessionAction>()
  const mediaKeyNames = new Set<string>(Object.values(MEDIA_SESSION_KEYS).flat())
  // Media Session belongs to the Netflix source page even when keys target PiP.
  const mediaSessionDocument = document
  const isTypingInPlaybackContext = (targetDoc: Document) =>
    isTypingTarget(targetDoc) || (targetDoc !== mediaSessionDocument &&
      mediaSessionDocument.hasFocus() && isTypingTarget(mediaSessionDocument))
  const completeMediaSessionAction = (id: string | undefined, handled = true) => {
    if (id) window.dispatchEvent(new CustomEvent(MEDIA_SESSION_RESULT_EVENT, { detail: JSON.stringify({ id, handled }) }))
  }
  const cancelPendingMediaSessionAction = (pending: PendingMediaSessionAction) => {
    window.clearTimeout(pending.timer)
    pendingMediaSessionActions.delete(pending)
    completeMediaSessionAction(pending.requestId)
    playbackRequests.discard(pending)
  }
  const clearMediaKeyNotifications = (preservePipTransition = false) => {
    playbackRequests.clear()
    for (const notification of mediaKeyNotifications) {
      if (!preservePipTransition || !notification.pictureInPicture ||
        performance.now() - notification.time >= MEDIA_KEY_PAIR_WINDOW_MS) mediaKeyNotifications.delete(notification)
    }
    for (const pending of pendingMediaSessionActions) cancelPendingMediaSessionAction(pending)
  }
  const matchesMediaKeyContext = (notification: MediaKeyContext, targetDoc: Document, time: number) => {
    // A PiP toggle moves focus and the video between documents. Its two input
    // notifications still belong to the source page's one toggle operation.
    const contextDoc = notification.pictureInPicture &&
      (targetDoc === mediaSessionDocument || options.isPipDocument(targetDoc)) ? mediaSessionDocument : targetDoc
    return notification.targetDoc === contextDoc && notification.watchPath === mediaSessionDocument.location.pathname &&
      time - notification.time >= 0 && time - notification.time < MEDIA_KEY_PAIR_WINDOW_MS
  }
  const findMatchingMediaKeyNotification = (
    source: MediaKeyNotification['source'], keys: readonly string[], targetDoc: Document, time: number,
  ) => {
    const now = performance.now()
    let match: MediaKeyNotification | undefined
    for (const notification of mediaKeyNotifications) {
      if (now - notification.time >= MEDIA_KEY_PAIR_WINDOW_MS || notification.targetDoc.defaultView?.closed === true ||
        notification.watchPath !== mediaSessionDocument.location.pathname) {
        mediaKeyNotifications.delete(notification)
        continue
      }
      if (notification.source !== source && keys.some(key => notification.keys.includes(key)) &&
        matchesMediaKeyContext(notification, targetDoc, time) && (!match || notification.order < match.order)) match = notification
    }
    return match
  }
  const isMediaSessionWatchPath = (path: string) => /^\/watch\/[^/]+/.test(path)
  const hasKeyModifiers = (key: KeyBinding) => key.ctrl || key.alt || key.shift || key.meta
  const isPlaybackShortcut = (shortcut: ReturnType<typeof resolvePlaybackShortcut>) =>
    (shortcut?.group === 'general' && shortcut.action === 'playPause') ||
    (shortcut?.group === 'subtitleNavigation' && shortcut.action === 'playback')
  const shortcutEffect = (shortcut: ReturnType<typeof resolvePlaybackShortcut>, code: string): PlaybackEffect | undefined => {
    const settings = options.getSettings()
    if (isPlaybackShortcut(shortcut)) return getPlaybackIntent(undefined, code)
    if (shortcut?.group === 'subtitleNavigation') return 'seek'
    if (shortcut?.group === 'general' && (['seekBackward', 'seekForward', 'previousFrame', 'nextFrame', 'skipIntro'].includes(shortcut.action) ||
      (settings && resolveSeekShortcut(settings, shortcut.action)))) return 'seek'
  }
  const nativeMediaEffect = (action: SupportedMediaSessionAction): PlaybackEffect | undefined =>
    action === 'play' ? 'play' : action === 'pause' || action === 'stop' ? 'pause'
      : action === 'seekforward' || action === 'seekbackward' ? 'seek' : undefined
  const releaseMediaSessionAction = (request: MediaKeyContext, action: SupportedMediaSessionAction, requestId?: string) => {
    const effect = nativeMediaEffect(action)
    if (effect) options.onPlaybackEffect(effect, request)
    const hadMetadata = Boolean(request.video && request.video.readyState >= HTMLMediaElement.HAVE_METADATA)
    if (effect && effect !== 'seek') playbackRequests.dispatch(request, effect, () => {
      const valid = options.getSettings()?.enabled && chrome.runtime?.id && mediaSessionDocument.location.pathname === request.watchPath &&
        request.targetDoc.defaultView?.closed !== true && !isTypingInPlaybackContext(request.targetDoc) && findVideo(request.targetDoc) === request.video &&
        (!hadMetadata || request.video!.readyState >= HTMLMediaElement.HAVE_METADATA)
      completeMediaSessionAction(requestId, !valid)
    }, () => completeMediaSessionAction(requestId))
    else completeMediaSessionAction(requestId, false)
  }
  const getConfiguredMediaBindings = (targetDoc: Document = mediaSessionDocument): KeyBinding[] => {
    const settings = options.getSettings()
    if (!settings?.enabled) return []
    const bindings = [...Object.values(settings.bindings),
      ...Object.values(settings.subtitleNavigation.enabled ? settings.subtitleNavigation.bindings : {})]
    return bindings.filter(binding => binding.enabled).flatMap(binding => getBindingKeys(binding).flatMap(saved => {
      const event = new KeyboardEvent('keydown', { code: saved.code, key: saved.key,
        ctrlKey: saved.ctrl, altKey: saved.alt, shiftKey: saved.shift, metaKey: saved.meta })
      const key = keyBindingFromEvent(event)
      return mediaKeyNames.has(key.code) && resolvePlaybackShortcut(settings, event, options.supportsPictureInPicture(targetDoc))?.supported ? [key] : []
    }))
  }
  const syncMediaSessionControls = (force = false) => {
    const path = mediaSessionDocument.location?.pathname
    if (!path || (!force && mediaSessionWatchPath === path)) return
    if (mediaSessionWatchPath !== null && mediaSessionWatchPath !== path) {
      options.onWatchChanged()
      clearMediaKeyNotifications()
    }
    mediaSessionWatchPath = path
    const bindings = isMediaSessionWatchPath(path) ? getConfiguredMediaBindings() : []
    const actions = MEDIA_SESSION_ACTIONS.filter(action => bindings.some(binding =>
      MEDIA_SESSION_KEYS[action].some(key => key === binding.code)))
    window.dispatchEvent(new CustomEvent(MEDIA_SESSION_SETTINGS_EVENT, { detail: JSON.stringify(actions) }))
  }
  const onMediaSessionReady = () => syncMediaSessionControls(true)
  // Netflix navigates between titles without reloading. DOM notifications are
  // frequent, but the synchronizer only recalculates when the watch path changes.
  const handleKeydown = (
    event: KeyboardEvent,
    explicitTargetDoc?: Document,
    mediaAction?: SupportedMediaSessionAction,
    request = options.createRequest(),
  ) => {
    const targetDoc = explicitTargetDoc ?? getTargetDocument(event)
    const key = keyBindingFromEvent(event)
    const mediaKey = mediaKeyNames.has(key.code)
    if (!mediaKey) { options.routeKeydown(event, targetDoc, mediaAction, request); return }
    const settings = options.getSettings()
    if (!settings) { options.routeKeydown(event, targetDoc, mediaAction, request); return }
    const source = mediaAction ? 'mediaSession' : 'keyboard'
    const canPair = chrome.runtime?.id && settings.enabled &&
      !isTypingTarget(targetDoc) && canHandlePlaybackShortcut(targetDoc)
    const pending = canPair && !mediaAction ? [...pendingMediaSessionActions].find(pending =>
      pending.keys.includes(key.code) && matchesMediaKeyContext(pending, targetDoc, request.time)) : undefined
    const previous = findMatchingMediaKeyNotification(source, [key.code], targetDoc, request.time)
    // Pair two notifications for one press, without debouncing repeats from the
    // same source. There is no shared event ID between keyboard and Media Session.
    const duplicate = previous && (!pending || previous.order < pending.order)
    if (duplicate && canPair) {
      mediaKeyNotifications.delete(previous)
      if (previous.handled) interceptShortcutEvent(event)
      return
    }
    const shortcut = resolvePlaybackShortcut(settings, event, options.supportsPictureInPicture(targetDoc))
    const pictureInPicture = shortcut?.group === 'general' && shortcut.action === 'pictureInPicture'
    // Detach the partner before routing: a seek or toggle can cancel older
    // pending playback, but must not leave a canceled receipt for this paired key.
    if (pending) {
      window.clearTimeout(pending.timer)
      pendingMediaSessionActions.delete(pending)
    }
    const origin = pending || request
    let effect: PlaybackEffect | undefined
    if (shortcut?.supported) {
      effect = mediaAction && isPlaybackShortcut(shortcut)
        ? getPlaybackIntent(mediaAction, key.code) : shortcutEffect(shortcut, key.code)
    } else if (pending) effect = nativeMediaEffect(pending.action)
    if (pending && (findVideo(targetDoc) !== pending.video || pending.video.readyState < HTMLMediaElement.HAVE_METADATA)) {
      interceptShortcutEvent(event)
      completeMediaSessionAction(pending.requestId)
      playbackRequests.discard(pending)
      return
    }
    if (effect && effect !== 'seek' && playbackRequests.superseded(origin, effect)) {
      options.onPlaybackEffect(effect, origin)
      interceptShortcutEvent(event)
      completeMediaSessionAction(pending?.requestId)
      playbackRequests.settle(origin, () => {})
      return
    }
    playbackRequests.settle(origin, () => {
      options.routeKeydown(event, targetDoc, mediaAction, origin)
      if (pending) {
        if (event.defaultPrevented) completeMediaSessionAction(pending.requestId)
        else releaseMediaSessionAction(pending, pending.action, pending.requestId)
      }
    })
    if (event.defaultPrevented || (!mediaAction && canPair)) {
      // A pending partner completes this pair; otherwise retain this notification
      // independently so interleaved keys and repeated presses can each match once.
      if (!pending) mediaKeyNotifications.add({
        source, keys: [key.code], targetDoc: pictureInPicture ? mediaSessionDocument : targetDoc, video: findVideo(targetDoc),
        pictureInPicture, watchPath: mediaSessionDocument.location.pathname, time: request.time, order: request.order,
        handled: event.defaultPrevented,
      })
    }
  }

  const handleMediaSessionAction = (event: Event) => {
    const settings = options.getSettings()
    if (!settings) return
    const request = readMediaSessionRequest((event as CustomEvent).detail)
    if (!request || !isMediaSessionWatchPath(mediaSessionDocument.location.pathname)) return
    const { action, id: requestId } = request
    const receipt = options.createRequest()
    const { time, order } = receipt
    const targetDoc = options.getPlaybackDocument()
    const video = findVideo(targetDoc)
    const nativePlaybackIntent = nativeMediaEffect(action)
    const candidates: readonly string[] = MEDIA_SESSION_KEYS[action]
    const partner = findMatchingMediaKeyNotification('mediaSession', candidates, targetDoc, time)
    if (partner) {
      mediaKeyNotifications.delete(partner)
      event.preventDefault()
      if (partner.handled) completeMediaSessionAction(requestId)
      else releaseMediaSessionAction(partner, action, requestId)
      return
    }
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA || isTypingInPlaybackContext(targetDoc)) {
      if (nativePlaybackIntent) options.onPlaybackEffect(nativePlaybackIntent, receipt)
      return
    }
    const bindings = getConfiguredMediaBindings(targetDoc).filter(binding => candidates.includes(binding.code))
    if (!bindings.length) {
      if (nativePlaybackIntent) options.onPlaybackEffect(nativePlaybackIntent, receipt)
      return
    }
    const plainKeys = candidates.filter(key => bindings.some(binding => binding.code === key && !hasKeyModifiers(binding)))
    const key = plainKeys[0]
    const effects = bindings.flatMap(binding => {
      const event = new KeyboardEvent('keydown', { code: binding.code, key: binding.key,
        ctrlKey: binding.ctrl, altKey: binding.alt, shiftKey: binding.shift, metaKey: binding.meta })
      const effect = shortcutEffect(resolvePlaybackShortcut(settings, event, options.supportsPictureInPicture(targetDoc)), binding.code)
      return effect ? [effect] : []
    })
    playbackRequests.registerPending(receipt, nativePlaybackIntent ? [...effects, nativePlaybackIntent] : effects)
    // Media Session never identifies modifiers or whether a separate/combined key
    // produced the action. Every unmatched action gives the actual keyboard key
    // a pairing window, even when that key or combination is not assigned.
    const pending: PendingMediaSessionAction = {
      keys: candidates, action, video, targetDoc, watchPath: mediaSessionDocument.location.pathname, time, order, timer: 0, requestId,
    }
    pending.timer = window.setTimeout(() => {
      if (!pendingMediaSessionActions.delete(pending)) return
      if (mediaSessionDocument.location.pathname !== pending.watchPath || targetDoc.defaultView?.closed === true ||
        findVideo(targetDoc) !== video || video.readyState < HTMLMediaElement.HAVE_METADATA || isTypingInPlaybackContext(targetDoc)) {
        completeMediaSessionAction(requestId)
        playbackRequests.discard(pending)
        return
      }
      if (!key) {
        playbackRequests.settle(pending, () => releaseMediaSessionAction(pending, action, requestId))
        return
      }
      const press = new KeyboardEvent('keydown', { key, cancelable: true })
      handleKeydown(press, targetDoc, action, pending)
      completeMediaSessionAction(requestId, press.defaultPrevented)
    }, MEDIA_KEY_PAIR_WINDOW_MS)
    pendingMediaSessionActions.add(pending)
    event.preventDefault()
  }

  const mediaSessionObserver = new MutationObserver(() => syncMediaSessionControls())
  mediaSessionObserver.observe(document, { childList: true, subtree: true })
  window.addEventListener(MEDIA_SESSION_ACTION_EVENT, handleMediaSessionAction)
  window.addEventListener(MEDIA_SESSION_READY_EVENT, onMediaSessionReady)

  return {
    handleKeydown,
    clear: clearMediaKeyNotifications,
    sync: () => syncMediaSessionControls(true),
    destroy() {
      clearMediaKeyNotifications()
      mediaSessionObserver.disconnect()
      window.removeEventListener(MEDIA_SESSION_ACTION_EVENT, handleMediaSessionAction)
      window.removeEventListener(MEDIA_SESSION_READY_EVENT, onMediaSessionReady)
      window.dispatchEvent(new CustomEvent(MEDIA_SESSION_SETTINGS_EVENT, { detail: '[]' }))
    },
  }
}
