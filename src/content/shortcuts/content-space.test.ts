import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'

import { setupContentIndexTests } from './content-script.test-support'

describe('content Space shortcuts', () => {
  setupContentIndexTests()

  it('returns short Space presses to Netflix when play/pause is disabled, even if hold speed is enabled', async () => {
    vi.useFakeTimers()
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          enabled: false,
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    video.playbackRate = 1
    document.body.append(video)
    const nativeKeyHandler = vi.fn()
    const nativeKeyupHandler = vi.fn()
    window.addEventListener('keydown', nativeKeyHandler, true)
    window.addEventListener('keyup', nativeKeyupHandler, true)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)
    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyup)

    window.removeEventListener('keydown', nativeKeyHandler, true)
    window.removeEventListener('keyup', nativeKeyupHandler, true)
    expect(keydown.defaultPrevented).toBe(false)
    expect(keyup.defaultPrevented).toBe(false)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()
    expect(nativeKeyupHandler).toHaveBeenCalledOnce()
    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-playback-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('leaves native Space play/pause and its UI entirely to Netflix while disabled', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      enabled: false,
    })
    await Promise.resolve()

    let paused = false
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', {
      configurable: true,
      get: () => paused,
    })
    document.body.append(video)

    const nativeKeyHandler = vi.fn(() => {
      paused = !paused
    })
    window.addEventListener('keydown', nativeKeyHandler, true)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)

    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyup)

    window.removeEventListener('keydown', nativeKeyHandler, true)
    expect(keydown.defaultPrevented).toBe(false)
    expect(keyup.defaultPrevented).toBe(false)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()
    expect(document.getElementById('shortcut-override-playback-hint')).toBeNull()
  })

  it('does not track or intercept Space when both native play/pause and Space hold are enabled off', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      spaceHold: { ...DEFAULT_SETTINGS.spaceHold, enabled: false },
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          enabled: false,
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    document.body.append(video)
    const nativeKeyHandler = vi.fn()
    const nativeKeyupHandler = vi.fn()
    window.addEventListener('keydown', nativeKeyHandler, true)
    window.addEventListener('keyup', nativeKeyupHandler, true)

    const keydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    const repeatedKeydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      repeat: true,
      bubbles: true,
      cancelable: true,
    })
    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)
    window.dispatchEvent(repeatedKeydown)
    window.dispatchEvent(keyup)

    window.removeEventListener('keydown', nativeKeyHandler, true)
    window.removeEventListener('keyup', nativeKeyupHandler, true)
    expect(keydown.defaultPrevented).toBe(false)
    expect(repeatedKeydown.defaultPrevented).toBe(false)
    expect(keyup.defaultPrevented).toBe(false)
    expect(nativeKeyHandler).toHaveBeenCalledTimes(2)
    expect(nativeKeyupHandler).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('keeps long-press Space speed active when play/pause is disabled', async () => {
    vi.useFakeTimers()
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          enabled: false,
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    let paused = false
    const pause = vi.fn(() => {
      paused = true
    })
    const play = vi.fn(() => {
      paused = false
      return Promise.resolve()
    })
    Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    Object.defineProperty(video, 'play', { value: play, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const nativeKeyHandler = vi.fn(() => {
      if (paused) void play()
      else pause()
    })
    const nativeKeyupHandler = vi.fn()
    window.addEventListener('keydown', nativeKeyHandler, true)
    window.addEventListener('keyup', nativeKeyupHandler, true)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-space-hold-hint')).not.toBeNull()

    const repeatedKeydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      repeat: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(repeatedKeydown)

    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    expect(repeatedKeydown.defaultPrevented).toBe(true)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()

    window.dispatchEvent(keyup)

    expect(video.playbackRate).toBe(1)
    expect(keyup.defaultPrevented).toBe(true)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()
    expect(nativeKeyupHandler).not.toHaveBeenCalled()
    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalledOnce()
    expect(paused).toBe(false)
    window.removeEventListener('keydown', nativeKeyHandler, true)
    window.removeEventListener('keyup', nativeKeyupHandler, true)
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

    const playbackHint = document.getElementById('shortcut-override-playback-hint')
    expect(playbackHint).not.toBeNull()
    expect(playbackHint?.querySelector('[data-hint-icon="playback-pause"]')).not.toBeNull()
    expect(playbackHint?.querySelector('rect[rx="1.25"]')).not.toBeNull()
    expect(playbackHint?.querySelector('svg')?.getAttribute('width')).toBe('56')
    expect(playbackHint?.textContent).toBe('')
    expect(playbackHint?.style.width).toBe('100px')
    expect(playbackHint?.style.height).toBe('100px')
    expect(playbackHint?.style.borderRadius).toBe('50%')
    expect(playbackHint?.style.background).toBe('rgba(0, 0, 0, 0.68)')

    vi.advanceTimersByTime(1_000)
    expect(playbackHint?.style.opacity).toBe('0')
  })

  it('keeps long-press Space speed independent from the play/pause binding', async () => {
    vi.useFakeTimers()
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          key: {
            ...DEFAULT_SETTINGS.bindings.playPause.key,
            code: 'KeyX',
            key: 'x',
          },
        },
      },
    })
    await Promise.resolve()

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
    vi.advanceTimersByTime(250)

    expect(keydown.defaultPrevented).toBe(false)
    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-space-hold-hint')).not.toBeNull()

    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )

    expect(video.playbackRate).toBe(1)
  })
})
