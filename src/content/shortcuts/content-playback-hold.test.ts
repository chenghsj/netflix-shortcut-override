import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'

import { setupContentIndexTests } from './content-script.test-support'

describe('content Play / Pause hold shortcuts', () => {
  setupContentIndexTests()

  beforeEach(() => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
      const apiMessage = message as { action?: unknown }
      const action =
        typeof apiMessage.action === 'string'
          ? apiMessage.action
          : 'diagnose'
      if (typeof callback === 'function') {
        callback({
          success: true,
          result: {
            action,
            playerApiFound: true,
            playerFound: true,
            seekCalled: false,
            sessionIds: ['session-id'],
          },
        })
      }
    })
  })

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
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
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

  it('does not track or intercept Space when play/pause and hold speed are disabled', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, enabled: false },
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

  it('does not activate hold speed when play/pause is disabled', async () => {
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
    await vi.advanceTimersByTimeAsync(250)

    const keyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keyup)

    expect(video.playbackRate).toBe(1)
    expect(keydown.defaultPrevented).toBe(false)
    expect(keyup.defaultPrevented).toBe(false)
    expect(nativeKeyHandler).toHaveBeenCalledOnce()
    expect(nativeKeyupHandler).toHaveBeenCalledOnce()
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
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
    expect(playbackHint?.style.width).toBe('92px')
    expect(playbackHint?.style.height).toBe('92px')
    expect(playbackHint?.style.borderRadius).toBe('50%')
    expect(playbackHint?.style.background).toBe('rgba(0, 0, 0, 0.68)')

    vi.advanceTimersByTime(1_000)
    expect(playbackHint?.style.opacity).toBe('0')
  })

  it('moves hold speed with the configured play/pause binding', async () => {
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
            key: 'X',
            shift: true,
          },
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)

    const oldKeydown = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(oldKeydown)
    await vi.advanceTimersByTimeAsync(250)

    expect(oldKeydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)

    const keydown = new KeyboardEvent('keydown', {
      code: 'KeyX',
      key: 'X',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(keydown)
    await vi.advanceTimersByTimeAsync(250)

    expect(keydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).not.toBeNull()

    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'KeyX',
        key: 'x',
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      })
    )

    expect(video.playbackRate).toBe(1)
  })

  it('keeps modifier-release repeats inside the active hold interaction', async () => {
    vi.useFakeTimers()
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          key: {
            code: 'ArrowRight',
            key: 'ArrowRight',
            ctrl: false,
            alt: false,
            shift: true,
            meta: false,
          },
        },
      },
    })
    await Promise.resolve()

    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'ArrowRight',
        key: 'ArrowRight',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    )
    await vi.advanceTimersByTimeAsync(250)
    expect(video.playbackRate).toBe(2)
    vi.mocked(chrome.runtime.sendMessage).mockClear()

    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'ShiftLeft',
        key: 'Shift',
        bubbles: true,
        cancelable: true,
      })
    )
    const repeatedKeydown = new KeyboardEvent('keydown', {
      code: 'ArrowRight',
      key: 'ArrowRight',
      repeat: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(repeatedKeydown)

    expect(repeatedKeydown.defaultPrevented).toBe(true)
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
    expect(video.playbackRate).toBe(2)

    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'ArrowRight',
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
    )
    expect(video.playbackRate).toBe(1)
  })

  it('restores hold speed when the playback document becomes hidden', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )
    await vi.advanceTimersByTimeAsync(250)
    expect(video.playbackRate).toBe(2)

    const visibilityState = vi
      .spyOn(document, 'visibilityState', 'get')
      .mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))

    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
    visibilityState.mockRestore()
  })

  it('ends hold speed when reset speed is pressed and keeps 1x after release', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1.5
    document.body.append(video)

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )
    await vi.advanceTimersByTimeAsync(250)
    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).not.toBeNull()

    const resetKeydown = new KeyboardEvent('keydown', {
      code: 'Slash',
      key: '?',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(resetKeydown)

    expect(resetKeydown.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-speed-hint')).toHaveTextContent('1x')

    const playPauseKeyup = new KeyboardEvent('keyup', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(playPauseKeyup)

    expect(playPauseKeyup.defaultPrevented).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-playback-hint')).toBeNull()
  })

  it.each([
    ['increase', 'Period', '>', 1.75],
    ['decrease', 'Comma', '<', 1.25],
    ['preferred', 'Quote', '"', 1.5],
  ] as const)(
    'ends hold speed when speed %s is pressed and keeps the new rate after release',
    async (_direction, code, key, expectedRate) => {
      vi.useFakeTimers()
      const video = document.createElement('video')
      Object.defineProperty(video, 'paused', { value: false, configurable: true })
      video.playbackRate = 1.5
      document.body.append(video)

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'Space',
          key: ' ',
          bubbles: true,
          cancelable: true,
        })
      )
      await vi.advanceTimersByTimeAsync(250)
      expect(video.playbackRate).toBe(2)

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code,
          key,
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )

      expect(video.playbackRate).toBe(expectedRate)
      expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()

      const playPauseKeyup = new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(playPauseKeyup)

      expect(playPauseKeyup.defaultPrevented).toBe(true)
      expect(video.playbackRate).toBe(expectedRate)
    }
  )
})
