import { afterEach, expect, it, vi } from 'vitest'
import { installMediaSessionBridge } from './media-session-bridge'
import { MEDIA_SESSION_ACTION_EVENT, MEDIA_SESSION_RESULT_EVENT, MEDIA_SESSION_SETTINGS_EVENT, readMediaSessionRequest } from '@/shared/media-session-events'

const controllers: AbortController[] = []
afterEach(() => {
  controllers.splice(0).forEach(controller => controller.abort())
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function fixture(install = true) {
  const registered = new Map<MediaSessionAction, MediaSessionActionHandler | null>()
  const original = vi.fn((action: MediaSessionAction, handler: MediaSessionActionHandler | null) => registered.set(action, handler))
  const media = Object.create({ setActionHandler: original }) as MediaSession
  vi.stubGlobal('navigator', Object.create(navigator, { mediaSession: { value: media } }))
  const controller = new AbortController()
  controllers.push(controller)
  if (install) installMediaSessionBridge(controller.signal)
  const configure = (actions: string[]) => window.dispatchEvent(new CustomEvent(MEDIA_SESSION_SETTINGS_EVENT, { detail: JSON.stringify(actions) }))
  const press = (action: MediaSessionAction) => registered.get(action)?.({ action })
  return { media, original, registered, controller, configure, press }
}

it('keeps the original site registration through document-start script reinjection', async () => {
  const f = fixture(false)
  const siteNext = vi.fn()
  try {
    await import('./media-session-bridge.iife')
    const wrapped = f.media.setActionHandler
    f.media.setActionHandler('nexttrack', siteNext)
    f.configure(['nexttrack'])

    vi.resetModules()
    await import('./media-session-bridge.iife')
    expect(f.media.setActionHandler).toBe(wrapped)
    f.press('nexttrack')
    expect(siteNext).toHaveBeenCalledOnce()
    f.configure([])
    expect(f.registered.get('nexttrack')).toBe(siteNext)
  } finally {
    Reflect.get(window, '__shortcutOverrideMediaSessionBridge')?.abort()
    Reflect.deleteProperty(window, '__shortcutOverrideMediaSessionBridge')
  }
})

it('routes hardware previous/next actions and preserves unrelated media controls', () => {
  const f = fixture()
  const next = vi.fn()
  const play = vi.fn()
  f.media.setActionHandler('nexttrack', next)
  f.media.setActionHandler('play', play)
  f.configure(['nexttrack', 'previoustrack'])
  const received: string[] = []
  const accept = (event: Event) => {
    const action = readMediaSessionRequest((event as CustomEvent).detail)!.action
    received.push(action)
    if (action === 'nexttrack' || action === 'previoustrack') event.preventDefault()
  }
  window.addEventListener(MEDIA_SESSION_ACTION_EVENT, accept)
  try {
    f.press('nexttrack')
    f.press('previoustrack')
    f.press('play')
    expect(received).toEqual(['nexttrack', 'previoustrack', 'play'])
    expect(next).not.toHaveBeenCalled()
    expect(play).toHaveBeenCalledOnce()
  } finally { window.removeEventListener(MEDIA_SESSION_ACTION_EVENT, accept) }
})

it('retains Netflix handlers registered later and restores them when disabled or aborted', () => {
  const f = fixture()
  const first = vi.fn()
  const latest = vi.fn()
  f.media.setActionHandler('nexttrack', first)
  f.configure(['nexttrack'])
  f.media.setActionHandler('nexttrack', latest)
  expect(f.registered.get('nexttrack')).not.toBe(latest)
  // Without an accepting playback context, the site handles the action.
  f.press('nexttrack')
  expect(first).not.toHaveBeenCalled()
  expect(latest).toHaveBeenCalledOnce()
  f.configure([])
  expect(f.registered.get('nexttrack')).toBe(latest)
  f.configure(['nexttrack', 'previoustrack'])
  f.controller.abort()
  expect(f.registered.get('nexttrack')).toBe(latest)
  expect(f.registered.get('previoustrack')).toBeNull()
  expect(f.media.setActionHandler).toBe(f.original)
  expect(Object.hasOwn(f.media, 'setActionHandler')).toBe(false)
})

it('ignores malformed settings and tolerates unsupported actions', () => {
  const f = fixture()
  f.original.mockClear()
  for (const detail of ['{', '{}', '["seekto"]', ['nexttrack'], null]) {
    window.dispatchEvent(new CustomEvent(MEDIA_SESSION_SETTINGS_EVENT, { detail }))
  }
  expect(f.original).not.toHaveBeenCalled()
  f.original.mockImplementation(() => { throw new DOMException('Unsupported', 'NotSupportedError') })
  expect(() => f.configure(['nexttrack'])).not.toThrow()
})

it.each(['play', 'pause', 'stop', 'seekforward', 'seekbackward'] as const)(
  'routes configured %s once and restores the latest Netflix handler', action => {
    const f = fixture()
    const first = vi.fn()
    const latest = vi.fn()
    const unrelated = vi.fn()
    f.media.setActionHandler(action, first)
    f.media.setActionHandler('seekto', unrelated)
    f.configure([action])
    f.media.setActionHandler(action, latest)
    const accept = (event: Event) => {
      expect(readMediaSessionRequest((event as CustomEvent).detail)?.action).toBe(action)
      event.preventDefault()
    }
    window.addEventListener(MEDIA_SESSION_ACTION_EVENT, accept)
    try {
      f.press(action)
      expect(first).not.toHaveBeenCalled()
      expect(latest).not.toHaveBeenCalled()
      f.press('seekto')
      expect(unrelated).toHaveBeenCalledOnce()
    } finally { window.removeEventListener(MEDIA_SESSION_ACTION_EVENT, accept) }
    f.press(action)
    expect(latest).toHaveBeenCalledOnce()
    f.controller.abort()
    expect(f.registered.get(action)).toBe(latest)
  },
)

it('releases each deferred request once with its original details to the latest Netflix handler', () => {
  const f = fixture()
  const latest = vi.fn()
  f.configure(['seekforward'])
  const requests: string[] = []
  const accept = (event: Event) => {
    requests.push(readMediaSessionRequest((event as CustomEvent).detail)!.id!)
    event.preventDefault()
  }
  window.addEventListener(MEDIA_SESSION_ACTION_EVENT, accept)
  try {
    const first = { action: 'seekforward', seekOffset: 15 } as const
    const second = { action: 'seekforward', seekOffset: 30 } as const
    f.registered.get('seekforward')?.(first)
    f.registered.get('seekforward')?.(second)
    f.media.setActionHandler('seekforward', latest)
    const respond = (id: string, handled: boolean) => window.dispatchEvent(new CustomEvent(MEDIA_SESSION_RESULT_EVENT, {
      detail: JSON.stringify({ id, handled }),
    }))
    respond(requests[1], false)
    respond(requests[1], false)
    respond(requests[0], true)
    expect(latest).toHaveBeenCalledExactlyOnceWith(second)
  } finally { window.removeEventListener(MEDIA_SESSION_ACTION_EVENT, accept) }
})

it('restores temporarily observed playback handlers when a deferred request is aborted', () => {
  const f = fixture()
  const nativePlay = vi.fn()
  const nativePause = vi.fn()
  f.media.setActionHandler('play', nativePlay)
  f.media.setActionHandler('pause', nativePause)
  f.configure(['play'])
  const accept = (event: Event) => event.preventDefault()
  window.addEventListener(MEDIA_SESSION_ACTION_EVENT, accept)
  try {
    f.press('play')
    expect(f.registered.get('pause')).not.toBe(nativePause)
    f.controller.abort()
    expect(f.registered.get('play')).toBe(nativePlay)
    expect(f.registered.get('pause')).toBe(nativePause)
    expect(nativePlay).not.toHaveBeenCalled()
  } finally { window.removeEventListener(MEDIA_SESSION_ACTION_EVENT, accept) }
})
