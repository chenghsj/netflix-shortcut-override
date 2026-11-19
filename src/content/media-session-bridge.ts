import { MEDIA_SESSION_ACTION_EVENT, MEDIA_SESSION_ACTIONS, MEDIA_SESSION_READY_EVENT, MEDIA_SESSION_RESULT_EVENT, MEDIA_SESSION_SETTINGS_EVENT, isSupportedMediaSessionAction, type SupportedMediaSessionAction } from '@/shared/media-session-events'

// Install in MAIN before Netflix registers handlers, so disabling the extension
// can restore the latest site handler, including registrations made during SPA
// navigation. Observe native playback and relative seeks while routing is active:
// a Stop can arrive between a key notification and its later media partner.
export function installMediaSessionBridge(signal: AbortSignal) {
  const media = navigator.mediaSession
  if (!media?.setActionHandler) return
  const original = media.setActionHandler
  const ownDescriptor = Object.getOwnPropertyDescriptor(media, 'setActionHandler')
  const handlers = new Map<SupportedMediaSessionAction, MediaSessionActionHandler | null>()
  const enabled = new Set<SupportedMediaSessionAction>()
  const requests = new Map<string, { action: SupportedMediaSessionAction; details: MediaSessionActionDetails; timer: number }>()
  const observedActions: readonly SupportedMediaSessionAction[] = ['play', 'pause', 'stop', 'seekforward', 'seekbackward']
  const observesNativeInput = (action: SupportedMediaSessionAction) => !signal.aborted && observedActions.includes(action) &&
    Boolean(handlers.get(action)) && (enabled.size > 0 || [...requests.values()].some(request => observedActions.includes(request.action)))
  function refreshNativeHandlers() {
    for (const action of observedActions) update(action)
  }
  const complete = (id: string, handled: boolean) => {
    const request = requests.get(id)
    if (!request) return
    requests.delete(id)
    window.clearTimeout(request.timer)
    refreshNativeHandlers()
    if (!handled) handlers.get(request.action)?.(request.details)
  }
  const createHandler = (action: SupportedMediaSessionAction): MediaSessionActionHandler => details => {
    const id = crypto.randomUUID()
    // Content may wait for a keyboard partner. Retain the original browser
    // details so it can release this exact action to Netflix after that wait.
    const timer = window.setTimeout(() => complete(id, true), 1000)
    requests.set(id, { action, details, timer })
    const event = new CustomEvent(MEDIA_SESSION_ACTION_EVENT, {
      detail: JSON.stringify({ id, action }), cancelable: true,
    })
    // Preventing the event claims the request for immediate or deferred routing.
    // A released request retains Netflix's original browser-supplied details.
    if (window.dispatchEvent(event)) complete(id, false)
    else refreshNativeHandlers()
  }
  const update = (action: SupportedMediaSessionAction) => {
    try { original.call(media, action, enabled.has(action) || observesNativeInput(action) ? createHandler(action) : handlers.get(action) ?? null) }
    catch { /* A browser can expose MediaSession but not this action. */ }
  }
  const wrapped: MediaSession['setActionHandler'] = (action, handler) => {
    if (!isSupportedMediaSessionAction(action)) return original.call(media, action, handler)
    handlers.set(action, handler)
    if (enabled.has(action) || observesNativeInput(action)) update(action)
    else original.call(media, action, handler)
  }
  try { media.setActionHandler = wrapped }
  catch { return }
  window.addEventListener(MEDIA_SESSION_RESULT_EVENT, event => {
    const detail = (event as CustomEvent).detail
    if (typeof detail !== 'string') return
    try {
      const value: unknown = JSON.parse(detail)
      if (value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' &&
        'handled' in value && typeof value.handled === 'boolean') complete(value.id, value.handled)
    } catch { /* Ignore malformed page events. */ }
  }, { signal })
  window.addEventListener(MEDIA_SESSION_SETTINGS_EVENT, event => {
    const detail = (event as CustomEvent).detail
    if (typeof detail !== 'string') return
    let requested: unknown
    try { requested = JSON.parse(detail) } catch { return }
    if (!Array.isArray(requested) || !requested.every(isSupportedMediaSessionAction)) return
    for (const action of MEDIA_SESSION_ACTIONS) {
      const active = requested.includes(action)
      if (active === enabled.has(action)) continue
      if (active) enabled.add(action)
      else enabled.delete(action)
      update(action)
    }
    refreshNativeHandlers()
  }, { signal })
  signal.addEventListener('abort', () => {
    for (const request of requests.values()) window.clearTimeout(request.timer)
    requests.clear()
    for (const action of new Set([...enabled, ...observedActions.filter(action => handlers.has(action))])) {
      enabled.delete(action)
      update(action)
    }
    if (media.setActionHandler !== wrapped) return
    if (ownDescriptor) Object.defineProperty(media, 'setActionHandler', ownDescriptor)
    else Reflect.deleteProperty(media, 'setActionHandler')
  }, { once: true })
  window.dispatchEvent(new Event(MEDIA_SESSION_READY_EVENT))
}
