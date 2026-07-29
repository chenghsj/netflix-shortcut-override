import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'

import { setupContentIndexTests } from '../shortcuts/content-script.test-support'

describe('content PiP shortcuts', () => {
  setupContentIndexTests()

  it('attempts the PiP shortcut without requiring the visible Netflix player root', async () => {
    window.history.replaceState(null, '', '/watch/123')

    const iframe = document.createElement('iframe')
    document.body.append(iframe)
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected iframe window for PiP shortcut test')

    Object.defineProperty(pipWindow, 'close', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: {
        requestWindow: vi.fn().mockResolvedValue(pipWindow),
      },
    })

    try {
      const video = document.createElement('video')
      document.body.append(video)

      const event = new KeyboardEvent('keydown', {
        code: 'KeyP',
        key: 'P',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(event)
      await Promise.resolve()
      await Promise.resolve()

      expect(event.defaultPrevented).toBe(true)
      expect(pipWindow.document.querySelector('video')).toBe(video)
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      pipWindow.close()
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
    }
  })

  it('does not intercept the PiP shortcut outside playback pages even when a video exists', () => {
    window.history.replaceState(null, '', '/browse')

    const video = document.createElement('video')
    document.body.append(video)
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { requestWindow: vi.fn() },
    })

    const event = new KeyboardEvent('keydown', {
      code: 'KeyP',
      key: 'P',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(video.parentElement).toBe(document.body)
    delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
  })

  it('does not intercept the PiP shortcut when PiP cannot start', () => {
    const event = new KeyboardEvent('keydown', {
      code: 'KeyP',
      key: 'P',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('uses Shift+P as a toggle shortcut for entering and exiting PiP', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected iframe window for PiP shortcut test')

    Object.defineProperty(pipWindow, 'close', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: {
        requestWindow: vi.fn().mockResolvedValue(pipWindow),
      },
    })

    try {
      const video = document.createElement('video')
      document.body.appendChild(video)

      const enterEvent = new KeyboardEvent('keydown', {
        code: 'KeyP',
        key: 'P',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      window.dispatchEvent(enterEvent)
      await Promise.resolve()
      await Promise.resolve()

      expect(enterEvent.defaultPrevented).toBe(true)
      expect(pipWindow.document.querySelector('video')).toBe(video)
      expect(document.getElementById('shortcut-override-media-hint')).toBeNull()

      const exitEvent = new KeyboardEvent('keydown', {
        code: 'KeyP',
        key: 'P',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
      pipWindow.dispatchEvent(exitEvent)
      await Promise.resolve()
      await Promise.resolve()

      expect(exitEvent.defaultPrevented).toBe(true)
      expect(video.parentElement).toBe(document.body)
      expect(document.getElementById('shortcut-override-media-hint')).toBeNull()
    } finally {
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
    }
  })

  it('handles Space in PiP even when play/pause and Space hold are disabled on the main page', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected iframe window for PiP shortcut test')

    Object.defineProperty(pipWindow, 'close', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: {
        requestWindow: vi.fn().mockResolvedValue(pipWindow),
      },
    })

    try {
      const video = document.createElement('video')
      let paused = false
      const pause = vi.fn(() => {
        paused = true
      })
      Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
      Object.defineProperty(video, 'pause', { configurable: true, value: pause })
      document.body.appendChild(video)

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyP',
          key: 'P',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
      await Promise.resolve()
      await Promise.resolve()

      await saveSettings({
        ...DEFAULT_SETTINGS,
        spaceHold: { ...DEFAULT_SETTINGS.spaceHold, enabled: false },
        bindings: {
          ...DEFAULT_SETTINGS.bindings,
          playPause: { ...DEFAULT_SETTINGS.bindings.playPause, enabled: false },
        },
      })
      await Promise.resolve()

      const keydown = new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
      const keyup = new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
      pipWindow.dispatchEvent(keydown)
      pipWindow.dispatchEvent(keyup)

      expect(keydown.defaultPrevented).toBe(true)
      expect(keyup.defaultPrevented).toBe(true)
      expect(pause).toHaveBeenCalledOnce()
      expect(paused).toBe(true)
      expect(
        pipWindow.document.getElementById('shortcut-override-playback-hint')
      ).not.toBeNull()
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      pipWindow.close()
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
    }
  })

  it('toggles playback on the first PiP click, including after refocus', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected iframe window for PiP click test')

    Object.defineProperty(pipWindow, 'close', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: {
        requestWindow: vi.fn().mockResolvedValue(pipWindow),
      },
    })

    try {
      const video = document.createElement('video')
      let paused = true
      const play = vi.fn(() => {
        paused = false
        return Promise.resolve()
      })
      const pause = vi.fn(() => {
        paused = true
      })
      Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
      Object.defineProperty(video, 'play', { configurable: true, value: play })
      Object.defineProperty(video, 'pause', { configurable: true, value: pause })
      document.body.appendChild(video)

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyP',
          key: 'P',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
      await Promise.resolve()
      await Promise.resolve()

      const firstClick = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true })
      pipWindow.dispatchEvent(firstClick)

      expect(firstClick.defaultPrevented).toBe(true)
      expect(play).toHaveBeenCalledOnce()
      expect(pause).not.toHaveBeenCalled()
      expect(paused).toBe(false)

      const secondClick = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true })
      pipWindow.dispatchEvent(secondClick)

      expect(secondClick.defaultPrevented).toBe(true)
      expect(play).toHaveBeenCalledOnce()
      expect(pause).toHaveBeenCalledOnce()
      expect(paused).toBe(true)

      pipWindow.dispatchEvent(new Event('blur'))
      pipWindow.dispatchEvent(new Event('focus'))

      const refocusClick = new MouseEvent('click', {
        button: 0,
        bubbles: true,
        cancelable: true,
      })
      pipWindow.dispatchEvent(refocusClick)

      expect(refocusClick.defaultPrevented).toBe(true)
      expect(play).toHaveBeenCalledTimes(2)
      expect(pause).toHaveBeenCalledOnce()
      expect(paused).toBe(false)
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      pipWindow.close()
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
    }
  })

  it('uses shared shortcut feedback and persists live PiP control settings', async () => {
    const iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected iframe window for PiP controls test')

    Object.defineProperty(pipWindow, 'close', { configurable: true, value: vi.fn() })
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { requestWindow: vi.fn().mockResolvedValue(pipWindow) },
    })

    try {
      await saveSettings({ ...DEFAULT_SETTINGS, locale: 'zh-TW', seek: { seconds: 5 } })
      await Promise.resolve()
      const video = document.createElement('video')
      video.volume = 0.05
      let paused = false
      const pause = vi.fn(() => {
        paused = true
      })
      Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
      Object.defineProperty(video, 'pause', { configurable: true, value: pause })
      document.body.appendChild(video)

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyP',
          key: 'P',
          shiftKey: true,
          bubbles: true,
          cancelable: true,
        })
      )
      await Promise.resolve()
      await Promise.resolve()

      const rewind = pipWindow.document.querySelector<HTMLButtonElement>(
        '[data-pip-control="seek-backward"]'
      )
      expect(rewind).toHaveAccessibleName('倒轉 5 秒')

      rewind?.focus()
      rewind?.click()
      expect(pipWindow.document.activeElement).toBe(pipWindow.document.body)

      const shortcutTarget = pipWindow.document.activeElement ?? pipWindow.document.body
      shortcutTarget.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'Space',
          key: ' ',
          bubbles: true,
          cancelable: true,
        })
      )
      shortcutTarget.dispatchEvent(
        new KeyboardEvent('keyup', {
          code: 'Space',
          key: ' ',
          bubbles: true,
          cancelable: true,
        })
      )
      expect(pause).toHaveBeenCalledOnce()

      pipWindow.document.querySelector<HTMLButtonElement>('[data-pip-control="mute"]')?.click()
      expect(video.muted).toBe(true)
      expect(
        pipWindow.document.querySelector(
          '[data-pip-control="mute"] [data-hint-icon="volume-mute"]'
        )
      ).not.toBeNull()
      expect(
        pipWindow.document.getElementById('shortcut-override-volume-hint-label')
      ).toHaveTextContent('0%')
      expect(pipWindow.document.querySelector('[data-pip-control="volume"]')).toHaveValue('0')

      const volumeSlider = pipWindow.document.querySelector<HTMLInputElement>(
        '[data-pip-control="volume"]'
      )
      if (!volumeSlider) throw new Error('Expected PiP volume slider')
      volumeSlider.value = '40'
      volumeSlider.dispatchEvent(new Event('change', { bubbles: true }))
      expect(
        pipWindow.document.getElementById('shortcut-override-volume-hint-label')
      ).toHaveTextContent('40%')
      expect(
        pipWindow.document.querySelector('[data-hint-icon="volume-up"]')
      ).not.toBeNull()

      await saveSettings({ ...DEFAULT_SETTINGS, locale: 'zh-TW', seek: { seconds: 25 } })
      await Promise.resolve()
      expect(rewind).toHaveAccessibleName('倒轉 25 秒')

      pipWindow.document
        .querySelector<HTMLButtonElement>('[data-pip-control="subtitles-button"]')
        ?.click()
      pipWindow.document
        .querySelector<HTMLButtonElement>('[data-pip-control="subtitle-switch"]')
        ?.click()
      await Promise.resolve()
      await Promise.resolve()
      expect((await getSettings()).pip.subtitlesEnabled).toBe(false)

      pipWindow.document
        .querySelector<HTMLButtonElement>('[data-pip-subtitle-nav="background"]')
        ?.click()
      pipWindow.document
        .querySelector<HTMLInputElement>('[data-pip-subtitle-background="dark"]')
        ?.click()
      await Promise.resolve()
      await Promise.resolve()
      expect((await getSettings()).pip.subtitleBackground).toBe('dark')
    } finally {
      pipWindow.dispatchEvent(new Event('pagehide'))
      pipWindow.close()
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
    }
  })
})
