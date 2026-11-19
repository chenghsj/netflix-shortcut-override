import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { keyBindingFromEvent } from '@/shared/shortcut-bindings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { getSettings, saveSettings } from '@/shared/storage'
import { PipManager } from '@/content/pip/pip-manager'
import { MEDIA_SESSION_ACTION_EVENT } from '@/shared/media-session-events'
import { installMediaSessionBridge } from '@/content/media-session-bridge'

import { setupContentIndexTests } from './content-script.test-support'

const episodeMediaSettings = (): ShortcutSettings => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  for (const [action, key] of [['nextEpisode', 'MediaTrackNext'], ['previousEpisode', 'MediaTrackPrevious']] as const) {
    settings.bindings[action].additionalKeys = [keyBindingFromEvent(new KeyboardEvent('keydown', { key }))]
  }
  return settings
}

describe('content media shortcuts', () => {
  setupContentIndexTests()

  it('keeps Ctrl+P/Ctrl+N working alongside saved additional media keys', async () => {
    await saveSettings(episodeMediaSettings())
    document.body.innerHTML = '<video></video><button data-uia="control-next">Next</button><div><button data-uia="episode-pane-item">Previous</button><button data-uia="episode-pane-item" aria-selected="true">Current</button></div>'
    const next = vi.fn()
    const previous = vi.fn()
    document.querySelector('[data-uia="control-next"]')!.addEventListener('click', next)
    document.querySelector('[data-uia="episode-pane-item"]')!.addEventListener('click', previous)
    for (const init of [
      { key: 'n', code: 'KeyN', ctrlKey: true },
      { key: 'MediaTrackNext' },
      { key: 'p', code: 'KeyP', ctrlKey: true },
      { key: 'MediaTrackPrevious', code: 'Unidentified' },
    ]) {
      const event = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    expect(next).toHaveBeenCalledTimes(2)
    expect(previous).toHaveBeenCalledTimes(2)
    expect((await getSettings()).bindings.nextEpisode.key).toEqual(DEFAULT_SETTINGS.bindings.nextEpisode.key)
    expect((await getSettings()).bindings.previousEpisode.key).toEqual(DEFAULT_SETTINGS.bindings.previousEpisode.key)
  })

  it('handles system media track actions and releases them on disable, while typing and outside playback', async () => {
    await saveSettings(episodeMediaSettings())
    document.body.innerHTML = '<video></video><input /><button data-uia="control-next">Next</button>'
    Object.defineProperty(document.querySelector('video'), 'readyState', { value: HTMLMediaElement.HAVE_METADATA })
    const next = vi.fn()
    document.querySelector('button')!.addEventListener('click', next)
    const press = () => {
      const event = new CustomEvent(MEDIA_SESSION_ACTION_EVENT, { detail: 'nexttrack', cancelable: true })
      window.dispatchEvent(event)
      return event.defaultPrevented
    }
    vi.useFakeTimers()
    expect(press()).toBe(true)
    vi.advanceTimersByTime(120)
    expect(next).toHaveBeenCalledOnce()
    document.querySelector('input')!.focus()
    expect(press()).toBe(false)
    document.querySelector('input')!.blur()
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextEpisode.enabled = false
    await saveSettings(settings)
    expect(press()).toBe(false)
    await saveSettings(DEFAULT_SETTINGS)
    window.history.replaceState(null, '', '/browse')
    expect(press()).toBe(false)
    expect(next).toHaveBeenCalledOnce()
  })

  it('defers media track actions to Netflix until playback is ready and restores Netflix on disable', async () => {
    await saveSettings(episodeMediaSettings())
    document.body.innerHTML = '<button data-uia="control-next">Next</button>'
    const next = vi.fn()
    document.querySelector('button')!.addEventListener('click', next)
    const registered = new Map<MediaSessionAction, MediaSessionActionHandler | null>()
    const media = { setActionHandler: (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => { registered.set(action, handler) } }
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'mediaSession')
    Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: media })
    const controller = new AbortController()
    try {
      installMediaSessionBridge(controller.signal)
      const siteNext = vi.fn()
      media.setActionHandler('nexttrack', siteNext)
      registered.get('nexttrack')?.({ action: 'nexttrack' })
      const video = document.createElement('video')
      document.body.append(video)
      registered.get('nexttrack')?.({ action: 'nexttrack' })
      expect(siteNext).toHaveBeenCalledTimes(2)
      expect(next).not.toHaveBeenCalled()
      Object.defineProperty(video, 'readyState', { value: HTMLMediaElement.HAVE_METADATA })
      vi.useFakeTimers()
      registered.get('nexttrack')?.({ action: 'nexttrack' })
      vi.advanceTimersByTime(120)
      expect(next).toHaveBeenCalledOnce()
      expect(siteNext).toHaveBeenCalledTimes(2)
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', code: 'KeyN', ctrlKey: true, cancelable: true }))
      expect(next).toHaveBeenCalledTimes(2)
      await saveSettings({ ...DEFAULT_SETTINGS, enabled: false })
      expect(registered.get('nexttrack')).toBe(siteNext)
      registered.get('nexttrack')?.({ action: 'nexttrack' })
      expect(siteNext).toHaveBeenCalledTimes(3)
      expect(next).toHaveBeenCalledTimes(2)
    } finally {
      controller.abort()
      if (descriptor) Object.defineProperty(navigator, 'mediaSession', descriptor)
      else Reflect.deleteProperty(navigator, 'mediaSession')
    }
  })

  it.each([
    { nextKey: 'MediaTrackNext', previousKey: 'MediaTrackPrevious' },
    { nextKey: 'MediaNextTrack', previousKey: 'MediaPreviousTrack' },
    { nextKey: 'BrowserForward', previousKey: 'BrowserBack' },
  ].flatMap(keys => ['', 'Unidentified', 'native'].map(code => ({ ...keys, code }))))(
    'runs $nextKey/$previousKey episode shortcuts with code $code and releases repeats, disabled shortcuts and typing', async ({ code, nextKey, previousKey }) => {
      const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.nextEpisode.key = keyBindingFromEvent(new KeyboardEvent('keydown', { key: nextKey }))
      settings.bindings.previousEpisode.key = keyBindingFromEvent(new KeyboardEvent('keydown', { key: previousKey }))
      await saveSettings(settings)
      document.body.innerHTML = '<video></video><input /><button data-uia="control-next">Next</button><div><button data-uia="episode-pane-item">Previous</button><button data-uia="episode-pane-item" aria-selected="true">Current</button></div>'
      const next = vi.fn()
      const previous = vi.fn()
      document.querySelector('[data-uia="control-next"]')!.addEventListener('click', next)
      document.querySelector('[data-uia="episode-pane-item"]')!.addEventListener('click', previous)
      const press = (key: string, repeat = false) => {
        const event = new KeyboardEvent('keydown', {
          key, code: code === 'native' ? key : code, repeat, bubbles: true, cancelable: true,
        })
        window.dispatchEvent(event)
        return event
      }
      expect(press(nextKey).defaultPrevented).toBe(true)
      expect(next).toHaveBeenCalledOnce()
      expect(previous).not.toHaveBeenCalled()
      expect(press(previousKey).defaultPrevented).toBe(true)
      expect(previous).toHaveBeenCalledOnce()
      expect(press(nextKey, true).defaultPrevented).toBe(true)
      expect(next).toHaveBeenCalledOnce()
      const input = document.querySelector('input')!
      input.focus()
      expect(press(nextKey).defaultPrevented).toBe(false)
      input.blur()
      settings.bindings.nextEpisode.enabled = false
      await saveSettings(settings)
      expect(press(nextKey).defaultPrevented).toBe(false)
      expect(next).toHaveBeenCalledOnce()
      expect(previous).toHaveBeenCalledOnce()
    },
  )

  it('only completes a code-less media play/pause press when that same media key is released', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.key = keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'MediaPlayPause' }))
    await saveSettings(settings)
    document.body.innerHTML = '<video></video>'
    vi.spyOn(document.querySelector('video')!, 'play').mockResolvedValue()
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    const press = (type: string, key: string, code = '') => {
      const event = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true })
      window.dispatchEvent(event)
      return event
    }
    expect(press('keydown', 'MediaPlayPause').defaultPrevented).toBe(true)
    expect(press('keyup', 'MediaTrackNext').defaultPrevented).toBe(false)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    expect(press('keyup', 'MediaPlayPause', 'Unidentified').defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'play' }), expect.any(Function))
  })

  it('does not revive queued subtitle changes after a global disable and re-enable', async () => {
    document.body.innerHTML = '<video></video>'
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    for (let index = 0; index < 2; index += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', key: 'X', shiftKey: true, bubbles: true, cancelable: true }))
    }
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
    const reply = vi.mocked(chrome.runtime.sendMessage).mock.calls[0][1]
    if (typeof reply !== 'function') throw new Error('Expected subtitle response callback')
    const settings = await getSettings()
    await saveSettings({ ...settings, enabled: false })
    await saveSettings(settings)
    reply({ success: true, result: { subtitlesEnabled: true } })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
  })

  it.each(['KeyA', 'KeyD'])('does not revive queued audio changes from %s after a global disable and re-enable', async code => {
    document.body.innerHTML = '<video></video>'
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    for (let index = 0; index < 2; index += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        code, key: code.slice(-1), shiftKey: true, bubbles: true, cancelable: true,
      }))
    }
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
    const reply = vi.mocked(chrome.runtime.sendMessage).mock.calls[0][1]
    if (typeof reply !== 'function') throw new Error('Expected audio response callback')
    const settings = await getSettings()
    await saveSettings({ ...settings, enabled: false })
    await saveSettings(settings)
    reply({ success: true, result: { audioTrackSwitchCalled: true, audioTrack: 'English' } })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('routes each preferred speed key and suppresses held repeats and disabled groups', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:two', speed: 2 }, { id: 'preferred-speed:slow', speed: 0.75 }]
    settings.bindings['preferred-speed:two'] = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'Digit2', key: '2' } }
    settings.bindings['preferred-speed:slow'] = { enabled: false, key: { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'Digit3', key: '3' } }
    await saveSettings(settings)
    document.body.innerHTML = '<video></video>'
    const video = document.querySelector('video')!
    const key = (code: string, key: string, repeat = false) => {
      const event = new KeyboardEvent('keydown', { code, key, repeat, bubbles: true, cancelable: true })
      window.dispatchEvent(event)
      return event
    }
    expect(key('Digit2', '2').defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(2)
    video.playbackRate = 1
    expect(key('Digit2', '2', true).defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(key('Digit3', '3').defaultPrevented).toBe(false)
    expect(video.playbackRate).toBe(1)
  })

  it('releases cleared shortcuts and their old Netflix keys without executing commands', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.playPause.key = null
    settings.bindings.seekBackward.key = null
    settings.subtitleNavigation.bindings.previous.key = null
    await saveSettings(settings)
    document.body.innerHTML = '<video></video>'
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    for (const [code, key] of [['Space', ' '], ['ArrowLeft', 'ArrowLeft'], ['KeyA', 'a']]) {
      const event = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('runs the general shortcut instead of subtitle navigation when saved keys overlap', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.playback.key = { ...settings.bindings.mute.key }
    await saveSettings(settings)
    const video = document.createElement('video')
    document.body.append(video)
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    const event = new KeyboardEvent('keydown', { code: 'KeyM', key: 'm', bubbles: true, cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'setMuted', value: 1 }), expect.any(Function))
    expect(vi.mocked(chrome.runtime.sendMessage).mock.calls.some(([message]) => (message as { action?: string }).action === 'togglePlayback')).toBe(false)
  })

  it('routes frame and audio keys, preserves typing and disabled rows, and suppresses held audio repeats', async () => {
    document.body.innerHTML = '<video></video><input />'
    const press = (init: KeyboardEventInit, target: EventTarget = window) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      target.dispatchEvent(event)
      return event
    }
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    for (const [init, action, value] of [
      [{ code: 'Comma', key: ',' }, 'stepFrame', -1],
      [{ code: 'Period', key: '.', repeat: true }, 'stepFrame', 1],
      [{ code: 'KeyA', key: 'A', shiftKey: true }, 'cycleAudioTrack', -1],
    ] as const) {
      expect(press(init).defaultPrevented).toBe(true)
      expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith(
        expect.objectContaining({ action, value }), expect.any(Function),
      )
      const reply = vi.mocked(chrome.runtime.sendMessage).mock.calls.at(-1)?.[1]
      if (typeof reply === 'function') reply({ success: true, result: { seekCalled: true, audioTrackSwitchCalled: true } })
      await Promise.resolve()
      await Promise.resolve()
    }
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    expect(press({ code: 'KeyD', key: 'D', shiftKey: true, repeat: true }).defaultPrevented).toBe(true)
    const input = document.querySelector('input')!
    input.focus()
    expect(press({ code: 'Period', key: '.' }, input).defaultPrevented).toBe(false)
    input.blur()
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextFrame.enabled = false
    await saveSettings(settings)
    expect(press({ code: 'Period', key: '.' }).defaultPrevented).toBe(false)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    settings.bindings.nextFrame = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(settings)
    expect(press({ code: 'KeyB', key: 'b' }).defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'stepFrame', value: 1 }), expect.any(Function),
    )
  })

  it.each(['subtitle', 'PiP', 'disable and re-enable'] as const)('cancels a delayed episode selection after %s takes over', async action => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    await saveSettings(settings)
    document.body.innerHTML = '<video></video><button data-uia="control-episodes">Episodes</button>'
    const press = (init: KeyboardEventInit) => {
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
      window.dispatchEvent(event)
      return event
    }
    expect(press({ code: 'KeyP', key: 'p', ctrlKey: true }).defaultPrevented).toBe(true)
    if (action === 'subtitle') {
      expect(press({ code: 'KeyD', key: 'd' }).defaultPrevented).toBe(true)
    } else if (action === 'PiP') {
      const supported = vi.spyOn(PipManager, 'isSupported').mockReturnValue(true)
      const toggle = vi.spyOn(PipManager.prototype, 'toggle').mockResolvedValue(true)
      try {
        expect(press({ code: 'KeyP', key: 'P', shiftKey: true }).defaultPrevented).toBe(true)
        expect(toggle).toHaveBeenCalledOnce()
      } finally {
        supported.mockRestore()
        toggle.mockRestore()
      }
    } else {
      await saveSettings({ ...settings, enabled: false })
      await saveSettings(settings)
    }
    const played = vi.fn()
    const list = document.createElement('div')
    list.innerHTML = '<div data-uia="episode-pane-item"><button class="play-button">Previous</button></div><div data-uia="episode-pane-item" aria-selected="true">Current</div>'
    list.querySelector('button')!.addEventListener('click', played)
    document.body.append(list)
    // Deliver the picker mutation to any navigation still waiting for it.
    await Promise.resolve()
    expect(played).not.toHaveBeenCalled()
  })

  it('dispatches custom seeking keys, ignores repeated percentage and episode keys, and preserves typing', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:percent', kind: 'percentage', value: 25 }]
    settings.bindings['seek:percent'] = { enabled: true, key: { code: 'Digit5', key: '5', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(settings)
    const video = document.createElement('video')
    Object.defineProperty(video, 'duration', { value: 200 })
    document.body.append(video)
    const press = (extra: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { code: 'Digit5', key: '5', bubbles: true, cancelable: true, ...extra })
      window.dispatchEvent(event)
      return event
    }
    vi.mocked(chrome.runtime.sendMessage).mockClear()
    expect(press().defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'seekTo', value: 50000 }), expect.any(Function))
    const calls = vi.mocked(chrome.runtime.sendMessage).mock.calls.length
    expect(press({ repeat: true }).defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(calls)
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    expect(press().defaultPrevented).toBe(false)
    input.blur()
    const next = document.createElement('button')
    next.dataset.uia = 'control-next'
    const click = vi.fn()
    next.addEventListener('click', click)
    document.body.append(next)
    expect(press({ code: 'KeyN', key: 'n', ctrlKey: true }).defaultPrevented).toBe(true)
    expect(click).toHaveBeenCalledOnce()
    expect(press({ code: 'KeyN', key: 'n', ctrlKey: true, repeat: true }).defaultPrevented).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('handles Ctrl+P by expanding and playing the previous Netflix episode once', async () => {
    document.body.innerHTML = '<video></video><button data-uia="control-episodes">Episodes</button>'
    const play = vi.fn()
    document.querySelector('button')!.addEventListener('click', () => {
      const list = document.createElement('div')
      list.setAttribute('role', 'listbox')
      list.innerHTML = '<div data-uia="episode-pane-back">Season</div><div data-uia="episode-pane-item" role="option"><div data-uia="episode-pane-item-preview-closed" style="display: none"><button class="play-button" aria-hidden="true" tabindex="-1">Play</button></div></div><div data-uia="episode-pane-item" aria-selected="true">Current</div>'
      const previous = list.querySelector<HTMLElement>('[data-uia="episode-pane-item"]')!
      const preview = previous.firstElementChild as HTMLElement
      previous.addEventListener('pointerdown', () => {
        if (preview.dataset.uia === 'episode-pane-item-preview-open') play()
        else queueMicrotask(() => {
          preview.dataset.uia = 'episode-pane-item-preview-open'
          preview.style.display = ''
        })
      })
      document.body.append(list)
    })
    const press = (repeat = false) => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyP', key: 'p', ctrlKey: true, repeat, bubbles: true, cancelable: true,
      })
      window.dispatchEvent(event)
      return event
    }

    expect(press().defaultPrevented).toBe(true)
    expect(press(true).defaultPrevented).toBe(true)
    await vi.waitFor(() => expect(play).toHaveBeenCalledOnce())
  })

  it('applies custom fixed and cycle sizes, ignores repeats, and preserves typing and disabled keys', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeCycle = [100, 200, 150]
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [175] },
      { id: 'subtitle-size:cycle', kind: 'cycle', sizes: [200, 150, 100] }]
    settings.bindings['subtitle-size:fixed'] = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
    settings.bindings['subtitle-size:cycle'] = { enabled: true, key: { code: 'KeyG', key: 'g', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(settings)
    const press = (code = 'KeyB', extra: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { code, key: code.slice(-1).toLowerCase(), bubbles: true, cancelable: true, ...extra })
      window.dispatchEvent(event)
      return event
    }
    expect(press().defaultPrevented).toBe(false)
    document.body.append(document.createElement('video'))
    expect(press().defaultPrevented).toBe(true)
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe(175))
    expect(document.getElementById('shortcut-override-subtitle-size')).toHaveTextContent('zoom: 1.75')
    press('KeyG')
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe(200))
    expect(press('KeyG', { repeat: true }).defaultPrevented).toBe(true)
    expect((await getSettings()).subtitleSize).toBe(200)
    press('KeyG')
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe(150))
    press('KeyG')
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe('medium'))
    expect(document.getElementById('shortcut-override-subtitle-size')).toBeNull()
    press('KeyC', { shiftKey: true, key: 'C' })
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe(200))
    const input = document.createElement('input')
    document.body.append(input); input.focus()
    expect(press().defaultPrevented).toBe(false)
    input.blur()
    const disabled = await getSettings()
    disabled.bindings['subtitle-size:fixed'].enabled = false
    await saveSettings(disabled)
    expect(press().defaultPrevented).toBe(false)
    expect((await getSettings()).pip.subtitleSize).toBe('medium')
  })

  it('cycles and saves caption size, ignores repeats, and restores native rendering when disabled', async () => {
    document.body.append(document.createElement('video'))
    const press = (repeat = false) => {
      const event = new KeyboardEvent('keydown', {
        code: 'KeyC', key: 'C', shiftKey: true, repeat, bubbles: true, cancelable: true,
      })
      window.dispatchEvent(event)
      return event
    }
    for (const size of ['large', 'small', 'medium'] as const) {
      expect(press().defaultPrevented).toBe(true)
      await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe(size))
      expect(document.documentElement.getAttribute('data-shortcut-override-subtitle-size'))
        .toBe(size === 'medium' ? null : size)
      expect(press(true).defaultPrevented).toBe(true)
      expect((await getSettings()).subtitleSize).toBe(size)
    }
    press()
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe('large'))
    await saveSettings({ ...(await getSettings()), enabled: false })
    expect(document.getElementById('shortcut-override-subtitle-size')).toBeNull()
    expect(press().defaultPrevented).toBe(false)
    await saveSettings({ ...(await getSettings()), enabled: true })
    expect(document.documentElement).toHaveAttribute('data-shortcut-override-subtitle-size', 'large')
  })

  it('honors remapped caption-size keys and leaves typing and pages without video alone', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.cycleSubtitleSize.key = { ...settings.bindings.cycleSubtitleSize.key, code: 'KeyB', key: 'B' }
    await saveSettings(settings)
    const press = (code = 'KeyB') => {
      const event = new KeyboardEvent('keydown', { code, key: code.slice(-1), shiftKey: true, bubbles: true, cancelable: true })
      window.dispatchEvent(event)
      return event
    }
    expect(press().defaultPrevented).toBe(false)
    document.body.append(document.createElement('video'))
    expect(press('KeyC').defaultPrevented).toBe(false)
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    expect(press().defaultPrevented).toBe(false)
    input.blur()
    expect(press().defaultPrevented).toBe(true)
    await vi.waitFor(async () => expect((await getSettings()).subtitleSize).toBe('large'))
  })

  it('enables WASD as a group while preserving typing and modified keys', async () => {
    document.body.append(document.createElement('video'))
    const press = (extra: KeyboardEventInit = {}) => {
      const event = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true, cancelable: true, ...extra })
      window.dispatchEvent(event)
      return event
    }
    expect(press().defaultPrevented).toBe(false)
    await saveSettings({ ...DEFAULT_SETTINGS, subtitleNavigation: { ...DEFAULT_SETTINGS.subtitleNavigation, enabled: true } })
    expect(press({ shiftKey: true }).defaultPrevented).toBe(false)
    expect(press({ repeat: true }).defaultPrevented).toBe(true)
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    expect(press().defaultPrevented).toBe(false)
    input.blur()
    await saveSettings(DEFAULT_SETTINGS)
    expect(press().defaultPrevented).toBe(false)
  })

  it.each([false, true])('cancels a pending subtitle row when disabled, even if re-enabled before delivery (%s)', async reenable => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    await saveSettings(settings)
    document.body.append(document.createElement('video'))
    let finish!: (reply: { text: string }) => void
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
      if ((message as { type?: string }).type === 'FETCH_NETFLIX_CAPTION') return new Promise(resolve => { finish = resolve }) as never
      const reply = { success: true, result: { seekCalled: true } }
      if (typeof callback === 'function') callback(reply)
      return Promise.resolve(reply) as never
    })
    const respond = (event: Event) => window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail: JSON.stringify({
      source: 'shortcut-override',
      id: JSON.parse((event as CustomEvent<string>).detail).id,
      metadata: { key: `123:disabled:${reenable}`, watchId: '123', url: 'https://a.nflxvideo.net/sub.vtt', currentMs: 3500 },
    }) }))
    window.addEventListener('shortcut-override:caption-request', respond)
    try {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd', bubbles: true, cancelable: true }))
      await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
      settings.subtitleNavigation.bindings.next.enabled = false
      await saveSettings(settings)
      if (reenable) {
        settings.subtitleNavigation.bindings.next.enabled = true
        await saveSettings(settings)
      }
      finish({ text: 'WEBVTT\n\n00:00:06.000 --> 00:00:07.000\nThree' })
      for (let index = 0; index < 12; index++) await Promise.resolve()
      expect(vi.mocked(chrome.runtime.sendMessage).mock.calls.some(([message]) => (message as { action?: string }).action === 'seekTo')).toBe(false)
    } finally { window.removeEventListener('shortcut-override:caption-request', respond) }
  })

  it('does not enqueue audio commands when volume down repeats at zero volume', async () => {
    const video = document.createElement('video')
    video.volume = 0
    video.muted = true
    document.body.append(video)

    const event = new KeyboardEvent('keydown', {
      code: 'ArrowDown',
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('0%')
    expect(document.querySelector('[data-hint-icon="volume-mute"]')).toHaveAttribute(
      'viewBox',
      '0 0 24 24'
    )
    expect(document.querySelector('[data-hint-icon="volume-mute"]')).toHaveAttribute('width', '48')
    expect(document.querySelectorAll('[data-hint-icon="volume-mute"] path')).toHaveLength(1)
    expect(document.querySelector('[data-hint-icon="volume-mute"] path')).toHaveAttribute(
      'd',
      expect.stringContaining('M12 4L9.91 6.09')
    )
    expect(document.querySelector('[data-hint-icon="volume-mute"] path')).toHaveAttribute(
      'd',
      expect.stringContaining('M19 12c0 .94')
    )
  })

  it('updates the volume hint without restarting it during rapid key presses', () => {
    const video = document.createElement('video')
    video.volume = 0.5
    document.body.append(video)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ArrowUp',
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      })
    )
    const hint = document.getElementById('shortcut-override-volume-hint')
    const circle = hint?.firstElementChild
    const label = document.getElementById('shortcut-override-volume-hint-label')

    const repeatedKeydown = new KeyboardEvent('keydown', {
      code: 'ArrowUp',
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(repeatedKeydown)

    expect(repeatedKeydown.defaultPrevented).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint')).toBe(hint)
    expect(hint?.firstElementChild).toBe(circle)
    expect(document.getElementById('shortcut-override-volume-hint-label')).toBe(label)
    expect(label).toHaveTextContent('60%')
  })

  it('stops handled shortcut events before later window listeners see them', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const netflixKeyHandler = vi.fn()
    window.addEventListener('keydown', netflixKeyHandler, true)

    const event = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    window.removeEventListener('keydown', netflixKeyHandler, true)
    expect(event.defaultPrevented).toBe(true)
    expect(netflixKeyHandler).not.toHaveBeenCalled()
  })

  it.each([
    ['seekBackward', 'ArrowLeft', 'ArrowLeft'],
    ['seekForward', 'ArrowRight', 'ArrowRight'],
    ['volumeUp', 'ArrowUp', 'ArrowUp'],
    ['volumeDown', 'ArrowDown', 'ArrowDown'],
    ['mute', 'KeyM', 'm'],
    ['fullscreen', 'KeyF', 'f'],
    ['skipIntro', 'KeyS', 's'],
  ] as const)('blocks the original Netflix key after %s is remapped', async (action, code, key) => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        [action]: {
          ...DEFAULT_SETTINGS.bindings[action],
          key: { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    document.body.append(video)
    const nativeKeyHandler = vi.fn()
    window.addEventListener('keydown', nativeKeyHandler, true)

    const event = new KeyboardEvent('keydown', { code, key, bubbles: true, cancelable: true })
    window.dispatchEvent(event)

    window.removeEventListener('keydown', nativeKeyHandler, true)
    expect(event.defaultPrevented).toBe(true)
    expect(nativeKeyHandler).not.toHaveBeenCalled()
  })

  it('does not block C after the extension subtitle shortcut is remapped', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        toggleSubtitles: {
          ...DEFAULT_SETTINGS.bindings.toggleSubtitles,
          key: { code: 'KeyV', key: 'v', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })
    await Promise.resolve()

    document.body.append(document.createElement('video'))
    const pageKeyHandler = vi.fn()
    window.addEventListener('keydown', pageKeyHandler, true)
    const event = new KeyboardEvent('keydown', {
      code: 'KeyC', key: 'c', bubbles: true, cancelable: true,
    })
    window.dispatchEvent(event)
    window.removeEventListener('keydown', pageKeyHandler, true)

    expect(event.defaultPrevented).toBe(false)
    expect(pageKeyHandler).toHaveBeenCalledOnce()
  })

  it('leaves Enter to Netflix after play/pause is remapped', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          key: { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    document.body.append(video)
    const nativeKeyHandler = vi.fn()
    window.addEventListener('keydown', nativeKeyHandler, true)

    const event = new KeyboardEvent('keydown', {
      code: 'Enter',
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    window.removeEventListener('keydown', nativeKeyHandler, true)
    expect(event.defaultPrevented).toBe(false)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()
  })

  it('sets preferred speed once and ignores keyboard repeat', () => {
    const video = document.createElement('video')
    video.playbackRate = 0.75
    document.body.append(video)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Quote',
      key: '"',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)

    expect(keydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1.5)
    expect(document.getElementById('shortcut-override-speed-hint')).toHaveTextContent('1.5x')
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)

    const repeatedKeydown = new KeyboardEvent('keydown', {
      code: 'Quote',
      key: '"',
      shiftKey: true,
      repeat: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(repeatedKeydown)

    expect(repeatedKeydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1.5)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
  })

  it('does not intercept the preferred-speed key when its action is disabled', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        setPreferredSpeed: {
          ...DEFAULT_SETTINGS.bindings.setPreferredSpeed,
          enabled: false,
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    video.playbackRate = 0.75
    document.body.append(video)
    const keydown = new KeyboardEvent('keydown', {
      code: 'Quote',
      key: '"',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)

    expect(keydown.defaultPrevented).toBe(false)
    expect(video.playbackRate).toBe(0.75)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('maps ArrowRight and ArrowLeft to the configured seek interval', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      seek: {
        seconds: 7,
      },
    })

    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)

    const forwardEvent = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(forwardEvent)

    const rewindEvent = new KeyboardEvent('keydown', {
      code: 'ArrowLeft',
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(rewindEvent)

    expect(forwardEvent.defaultPrevented).toBe(true)
    expect(rewindEvent.defaultPrevented).toBe(true)
    expect(video.currentTime).toBe(30)
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      1,
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'seek',
        value: 7000,
      },
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      2,
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'seek',
        value: -7000,
      },
      expect.any(Function)
    )
    const hint = document.getElementById('shortcut-override-media-hint')
    expect(hint).toBeNull()
    const seekHint = document.getElementById('shortcut-override-seek-hint')
    expect(seekHint?.textContent).toContain('−7')
    const seekIcon = seekHint?.querySelector('[data-hint-icon="seek-backward"]')
    expect(seekIcon).not.toBeNull()
    expect(seekIcon).toHaveAttribute('data-seek-arrow-count', '1')
    expect(seekIcon).toHaveAttribute('height', '30')
    expect(seekIcon).toHaveAttribute('stroke-width', '3.25')
    const seekLabel = seekHint?.querySelector<HTMLSpanElement>('span')
    const seekContent = seekHint?.querySelector<HTMLElement>('[data-hint-content="seek"]')
    expect(seekLabel).toHaveStyle({ fontSize: '24px', fontWeight: '700' })
    expect(seekHint?.style.transform).toBe('translateY(-50%)')
    expect(seekHint?.style.transition).toBe('opacity 100ms ease')
    expect(seekContent?.style.transform).toBe('')
  })

  it('does not intercept configured keys outside watch pages when no player is present', () => {
    window.history.replaceState(null, '', '/browse')

    const event = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    expect(document.getElementById('shortcut-override-media-hint')).toBeNull()
  })

  it('skips intro without adding a separate media hint', () => {
    const button = document.createElement('button')
    button.dataset.uia = 'skip-intro'
    button.textContent = 'Skip intro'
    button.getBoundingClientRect = () =>
      ({
        width: 120,
        height: 32,
        top: 0,
        right: 120,
        bottom: 32,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect
    const click = vi.fn()
    button.addEventListener('click', click)
    document.body.append(button)

    const event = new KeyboardEvent('keydown', {
      code: 'KeyS',
      key: 's',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    const hint = document.getElementById('shortcut-override-media-hint')
    expect(event.defaultPrevented).toBe(true)
    expect(click).toHaveBeenCalledTimes(1)
    expect(hint).toBeNull()
  })

  it.each([
    '略過介紹',
    '略過前情提要',
    '前回までのあらすじをスキップ',
    '줄거리 건너뛰기',
    'Skip Recap',
  ])(
    'recognizes localized Netflix skip copy: %s',
    label => {
      const button = document.createElement('button')
      button.textContent = label
      button.getBoundingClientRect = () =>
        ({
          width: 120,
          height: 32,
          top: 0,
          right: 120,
          bottom: 32,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect
      const click = vi.fn()
      button.addEventListener('click', click)
      document.body.append(button)

      const event = new KeyboardEvent('keydown', {
        code: 'KeyS',
        key: 's',
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(event)

      expect(event.defaultPrevented).toBe(true)
      expect(click).toHaveBeenCalledTimes(1)
    }
  )

  it('toggles fullscreen without showing a media hint', () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      value: requestFullscreen,
      configurable: true,
    })

    const event = new KeyboardEvent('keydown', {
      code: 'KeyF',
      key: 'f',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(requestFullscreen).toHaveBeenCalledTimes(1)
    expect(document.getElementById('shortcut-override-media-hint')).toBeNull()
  })

  it('routes the default C shortcut to the Netflix subtitle API', () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_message, callback) => {
      const reply = { success: true, result: { subtitleToggleCalled: true, subtitlesEnabled: false } }
      if (typeof callback === 'function') callback(reply)
      return Promise.resolve(reply) as never
    })
    const video = document.createElement('video')
    document.body.append(video)
    const event = new KeyboardEvent('keydown', {
      code: 'KeyC',
      key: 'c',
      bubbles: true,
      cancelable: true,
    })

    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'toggleSubtitles',
      },
      expect.any(Function)
    )
  })

  it.each([
    { key: 'X', locale: 'en', trackLanguage: 'ja', expected: 'Japanese (CC)' },
    { key: 'X', locale: 'zh-TW', trackLanguage: 'ja', expected: '日文 (CC)' },
    { key: 'X', locale: 'zh-TW', trackLanguage: 'not a language tag', expected: '日本語 (CC)' },
    { key: 'Z', locale: 'zh-TW', trackLanguage: 'ja', expected: '日文 (CC)' },
  ] as const)('cycles once per Shift+$key press and shows $expected in the $locale hint', async ({
    key, locale, trackLanguage, expected,
  }) => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale })
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_message, callback) => {
      const reply = {
        success: true,
        result: {
          subtitlesEnabled: true,
          subtitleTrack: '日本語 (CC)',
          subtitleTrackLanguage: trackLanguage,
          subtitleTrackIsClosedCaption: true,
        },
      }
      if (typeof callback === 'function') callback(reply)
      return Promise.resolve(reply) as never
    })
    document.body.append(document.createElement('video'))
    for (const repeat of [false, true]) {
      const event = new KeyboardEvent('keydown', {
        code: `Key${key}`, key, shiftKey: true, repeat, bubbles: true, cancelable: true,
      })
      window.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    }
    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'EXECUTE_NETFLIX_API',
        action: 'cycleSubtitleTrack',
        value: key === 'Z' ? -1 : undefined,
      }, expect.any(Function))
      expect(document.getElementById('shortcut-override-media-hint')).toHaveTextContent(expected)
    })
  })

  it('sends the current subtitle favorites and localizes the no-match hint', async () => {
    const subtitleFavorites = [{ language: 'ja' }] as const
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'zh-TW', subtitleFavorites: [...subtitleFavorites] })
    vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_message, callback) => {
      const reply = { success: true, result: { subtitleCycleOutcome: 'no-tracks-available' } }
      if (typeof callback === 'function') callback(reply)
      return Promise.resolve(reply) as never
    })
    document.body.append(document.createElement('video'))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyX', key: 'X', shiftKey: true, bubbles: true, cancelable: true,
    }))
    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'EXECUTE_NETFLIX_API', action: 'cycleSubtitleTrack', subtitleFavorites,
      }, expect.any(Function))
      expect(document.getElementById('shortcut-override-media-hint')).toHaveTextContent('找不到可切換的字幕。')
    })
  })
})
