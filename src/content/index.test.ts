import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcuts'
import { saveSettings } from '@/shared/storage'

describe('content media shortcuts', () => {
  beforeAll(async () => {
    await import('@/content/index')
  })

  beforeEach(async () => {
    window.history.replaceState(null, '', '/watch/123')
    document.body.innerHTML = ''
    await saveSettings(DEFAULT_SETTINGS)
  })

  afterEach(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )
    vi.useRealTimers()
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

  it('uses one unmute command when volume up starts from silence', async () => {
    const video = document.createElement('video')
    video.volume = 0
    video.muted = true
    document.body.append(video)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ArrowUp',
        key: 'ArrowUp',
        bubbles: true,
        cancelable: true,
      })
    )

    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'unmuteWithVolume',
        value: 0.05,
      },
      expect.any(Function)
    )
    expect(video.muted).toBe(false)
    expect(video.volume).toBe(0.05)
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
    expect(hint?.textContent).toContain('-7s')
    expect(hint?.innerHTML).toContain('>7</text>')
    expect(hint?.innerHTML).not.toContain('>10</text>')
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

  it('uses a dedicated skip icon after skipping intro', () => {
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
    expect(hint?.textContent).toContain('Skipped')
    expect(hint?.innerHTML).toContain('data-hint-icon="skip-intro"')
    expect(hint?.innerHTML).not.toContain('M18 13c0 3.31')
  })

  it('adjusts playback speed through the configured binding and shows the Netflix Danmaku-style hint', () => {
    const video = document.createElement('video')
    video.playbackRate = 1
    document.body.append(video)

    const event = new KeyboardEvent('keydown', {
      code: 'Period',
      key: '>',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'setPlaybackRate',
        value: 1.25,
      },
      expect.any(Function)
    )
    expect(video.playbackRate).toBe(1.25)

    const hint = document.getElementById('shortcut-override-media-hint')
    expect(hint).not.toBeNull()
    expect(hint?.textContent).toContain('1.25x')
    expect((hint?.firstElementChild as HTMLElement | null)?.style.color).toBe('white')
    expect(hint?.innerHTML).not.toContain('2dd4bf')
    expect(hint?.style.background).toBe('rgba(48, 48, 48, 0.6)')
    expect(hint?.style.opacity).toBe('0.9')
    expect(hint?.style.transform).toBe('translate(-50%,-50%) scale(1)')
    expect(hint?.style.transition).toContain('cubic-bezier(0.2,0.8,0.2,1)')
  })

  it('does not skip directly to the minimum speed when decreasing with a large step', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      speed: {
        ...DEFAULT_SETTINGS.speed,
        step: 1.5,
      },
    })

    const video = document.createElement('video')
    video.playbackRate = 1.5
    document.body.append(video)

    const event = new KeyboardEvent('keydown', {
      code: 'Comma',
      key: '<',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'setPlaybackRate',
        value: 1,
      },
      expect.any(Function)
    )
    expect(video.playbackRate).toBe(1)
  })

  it('resets playback speed locally with Shift+?', () => {
    const video = document.createElement('video')
    video.playbackRate = 1.75
    document.body.append(video)

    const event = new KeyboardEvent('keydown', {
      code: 'Slash',
      key: '?',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'setPlaybackRate',
        value: 1,
      },
      expect.any(Function)
    )
    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-media-hint')?.textContent).toContain('1x')
  })

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

  it('keeps a Space tap as play/pause and waits until keyup', () => {
    vi.useFakeTimers()

    const video = document.createElement('video')
    const pause = vi.fn()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    document.body.append(video)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)

    expect(keydown.defaultPrevented).toBe(true)
    expect(pause).not.toHaveBeenCalled()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()

    vi.advanceTimersByTime(249)

    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyup)

    expect(keyup.defaultPrevented).toBe(true)
    expect(pause).toHaveBeenCalledTimes(1)
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EXECUTE_NETFLIX_API',
        action: 'pause',
      }),
      expect.any(Function)
    )
  })

  it('temporarily switches to the configured hold speed while Space is held', () => {
    vi.useFakeTimers()

    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)

    expect(keydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      1,
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'setPlaybackRate',
        value: 2,
      },
      expect.any(Function)
    )

    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyup)

    expect(keyup.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      2,
      {
        type: 'EXECUTE_NETFLIX_API',
        action: 'setPlaybackRate',
        value: 1,
      },
      expect.any(Function)
    )
  })
})
