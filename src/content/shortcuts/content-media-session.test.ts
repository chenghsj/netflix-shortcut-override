import { afterEach, describe, expect, it, vi } from 'vitest'
import { installMediaSessionBridge } from '@/content/media-session-bridge'
import { PipManager } from '@/content/pip/pip-manager'
import { keyBindingFromEvent } from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { setupContentIndexTests } from './content-script.test-support'

const controls = ['play', 'pause', 'stop', 'seekforward', 'seekbackward', 'nexttrack', 'previoustrack'] as const
const lifetimes: AbortController[] = []
const mediaDescriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
const key = (name: string, modifiers: KeyboardEventInit = {}) => keyBindingFromEvent(new KeyboardEvent('keydown', { key: name, ...modifiers }))
let captionFixtureId = 0

function mockCaptions(delay = 0) {
  const metadata = { key: `123:player:media-regression-${++captionFixtureId}`, watchId: '123',
    url: 'https://a.nflxvideo.net/sub.vtt', currentMs: 3500 }
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
    if ((message as { type?: string }).type === 'FETCH_NETFLIX_CAPTION') return new Promise(resolve => window.setTimeout(() => resolve({
      text: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:06.000 --> 00:00:07.000\nThree',
    }), delay)) as never
    const response = { success: true, result: { seekCalled: true } }
    if (typeof callback === 'function') callback(response)
    return Promise.resolve(response) as never
  })
  const respond = (event: Event) => window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', {
    detail: JSON.stringify({ source: 'shortcut-override', id: JSON.parse((event as CustomEvent<string>).detail).id, metadata }),
  }))
  window.addEventListener('shortcut-override:caption-request', respond)
  return () => window.removeEventListener('shortcut-override:caption-request', respond)
}

async function fixture(settings: ShortcutSettings) {
  await saveSettings(settings)
  document.body.innerHTML = '<video></video><input />'
  const video = document.querySelector('video')!
  let paused = true
  Object.defineProperties(video, {
    paused: { configurable: true, get: () => paused },
    readyState: { configurable: true, value: HTMLMediaElement.HAVE_METADATA },
  })
  const play = vi.spyOn(video, 'play').mockImplementation(async () => { paused = false })
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => { paused = true })
  const registered = new Map<MediaSessionAction, MediaSessionActionHandler | null>()
  const media = { setActionHandler: (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    registered.set(action, handler)
  } }
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: media })
  const lifetime = new AbortController()
  lifetimes.push(lifetime)
  installMediaSessionBridge(lifetime.signal)
  const native = Object.fromEntries(controls.map(action => {
    const handler = vi.fn()
    media.setActionHandler(action, handler)
    return [action, handler]
  })) as Record<typeof controls[number], ReturnType<typeof vi.fn>>
  const press = (action: typeof controls[number]) => registered.get(action)?.({ action })
  const keyboard = (name: string, repeat = false, modifiers: KeyboardEventInit = {}) => {
    const event = new KeyboardEvent('keydown', { key: name, repeat, cancelable: true, ...modifiers })
    window.dispatchEvent(event)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: name, cancelable: true, ...modifiers }))
    return event
  }
  vi.mocked(chrome.runtime.sendMessage).mockClear()
  return { video, play, pause, native, press, keyboard }
}

describe('configured Media Session controls', () => {
  setupContentIndexTests()
  afterEach(async () => {
    lifetimes.splice(0).forEach(lifetime => lifetime.abort())
    vi.restoreAllMocks()
    if (mediaDescriptor) Object.defineProperty(navigator, 'mediaSession', mediaDescriptor)
    else Reflect.deleteProperty(navigator, 'mediaSession')
    window.history.replaceState(null, '', '/watch/123')
    await saveSettings(DEFAULT_SETTINGS)
  })

  it.each(['ctrlKey', 'altKey', 'shiftKey', 'metaKey'] as const)(
    'releases an unassigned %s combination with only a plain binding in both arrival orders', async modifier => {
      for (const order of ['keyboard first', 'media first'] as const) {
        const settings = structuredClone(DEFAULT_SETTINGS)
        settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext')]
        const f = await fixture(settings)
        vi.useFakeTimers()
        if (order === 'keyboard first') f.keyboard('MediaTrackNext', false, { [modifier]: true })
        else f.press('nexttrack')
        vi.advanceTimersByTime(10)
        if (order === 'keyboard first') f.press('nexttrack')
        else expect(f.keyboard('MediaTrackNext', false, { [modifier]: true }).defaultPrevented).toBe(false)
        vi.advanceTimersByTime(120)
        expect(f.video.volume).toBe(1)
        expect(f.native.nexttrack).toHaveBeenCalledOnce()
        window.dispatchEvent(new Event('blur'))
      }
    },
  )

  it.each([
    { name: 'MediaPlay', action: 'play' },
    { name: 'MediaPause', action: 'pause' },
  ] as const)('pairs unassigned $name even when only the combined key is configured', async ({ name, action }) => {
    for (const order of ['keyboard first', 'media first'] as const) {
      for (const ctrlKey of [false, true]) {
        const settings = structuredClone(DEFAULT_SETTINGS)
        settings.bindings.volumeDown.additionalKeys = [key('MediaPlayPause')]
        settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
        const f = await fixture(settings)
        vi.useFakeTimers()
        if (order === 'keyboard first') f.keyboard(name, false, { ctrlKey })
        else f.press(action)
        vi.advanceTimersByTime(10)
        if (order === 'keyboard first') f.press(action)
        else expect(f.keyboard(name, false, { ctrlKey }).defaultPrevented).toBe(false)
        vi.advanceTimersByTime(120)
        expect(f.video.volume).toBe(1)
        expect(f.video.playbackRate).toBe(1)
        expect(f.native[action]).toHaveBeenCalledOnce()
        window.dispatchEvent(new Event('blur'))
      }
    }
  })

  it('waits for a keyboard partner before executing a standalone single-key control', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('nexttrack')
    vi.advanceTimersByTime(119)
    expect(f.video.volume).toBe(1)
    expect(f.native.nexttrack).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(f.video.volume).toBeCloseTo(0.95)
  })

  it.each([
    ['play', 'MediaPlayPause'], ['pause', 'MediaPlayPause'], ['stop', 'MediaStop'],
    ['seekforward', 'MediaFastForward'], ['seekbackward', 'MediaRewind'],
    ['nexttrack', 'MediaTrackNext'], ['previoustrack', 'MediaTrackPrevious'],
  ].flatMap(([action, name]) => ['ctrlKey', 'altKey', 'shiftKey', 'metaKey'].flatMap(modifier =>
    ['keyboard first', 'media first'].map(order => ({ action: action as typeof controls[number], name, modifier, order })))))('routes exact $modifier + $name once, $order', async ({ action, name, modifier, order }) => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.volumeDown.additionalKeys = [key(name)]
      settings.bindings.speedUp.additionalKeys = [key(name, { [modifier]: true })]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard(name, false, { [modifier]: true })
      else f.press(action)
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press(action)
      else f.keyboard(name, false, { [modifier]: true })
      vi.advanceTimersByTime(120)
      expect(f.video.playbackRate).toBe(1.25)
      expect(f.video.volume).toBe(1)
      expect(f.native[action]).not.toHaveBeenCalled()
      f.press(action)
      vi.advanceTimersByTime(120)
      expect(f.video.volume).toBeCloseTo(0.95)
    })

  it.each([20, 125])('withdraws tentative Pause cancellation when its custom partner arrives at %ims', async arrival => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause = { enabled: true, key: key('MediaPlay'), additionalKeys: [key('MediaPause')] }
    settings.bindings.speedUp.additionalKeys = [key('MediaPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(arrival - 10)
    expect(f.play).not.toHaveBeenCalled()
    f.keyboard('MediaPause', false, { ctrlKey: true })
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.25)
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.pause).not.toHaveBeenCalled()
    expect(f.video.paused).toBe(false)
  })

  it.each(['native stop', 'keyboard pause', 'seek'] as const)('keeps newer %s when a guessed custom request resolves to playback', async newer => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
      settings.bindings.playPause.additionalKeys = [key('MediaPlay', { ctrlKey: true })]
      const f = await fixture(settings)
      await f.video.play()
      f.play.mockClear()
      f.native.stop.mockImplementation(() => f.video.pause())
      vi.useFakeTimers()
      f.press('play')
      vi.advanceTimersByTime(10)
      if (newer === 'native stop') f.press('stop')
      else f.keyboard(newer === 'seek' ? 'ArrowRight' : ' ', false, { code: newer === 'seek' ? 'ArrowRight' : 'Space' })
      vi.advanceTimersByTime(10)
      f.keyboard('MediaPlay', false, { ctrlKey: true })
      vi.advanceTimersByTime(120)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.video.playbackRate).toBe(1)
      expect(f.video.paused).toBe(newer !== 'seek')
    })

  it('cancels waiting playback when manually skipping an intro', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    const button = document.createElement('button')
    button.dataset.uia = 'player-skip-intro'
    document.body.appendChild(button)
    vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({ width: 100, height: 20 } as DOMRect)
    const skip = vi.fn(() => { f.video.currentTime = 90 })
    button.addEventListener('click', skip)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.keyboard('s', false, { code: 'KeyS' })
    vi.advanceTimersByTime(120)
    expect(skip).toHaveBeenCalledOnce()
    expect(f.play).not.toHaveBeenCalled()
  })

  it.each([false, true])('settles tentative Pause during an active hold, custom partner=%s', async custom => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause = { enabled: true, key: key('MediaPlayPause'), additionalKeys: [key('MediaPause')] }
    settings.bindings.volumeDown.additionalKeys = [key('MediaPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', cancelable: true }))
    vi.advanceTimersByTime(200)
    f.press('pause')
    vi.advanceTimersByTime(50)
    expect(f.play).not.toHaveBeenCalled()
    expect(f.video.playbackRate).toBe(1)
    if (custom) {
      vi.advanceTimersByTime(50)
      f.keyboard('MediaPause', false, { ctrlKey: true })
      expect(f.play).toHaveBeenCalledOnce()
      expect(f.video.playbackRate).toBe(2)
    }
    vi.advanceTimersByTime(100)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'MediaPlayPause', cancelable: true }))
    expect(f.video.playbackRate).toBe(1)
    expect(f.video.paused).toBe(true)
    expect(f.play).toHaveBeenCalledTimes(custom ? 1 : 0)
    expect(f.pause).toHaveBeenCalledOnce()
  })

  it('settles a released playback tap after a tentative canceller resolves to a custom key', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause = { enabled: true, key: key('MediaPlayPause', { ctrlKey: true }), additionalKeys: [key('MediaPause')] }
    settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.volumeDown.additionalKeys = [key('MediaPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(10)
    f.keyboard('MediaPlayPause', false, { ctrlKey: true })
    expect(f.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    f.keyboard('MediaPause', false, { ctrlKey: true })
    vi.advanceTimersByTime(120)
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.pause).not.toHaveBeenCalled()
  })

  it.each(['keyboard first', 'media first'] as const)('does not replay an older unassigned native Play after Stop, %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay', { ctrlKey: true })]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard('MediaPlay', false, { altKey: true })
      else f.press('play')
      vi.advanceTimersByTime(10)
      f.press('stop')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('play')
      else f.keyboard('MediaPlay', false, { altKey: true })
      vi.advanceTimersByTime(120)
      expect(f.native.stop).toHaveBeenCalledOnce()
      expect(f.native.play).not.toHaveBeenCalled()
    })

  it.each(['global switch', 'row switch', 'blur', 'watch round trip', 'video replacement'] as const)('discards playback waiting on tentative classification after %s', async invalidation => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause = { enabled: true, key: key('MediaPlay'), additionalKeys: [key('MediaPause')] }
      const f = await fixture(settings)
      vi.useFakeTimers()
      f.press('play')
      vi.advanceTimersByTime(10)
      f.press('pause')
      vi.advanceTimersByTime(110)
      expect(f.play).not.toHaveBeenCalled()
      if (invalidation === 'global switch') {
        await saveSettings({ ...settings, enabled: false })
        await saveSettings(settings)
      } else if (invalidation === 'row switch') {
        const off = structuredClone(settings)
        off.bindings.playPause.enabled = false
        await saveSettings(off)
        await saveSettings(settings)
      } else if (invalidation === 'blur') window.dispatchEvent(new Event('blur'))
      else if (invalidation === 'watch round trip') {
        window.history.replaceState(null, '', '/browse')
        document.body.appendChild(document.createElement('div'))
        await Promise.resolve()
        window.history.replaceState(null, '', '/watch/123')
        document.body.appendChild(document.createElement('div'))
        await Promise.resolve()
      } else f.video.replaceWith(document.createElement('video'))
      vi.advanceTimersByTime(120)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.pause).not.toHaveBeenCalled()
    })

  it.each(['typing', 'video replacement'] as const)('does not release deferred native playback after %s', async invalidation => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay', { ctrlKey: true })]
    settings.bindings.volumeDown.additionalKeys = [key('MediaPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(115)
    if (invalidation === 'typing') document.querySelector('input')!.focus()
    else f.video.replaceWith(document.createElement('video'))
    vi.advanceTimersByTime(120)
    expect(f.native.play).not.toHaveBeenCalled()
    expect(f.native.pause).not.toHaveBeenCalled()
  })

  it('does not restore playing state after native Stop cancels an active physical hold', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext')]
    const f = await fixture(settings)
    await f.video.play()
    f.play.mockClear()
    f.native.stop.mockImplementation(() => f.video.pause())
    vi.useFakeTimers()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true }))
    vi.advanceTimersByTime(300)
    expect(f.video.playbackRate).toBe(2)
    f.press('stop')
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', cancelable: true }))
    expect(f.play).not.toHaveBeenCalled()
    expect(f.video.paused).toBe(true)
    expect(f.video.playbackRate).toBe(1)
  })

  it.each(['seekforward', 'seekbackward'] as const)('native %s cancels an older waiting Play', async action => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    f.native[action].mockImplementation(() => { f.video.currentTime = 60 })
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press(action)
    vi.advanceTimersByTime(120)
    expect(f.native[action]).toHaveBeenCalledOnce()
    expect(f.play).not.toHaveBeenCalled()
    expect(f.video.paused).toBe(true)
  })

  it.each(['loading', 'typing'] as const)('consumes a handled keyboard partner even after entering %s', async state => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.keyboard('MediaPlay')
    if (state === 'loading') Object.defineProperty(f.video, 'readyState', { configurable: true, value: 0 })
    else document.querySelector('input')!.focus()
    vi.advanceTimersByTime(10)
    f.press('play')
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.25)
    expect(f.native.play).not.toHaveBeenCalled()
  })

  it.each([false, true])('clears a physical hold on a watch round trip, active=%s', async active => {
    const f = await fixture(structuredClone(DEFAULT_SETTINGS))
    vi.useFakeTimers()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', cancelable: true }))
    vi.advanceTimersByTime(active ? 300 : 10)
    f.play.mockClear()
    f.pause.mockClear()
    window.history.replaceState(null, '', '/watch/456')
    document.body.appendChild(document.createElement('div'))
    await Promise.resolve()
    window.history.replaceState(null, '', '/watch/123')
    document.body.appendChild(document.createElement('div'))
    await Promise.resolve()
    vi.advanceTimersByTime(300)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', code: 'Space', cancelable: true }))
    expect(f.play).not.toHaveBeenCalled()
    expect(f.pause).not.toHaveBeenCalled()
    expect(f.video.playbackRate).toBe(1)
  })

  it.each(['pause', 'stop'] as const)('retains an actual modifier speed action after newer %s input supersedes its playback fallback', async action => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause'), key('MediaStop')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press(action)
    vi.advanceTimersByTime(10)
    f.keyboard('MediaPlayPause', false, { ctrlKey: true })
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.25)
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.play).not.toHaveBeenCalled()
  })

  it.each([false, true])('retains a newer pause after an older paired modifier seek with coarse timestamps=%s', async coarse => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.seekForward.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
    const f = await fixture(settings)
    await f.video.play()
    f.play.mockClear()
    vi.useFakeTimers()
    if (coarse) vi.spyOn(performance, 'now').mockReturnValue(0)
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(10)
    f.keyboard('MediaPlayPause', false, { ctrlKey: true })
    vi.advanceTimersByTime(120)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seek', value: 10_000 }), expect.any(Function))
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.video.paused).toBe(true)
  })

  it('retains the first receipt when a paired playback key is released', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause', { ctrlKey: true }), key('MediaPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(10)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', ctrlKey: true, cancelable: true }))
    vi.advanceTimersByTime(10)
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'MediaPlayPause', ctrlKey: true, cancelable: true }))
    vi.advanceTimersByTime(120)
    expect(f.play).not.toHaveBeenCalled()
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.video.paused).toBe(true)
  })

  it('retains the first receipt through an asynchronous paired subtitle seek', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.playPause.additionalKeys = [key('MediaPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlayPause')]
    settings.subtitleNavigation.bindings.next.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    const cleanup = mockCaptions(50)
    try {
      f.press('play')
      await vi.advanceTimersByTimeAsync(10)
      f.press('pause')
      await vi.advanceTimersByTimeAsync(10)
      f.keyboard('MediaPlayPause', false, { ctrlKey: true })
      await vi.advanceTimersByTimeAsync(150)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'seekTo', value: 6000 }), expect.any(Function))
      expect(f.pause).toHaveBeenCalledOnce()
      expect(f.video.paused).toBe(true)
    } finally { cleanup() }
  })

  it.each(['ctrlKey', 'altKey', 'shiftKey', 'metaKey'] as const)(
    'keeps %s media shortcuts separate from the plain key in both notification orders', async modifier => {
      for (const order of ['keyboard first', 'media first'] as const) {
        const settings = structuredClone(DEFAULT_SETTINGS)
        settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext')]
        settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { [modifier]: true })]
        const f = await fixture(settings)
        vi.useFakeTimers()
        if (order === 'keyboard first') f.keyboard('MediaTrackNext', false, { [modifier]: true })
        else f.press('nexttrack')
        vi.advanceTimersByTime(10)
        if (order === 'keyboard first') f.press('nexttrack')
        else f.keyboard('MediaTrackNext', false, { [modifier]: true })
        vi.advanceTimersByTime(120)
        expect(f.video.playbackRate).toBe(1.25)
        expect(f.video.volume).toBe(1)
        expect(f.native.nexttrack).not.toHaveBeenCalled()
        // A later standalone control still uses the plain binding.
        f.press('nexttrack')
        vi.advanceTimersByTime(120)
        expect(f.video.volume).toBeCloseTo(0.95)
        expect(f.video.playbackRate).toBe(1.25)
        window.dispatchEvent(new Event('blur'))
      }
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'consumes a paired action when only the modifier binding is configured: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { ctrlKey: true })]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard('MediaTrackNext', false, { ctrlKey: true })
      else f.press('nexttrack')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('nexttrack')
      else f.keyboard('MediaTrackNext', false, { ctrlKey: true })
      vi.advanceTimersByTime(120)
      expect(f.video.playbackRate).toBe(1.25)
      expect(f.native.nexttrack).not.toHaveBeenCalled()
    },
  )

  it('returns standalone controls to Netflix when only a modifier binding exists', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('nexttrack')
    expect(f.native.nexttrack).not.toHaveBeenCalled()
    vi.advanceTimersByTime(120)
    expect(f.native.nexttrack).toHaveBeenCalledOnce()
    expect(f.video.playbackRate).toBe(1)
  })

  it.each(['pause', 'stop'] as const)('does not release an older native Play after a newer unassigned browser %s', async action => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press(action)
    vi.advanceTimersByTime(120)
    expect(f.native[action]).toHaveBeenCalledOnce()
    expect(f.native.play).not.toHaveBeenCalled()
    expect(f.video.playbackRate).toBe(1)
  })

  it('cancels a waiting modifier-only control when disabled without replaying Netflix input', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('nexttrack')
    await saveSettings({ ...settings, enabled: false })
    vi.advanceTimersByTime(120)
    expect(f.native.nexttrack).not.toHaveBeenCalled()
    expect(f.video.playbackRate).toBe(1)
    f.press('nexttrack')
    expect(f.native.nexttrack).toHaveBeenCalledOnce()
  })

  it('honors native Pause while typing even if focus returns before the pairing deadline', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    const input = document.querySelector('input')!
    input.focus()
    f.press('pause')
    input.blur()
    vi.advanceTimersByTime(120)
    expect(f.native.pause).toHaveBeenCalledOnce()
    expect(f.native.play).not.toHaveBeenCalled()
  })

  it.each(['keyboard first', 'media first'] as const)(
    'keeps unassigned modifier events from executing the plain binding: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext')]
      settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { altKey: true })]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard('MediaTrackNext', false, { ctrlKey: true })
      else f.press('nexttrack')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('nexttrack')
      else f.keyboard('MediaTrackNext', false, { ctrlKey: true })
      vi.advanceTimersByTime(120)
      expect(f.video.volume).toBe(1)
      expect(f.video.playbackRate).toBe(1)
      expect(f.native.nexttrack).toHaveBeenCalledOnce()
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'allows another modifier seek after consuming its paired playback notification: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.seekForward.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard('MediaPlayPause', false, { ctrlKey: true })
      else f.press('play')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('play')
      else f.keyboard('MediaPlayPause', false, { ctrlKey: true })
      f.keyboard('MediaPlayPause', false, { ctrlKey: true })
      f.press('play')
      vi.advanceTimersByTime(120)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.native.play).not.toHaveBeenCalled()
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'preserves hold speed on the modified playback key: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause', { ctrlKey: true })]
      settings.bindings.volumeDown.additionalKeys = [key('MediaPlayPause')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      const down = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', ctrlKey: true, cancelable: true }))
      if (order === 'keyboard first') down()
      else f.press('play')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('play')
      else down()
      vi.advanceTimersByTime(251)
      expect(f.video.playbackRate).toBe(settings.holdSpeed.speed)
      expect(f.video.volume).toBe(1)
      expect(f.video.paused).toBe(false)
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'MediaPlayPause', ctrlKey: true, cancelable: true }))
      expect(f.video.playbackRate).toBe(1)
      expect(f.video.paused).toBe(true)
    },
  )

  it('keeps different modifier combinations independent during interleaved pairing', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { ctrlKey: true })]
    settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext', { shiftKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.keyboard('MediaTrackNext', false, { ctrlKey: true })
    f.keyboard('MediaTrackNext', false, { shiftKey: true })
    f.press('nexttrack')
    f.press('nexttrack')
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.25)
    expect(f.video.volume).toBeCloseTo(0.95)
    expect(f.native.nexttrack).not.toHaveBeenCalled()
  })

  it('does not use an expired modifier receipt for a later standalone control', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.volumeDown.additionalKeys = [key('MediaTrackNext')]
    settings.bindings.speedUp.additionalKeys = [key('MediaTrackNext', { ctrlKey: true })]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.keyboard('MediaTrackNext', false, { ctrlKey: true })
    vi.advanceTimersByTime(121)
    f.press('nexttrack')
    vi.advanceTimersByTime(120)
    expect(f.video.volume).toBeCloseTo(0.95)
    expect(f.video.playbackRate).toBe(1.25)
  })

  it('keeps combined play/pause commands directional and bypasses hold speed', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    f.press('play')
    vi.advanceTimersByTime(120)
    expect(f.video.paused).toBe(false)
    expect(f.pause).not.toHaveBeenCalled()
    f.press('pause')
    f.press('pause')
    vi.advanceTimersByTime(120)
    expect(f.video.paused).toBe(true)
    expect(f.play).toHaveBeenCalledTimes(2)
    expect(f.pause).toHaveBeenCalledTimes(2)
    expect(f.video.playbackRate).toBe(1)
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ action: 'play' }), expect.any(Function))
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(3, expect.objectContaining({ action: 'pause' }), expect.any(Function))
    expect(f.native.play).not.toHaveBeenCalled()
    expect(f.native.pause).not.toHaveBeenCalled()
  })

  it('respects separately assigned play and pause keys', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlay'), key('MediaPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(120)
    f.press('pause')
    vi.advanceTimersByTime(120)
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.native.play).not.toHaveBeenCalled()
    expect(f.native.pause).not.toHaveBeenCalled()
  })

  it('prefers an explicitly assigned play key over the combined key and keeps its custom action', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.25)
    expect(f.play).not.toHaveBeenCalled()
    f.press('pause')
    vi.advanceTimersByTime(120)
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.native.play).not.toHaveBeenCalled()
  })

  it.each(['keyboard first', 'media first'] as const)(
    'preserves the delivered combined key when the separate play key owns another action: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') { f.keyboard('MediaPlayPause'); f.press('play') }
      else { f.press('play'); f.keyboard('MediaPlayPause') }
      vi.advanceTimersByTime(120)
      expect(f.play).toHaveBeenCalledOnce()
      expect(f.video.playbackRate).toBe(1)
      expect(f.native.play).not.toHaveBeenCalled()
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'keeps custom combined-key assignments independent of the separate pause key: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.volumeDown.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.speedUp.additionalKeys = [key('MediaPause')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') { f.keyboard('MediaPlayPause'); f.press('pause') }
      else { f.press('pause'); f.keyboard('MediaPlayPause') }
      vi.advanceTimersByTime(120)
      expect(f.video.volume).toBeCloseTo(0.95)
      expect(f.video.playbackRate).toBe(1)
      expect(f.native.pause).not.toHaveBeenCalled()
    },
  )

  it('preserves repeated standalone media actions while waiting for possible keyboard notifications', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    f.press('play')
    vi.advanceTimersByTime(120)
    expect(f.video.playbackRate).toBe(1.5)
    expect(f.play).not.toHaveBeenCalled()
  })

  it.each(['keyboard first', 'media first'] as const)(
    'does not reuse a completed pair to swallow the next standalone command: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') { f.keyboard('MediaPlayPause'); f.press('play') }
      else { f.press('play'); f.keyboard('MediaPlayPause') }
      f.press('play')
      vi.advanceTimersByTime(120)
      expect(f.play).toHaveBeenCalledOnce()
      expect(f.video.playbackRate).toBe(1.25)
    },
  )

  it.each([true, false])('discards an older buffered play after a newer pause with hold speed=%s', async holdSpeed => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.holdSpeed.enabled = holdSpeed
    settings.bindings.playPause.additionalKeys = [key('MediaPlay'), key('MediaPlayPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('pause')
    vi.advanceTimersByTime(120)
    expect(f.video.paused).toBe(true)
    expect(f.play).not.toHaveBeenCalled()
    expect(f.pause).toHaveBeenCalledOnce()
  })

  it.each(['MediaPlay', 'MediaPlayPause'] as const)(
    'consumes a canceled play command when its late %s notification arrives', async name => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause = { enabled: true, key: key('MediaPlay'), additionalKeys: [key('MediaPlayPause'), key('MediaStop')] }
      const f = await fixture(settings)
      vi.useFakeTimers()
      f.press('play')
      vi.advanceTimersByTime(10)
      f.press('stop')
      vi.advanceTimersByTime(10)
      f.keyboard(name)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.video.paused).toBe(true)
      // The canceled receipt was consumed, so a subsequent press remains usable.
      vi.advanceTimersByTime(5)
      f.keyboard(name)
      expect(f.play).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(120)
      expect(f.play).toHaveBeenCalledOnce()
    },
  )

  it('expires canceled receipts without swallowing a later keyboard command', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause'), key('MediaStop')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press('stop')
    vi.advanceTimersByTime(120)
    f.keyboard('MediaPlayPause')
    expect(f.play).toHaveBeenCalledOnce()
  })

  it.each(['keyboard toggle', 'seek'] as const)('discards an older buffered play after a newer %s', async command => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.holdSpeed.enabled = false
    settings.bindings.playPause.additionalKeys = [key('MediaPlay'), key('MediaPlayPause')]
    const f = await fixture(settings)
    await f.video.play()
    f.play.mockClear()
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: command === 'keyboard toggle' ? 'Space' : 'ArrowRight',
      key: command === 'keyboard toggle' ? ' ' : 'ArrowRight', cancelable: true,
    }))
    vi.advanceTimersByTime(120)
    expect(f.play).not.toHaveBeenCalled()
    expect(f.video.paused).toBe(command === 'keyboard toggle')
  })

  it.each([
    ['forward', 'nexttrack', 20_000],
    ['backward', 'previoustrack', -20_000],
  ] as const)('classifies custom relative %s media seeking before an older Play can execute', async (_direction, action, amount) => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlay')]
    settings.seekShortcuts = [{ id: 'seek:media-order', kind: 'relative', value: 20 }]
    settings.bindings['seek:media-order-backward'] = { enabled: true, key: key('MediaTrackPrevious') }
    settings.bindings['seek:media-order-forward'] = { enabled: true, key: key('MediaTrackNext') }
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    vi.advanceTimersByTime(10)
    f.press(action)
    vi.advanceTimersByTime(110)
    expect(f.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seek', value: amount }), expect.any(Function))
    expect(f.play).not.toHaveBeenCalled()
    expect(f.video.paused).toBe(true)
  })

  it.each([
    ['forward', 'nexttrack', 20_000],
    ['backward', 'previoustrack', -20_000],
  ] as const)('retains newer Play after an older custom relative %s media seek', async (_direction, action, amount) => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlay')]
    settings.seekShortcuts = [{ id: 'seek:media-order', kind: 'relative', value: 20 }]
    settings.bindings['seek:media-order-backward'] = { enabled: true, key: key('MediaTrackPrevious') }
    settings.bindings['seek:media-order-forward'] = { enabled: true, key: key('MediaTrackNext') }
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press(action)
    vi.advanceTimersByTime(10)
    f.press('play')
    vi.advanceTimersByTime(110)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seek', value: amount }), expect.any(Function))
    expect(f.play).not.toHaveBeenCalled()
    vi.advanceTimersByTime(10)
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.video.paused).toBe(false)
  })

  it('does not let an older deferred seek discard a newer buffered play', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.seekForward.additionalKeys = [key('MediaPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('pause')
    vi.advanceTimersByTime(10)
    f.press('play')
    vi.advanceTimersByTime(120)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'seek', value: 10_000 }), expect.any(Function))
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.pause).not.toHaveBeenCalled()
  })

  it.each([0, 150])('discards an older buffered play after a subtitle seek with %ims caption delay', async delay => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    const cleanup = mockCaptions(delay)
    try {
      f.press('play')
      await vi.advanceTimersByTimeAsync(10)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', cancelable: true }))
      await vi.advanceTimersByTimeAsync(delay + 1)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'seekTo', value: 6000 }), expect.any(Function))
      await vi.advanceTimersByTimeAsync(130)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.video.paused).toBe(true)
    } finally { cleanup() }
  })

  it('preserves a newer buffered play when an older deferred subtitle seek finishes', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    settings.subtitleNavigation.bindings.next.additionalKeys = [key('MediaPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    const cleanup = mockCaptions()
    try {
      f.press('pause')
      await vi.advanceTimersByTimeAsync(10)
      f.press('play')
      await vi.advanceTimersByTimeAsync(121)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'seekTo', value: 6000 }), expect.any(Function))
      expect(f.play).toHaveBeenCalledOnce()
      expect(f.video.paused).toBe(false)
    } finally { cleanup() }
  })

  it('discards an older buffered play after seeking on the PiP timeline', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    Object.defineProperty(f.video, 'duration', { configurable: true, value: 240 })
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow!
    Object.defineProperty(pipWindow, 'close', { configurable: true, value: vi.fn() })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true, value: { requestWindow: vi.fn().mockResolvedValue(pipWindow) },
    })
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      const response = { success: true, result: { seekCalled: true } }
      if (typeof callback === 'function') callback(response)
      return Promise.resolve(response) as never
    })
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP', key: 'P', shiftKey: true, cancelable: true }))
      await vi.waitFor(() => expect(pipWindow.document.querySelector('[data-pip-control="timeline"]')).not.toBeNull())
      vi.useFakeTimers()
      f.play.mockClear()
      f.press('play')
      vi.advanceTimersByTime(10)
      const timeline = pipWindow.document.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')!
      timeline.value = '90'
      timeline.dispatchEvent(new Event('input', { bubbles: true }))
      timeline.dispatchEvent(new Event('change', { bubbles: true }))
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'seekTo', value: 90_000 }), expect.any(Function))
      vi.advanceTimersByTime(130)
      expect(f.play).not.toHaveBeenCalled()
      expect(f.video.paused).toBe(true)
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      iframe.remove()
      Reflect.deleteProperty(window, 'documentPictureInPicture')
    }
  })

  it('leaves episode media keys with Netflix when typing on the source page with PiP open', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextEpisode.additionalKeys = [key('MediaTrackNext')]
    const f = await fixture(settings)
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow!
    Object.defineProperty(pipWindow, 'close', { configurable: true, value: vi.fn() })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true, value: { requestWindow: vi.fn().mockResolvedValue(pipWindow) },
    })
    try {
      f.keyboard('P', false, { code: 'KeyP', shiftKey: true })
      await vi.waitFor(() => expect(pipWindow.document.querySelector('video')).toBe(f.video))
      document.querySelector('input')!.focus()
      expect(document.hasFocus()).toBe(true)
      expect(document.activeElement?.tagName).toBe('INPUT')
      f.press('nexttrack')
      expect(f.native.nexttrack).toHaveBeenCalledOnce()
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      iframe.remove()
      Reflect.deleteProperty(window, 'documentPictureInPicture')
    }
  })

  it.each(['keyboard first', 'media first'] as const)(
    'preserves physical-key hold speed regardless of notification order: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      const f = await fixture(settings)
      await f.video.play()
      f.play.mockClear()
      vi.useFakeTimers()
      const down = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause', cancelable: true }))
      if (order === 'keyboard first') { down(); f.press('pause') }
      else { f.press('pause'); down() }
      vi.advanceTimersByTime(251)
      expect(f.video.playbackRate).toBe(settings.holdSpeed.speed)
      expect(f.video.paused).toBe(false)
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'MediaPlayPause', cancelable: true }))
      expect(f.video.playbackRate).toBe(1)
      expect(f.video.paused).toBe(false)
      expect(f.native.pause).not.toHaveBeenCalled()
    },
  )

  it.each(['disable and re-enable', 'binding change', 'watch change', 'video replacement', 'window blur'] as const)(
    'discards a waiting ambiguous media action after %s', async change => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      f.press('play')
      if (change === 'disable and re-enable') {
        await saveSettings({ ...settings, enabled: false })
        await saveSettings(settings)
      } else if (change === 'binding change') {
        await saveSettings({ ...settings, bindings: { ...settings.bindings,
          speedUp: { ...settings.bindings.speedUp, additionalKeys: [] } } })
      } else if (change === 'watch change') window.history.replaceState(null, '', '/watch/456')
      else if (change === 'video replacement') f.video.replaceWith(document.createElement('video'))
      else window.dispatchEvent(new Event('blur'))
      vi.advanceTimersByTime(120)
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
      expect(f.play).not.toHaveBeenCalled()
      expect(f.video.playbackRate).toBe(1)
    },
  )

  it.each([
    { supported: true, active: false },
    { supported: false, active: true },
  ])('routes a PiP media key with supported=$supported and active=$active', async ({ supported, active }) => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.pictureInPicture.additionalKeys = [key('MediaTrackNext')]
    vi.spyOn(PipManager, 'isSupported').mockReturnValue(supported)
    vi.spyOn(PipManager.prototype, 'isActive', 'get').mockReturnValue(active)
    const toggle = vi.spyOn(PipManager.prototype, 'toggle').mockResolvedValue(true)
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('nexttrack')
    vi.advanceTimersByTime(120)
    expect(toggle).toHaveBeenCalledOnce()
    expect(f.native.nexttrack).not.toHaveBeenCalled()
  })

  it('releases PiP media keys when the browser is unsupported and PiP is inactive', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.pictureInPicture.additionalKeys = [key('MediaTrackNext')]
    vi.spyOn(PipManager, 'isSupported').mockReturnValue(false)
    const toggle = vi.spyOn(PipManager.prototype, 'toggle').mockResolvedValue(true)
    const f = await fixture(settings)
    f.press('nexttrack')
    expect(toggle).not.toHaveBeenCalled()
    expect(f.native.nexttrack).toHaveBeenCalledOnce()
  })

  it.each(['keyboard first', 'media first'] as const)(
    'pairs a media key once across PiP opening, closing and focus changes: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.pictureInPicture.additionalKeys = [key('MediaTrackNext')]
      const f = await fixture(settings)
      const iframe = document.createElement('iframe')
      document.body.appendChild(iframe)
      const pipWindow = iframe.contentWindow!
      const close = vi.fn()
      const requestWindow = vi.fn().mockResolvedValue(pipWindow)
      Object.defineProperty(pipWindow, 'close', { configurable: true, value: close })
      Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: { requestWindow } })
      await saveSettings(settings)
      let time = 0
      vi.spyOn(performance, 'now').mockImplementation(() => time)
      const keyboard = (targetWindow: Window) => {
        targetWindow.dispatchEvent(new KeyboardEvent('keydown', { key: 'MediaTrackNext', cancelable: true }))
        targetWindow.dispatchEvent(new KeyboardEvent('keyup', { key: 'MediaTrackNext', cancelable: true }))
      }
      try {
        if (order === 'keyboard first') keyboard(window)
        else {
          f.press('nexttrack')
          time = 10
          keyboard(window)
        }
        await vi.waitFor(() => expect(pipWindow.document.querySelector('video')).toBe(f.video))
        window.dispatchEvent(new Event('blur'))
        time = 20
        if (order === 'keyboard first') f.press('nexttrack')
        expect(close).not.toHaveBeenCalled()
        expect(requestWindow).toHaveBeenCalledOnce()

        time = 200
        if (order === 'keyboard first') keyboard(pipWindow)
        else {
          f.press('nexttrack')
          time = 210
          keyboard(pipWindow)
        }
        expect(close).toHaveBeenCalledOnce()
        pipWindow.dispatchEvent(new Event('pagehide'))
        time = 220
        if (order === 'keyboard first') f.press('nexttrack')
        expect(requestWindow).toHaveBeenCalledOnce()
        expect(close).toHaveBeenCalledOnce()
        expect(f.video.ownerDocument).toBe(document)
      } finally {
        pipWindow.dispatchEvent(new Event('pagehide'))
        iframe.remove()
        Reflect.deleteProperty(window, 'documentPictureInPicture')
      }
    },
  )

  it('treats stop assigned to Play / Pause as pause, including when already paused', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaStop')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('stop')
    vi.advanceTimersByTime(120)
    expect(f.pause).toHaveBeenCalledOnce()
    expect(f.play).not.toHaveBeenCalled()
    expect(f.native.stop).not.toHaveBeenCalled()
  })

  it('preserves directional playback for keyboard notifications too', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause = { enabled: true, key: key('MediaPlay'), additionalKeys: [key('MediaPause'), key('MediaStop')] }
    const f = await fixture(settings)
    f.keyboard('MediaPlay')
    f.keyboard('MediaPlay')
    expect(f.video.paused).toBe(false)
    expect(f.pause).not.toHaveBeenCalled()
    f.keyboard('MediaPause')
    f.keyboard('MediaStop')
    expect(f.video.paused).toBe(true)
    expect(f.play).toHaveBeenCalledTimes(2)
    expect(f.pause).toHaveBeenCalledTimes(2)
  })

  it('keeps subtitle playback directional when a combined media key is assigned there', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.playback.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('play')
    f.press('play')
    vi.advanceTimersByTime(120)
    f.press('pause')
    f.press('pause')
    vi.advanceTimersByTime(120)
    expect(f.play).toHaveBeenCalledTimes(2)
    expect(f.pause).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['seekforward', 'seekForward', 'MediaFastForward', 10_000],
    ['seekbackward', 'seekBackward', 'MediaRewind', -10_000],
  ] as const)('routes %s through its configured seek action once', async (control, action, name, amount) => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings[action].additionalKeys = [key(name)]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press(control)
    vi.advanceTimersByTime(120)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ action: 'seek', value: amount }), expect.any(Function))
    expect(f.native[control]).not.toHaveBeenCalled()
  })

  it.each(['keyboard first', 'media first'] as const)('handles paired keyboard and media notifications once: %s', async order => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    if (order === 'keyboard first') { f.keyboard('MediaFastForward'); f.press('seekforward') }
    else { f.press('seekforward'); f.keyboard('MediaFastForward') }
    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
    expect(f.native.seekforward).not.toHaveBeenCalled()
    // Pair suppression must not debounce genuine repeated media commands.
    f.press('seekforward')
    f.press('seekforward')
    vi.advanceTimersByTime(120)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
  })

  it.each(['keyboard first', 'media first'] as const)(
    'pairs interleaved media keys independently: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
      settings.bindings.seekBackward.additionalKeys = [key('MediaRewind')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      const forward = () => order === 'keyboard first' ? f.keyboard('MediaFastForward') : f.press('seekforward')
      const backward = () => order === 'keyboard first' ? f.keyboard('MediaRewind') : f.press('seekbackward')
      forward()
      vi.advanceTimersByTime(75)
      backward()
      vi.advanceTimersByTime(25)
      if (order === 'keyboard first') f.press('seekforward')
      else f.keyboard('MediaFastForward')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('seekbackward')
      else f.keyboard('MediaRewind')
      const seeks = vi.mocked(chrome.runtime.sendMessage).mock.calls.map(([message]) => message)
      expect(seeks).toEqual([
        expect.objectContaining({ action: 'seek', value: 10_000 }),
        expect.objectContaining({ action: 'seek', value: -10_000 }),
      ])
      // Both pairs are complete; another standalone command must remain usable.
      f.press('seekforward')
      vi.advanceTimersByTime(120)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'pairs buffered same-key repeats one notification at a time: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') { f.keyboard('MediaFastForward'); f.keyboard('MediaFastForward', true) }
      else { f.press('seekforward'); f.press('seekforward') }
      vi.advanceTimersByTime(50)
      if (order === 'keyboard first') { f.press('seekforward'); f.press('seekforward') }
      else { f.keyboard('MediaFastForward'); f.keyboard('MediaFastForward', true) }
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2)
      f.press('seekforward')
      vi.advanceTimersByTime(120)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
    },
  )

  it.each(['keyboard first', 'media first'] as const)(
    'keeps actual key assignments for interleaved separate and combined keys: %s', async order => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
      settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
      const f = await fixture(settings)
      vi.useFakeTimers()
      if (order === 'keyboard first') f.keyboard('MediaPlay')
      else f.press('play')
      vi.advanceTimersByTime(75)
      if (order === 'keyboard first') f.keyboard('MediaPlayPause')
      else f.press('play')
      vi.advanceTimersByTime(25)
      if (order === 'keyboard first') f.press('play')
      else f.keyboard('MediaPlay')
      vi.advanceTimersByTime(10)
      if (order === 'keyboard first') f.press('play')
      else f.keyboard('MediaPlayPause')
      vi.advanceTimersByTime(120)
      expect(f.video.playbackRate).toBe(1.25)
      expect(f.play).toHaveBeenCalledOnce()
      expect(f.pause).not.toHaveBeenCalled()
    },
  )

  it('matches an earlier executed notification before a later pending candidate', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.volumeDown.additionalKeys = [key('MediaPlayPause')]
    settings.bindings.speedUp.additionalKeys = [key('MediaPlay')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    f.press('pause')
    vi.advanceTimersByTime(10)
    f.press('play')
    vi.advanceTimersByTime(10)
    f.keyboard('MediaPlayPause')
    vi.advanceTimersByTime(10)
    f.keyboard('MediaPlay')
    vi.advanceTimersByTime(120)
    expect(f.video.volume).toBeCloseTo(0.95)
    expect(f.video.playbackRate).toBe(1.25)
  })

  it.each(['keyboard first', 'media first'] as const)('pairs combined play/pause notifications without reversing playback: %s', async order => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.additionalKeys = [key('MediaPlayPause')]
    const f = await fixture(settings)
    if (order === 'keyboard first') { f.keyboard('MediaPlayPause'); f.press('play') }
    else { f.press('play'); f.keyboard('MediaPlayPause') }
    expect(f.play).toHaveBeenCalledOnce()
    expect(f.pause).not.toHaveBeenCalled()
    expect(f.native.play).not.toHaveBeenCalled()
  })

  it('pairs repeated seek notifications without dropping repeats from the same source', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
    const f = await fixture(settings)
    f.keyboard('MediaFastForward')
    f.press('seekforward')
    f.keyboard('MediaFastForward', true)
    f.press('seekforward')
    f.keyboard('MediaFastForward', true)
    f.press('seekforward')
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
  })

  it('does not pair separate presses beyond the notification window or different keys', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
    settings.bindings.seekBackward.additionalKeys = [key('MediaRewind')]
    const f = await fixture(settings)
    vi.useFakeTimers()
    const now = vi.spyOn(performance, 'now').mockReturnValue(0)
    f.keyboard('MediaFastForward')
    now.mockReturnValue(121)
    f.press('seekforward')
    f.keyboard('MediaRewind')
    vi.advanceTimersByTime(120)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
  })

  it('pairs notifications for custom actions even after that action saves its own preference', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.cycleSubtitleSize.additionalKeys = [key('MediaFastForward')]
    const f = await fixture(settings)
    vi.spyOn(performance, 'now').mockReturnValue(0)
    f.keyboard('MediaFastForward')
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe('large'))
    f.press('seekforward')
    expect(document.getElementById('shortcut-override-media-hint')).toHaveTextContent('125%')
    expect((await getSettings()).subtitleSize).toBe('large')
    expect(f.native.seekforward).not.toHaveBeenCalled()
  })

  it('releases every unassigned control to Netflix and restores later registrations on disable', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const f = await fixture(settings)
    vi.useFakeTimers()
    for (const control of controls) {
      f.press(control)
      expect(f.native[control]).toHaveBeenCalledOnce()
    }
    settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
    await saveSettings(settings)
    f.press('seekforward')
    vi.advanceTimersByTime(120)
    expect(f.native.seekforward).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
    await saveSettings({ ...settings, enabled: false })
    f.press('seekforward')
    expect(f.native.seekforward).toHaveBeenCalledTimes(2)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
  })

  it.each(['unassigned', 'typing', 'row off', 'global off', 'loading', 'outside watch'] as const)(
    'leaves seeking with Netflix when %s', async condition => {
      const settings = structuredClone(DEFAULT_SETTINGS)
      if (condition !== 'unassigned') settings.bindings.seekForward.additionalKeys = [key('MediaFastForward')]
      if (condition === 'row off') settings.bindings.seekForward.enabled = false
      if (condition === 'global off') settings.enabled = false
      const f = await fixture(settings)
      if (condition === 'typing') document.querySelector('input')!.focus()
      if (condition === 'loading') Object.defineProperty(f.video, 'readyState', { value: 0 })
      if (condition === 'outside watch') window.history.replaceState(null, '', '/browse')
      f.press('seekforward')
      expect(f.native.seekforward).toHaveBeenCalledOnce()
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    },
  )
})
