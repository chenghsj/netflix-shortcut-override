import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'

import { setupContentIndexTests } from '../shortcuts/content-script.test-support'

const createDocumentPipFixture = () => {
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const pipWindow = iframe.contentWindow
  if (!pipWindow) throw new Error('Expected iframe window for PiP test')

  const close = vi.fn()
  const requestWindow = vi.fn().mockResolvedValue(pipWindow)
  Object.defineProperty(pipWindow, 'close', {
    configurable: true,
    value: close,
  })
  Object.defineProperty(window, 'documentPictureInPicture', {
    configurable: true,
    value: { requestWindow },
  })

  return {
    pipWindow,
    cleanup: () => {
      pipWindow.dispatchEvent(new Event('pagehide'))
      pipWindow.close()
      iframe.remove()
      delete (window as Window & { documentPictureInPicture?: unknown })
        .documentPictureInPicture
    },
  }
}

describe('content PiP shortcuts', () => {
  setupContentIndexTests()

  it('lets the first Space press resume playback after an automatic episode transition', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

    try {
      const initialVideo = document.createElement('video')
      document.body.appendChild(initialVideo)

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

      initialVideo.dispatchEvent(new Event('ended'))

      let paused = true
      const nextVideo = document.createElement('video')
      nextVideo.getBoundingClientRect = () =>
        ({
          x: 0,
          y: 0,
          top: 0,
          right: 640,
          bottom: 360,
          left: 0,
          width: 640,
          height: 360,
          toJSON: () => ({}),
        }) as DOMRect
      Object.defineProperties(nextVideo, {
        paused: { configurable: true, get: () => paused },
        readyState: {
          configurable: true,
          value: HTMLMediaElement.HAVE_CURRENT_DATA,
        },
        play: {
          configurable: true,
          value: vi.fn(() => {
            paused = false
            nextVideo.dispatchEvent(new Event('playing'))
            return Promise.resolve()
          }),
        },
        pause: {
          configurable: true,
          value: vi.fn(() => {
            paused = true
          }),
        },
      })
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()

      expect(pipWindow.close).toHaveBeenCalledOnce()

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
      window.dispatchEvent(keydown)
      window.dispatchEvent(keyup)
      await Promise.resolve()
      await Promise.resolve()

      expect(keydown.defaultPrevented).toBe(true)
      expect(keyup.defaultPrevented).toBe(true)
      expect(nextVideo.play).toHaveBeenCalledOnce()
      expect(nextVideo.paused).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('attempts the PiP shortcut without requiring the visible Netflix player root', async () => {
    window.history.replaceState(null, '', '/watch/123')

    const { pipWindow, cleanup } = createDocumentPipFixture()

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
      cleanup()
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
    const { pipWindow, cleanup } = createDocumentPipFixture()

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
      cleanup()
    }
  })

  it('handles Space in PiP even when play/pause and Space hold are disabled on the main page', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

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
      cleanup()
    }
  })

  it('toggles playback on the first PiP click, including after refocus', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

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
      cleanup()
    }
  })

  it('initializes PiP subtitle visibility from the Netflix API state', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

    try {
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
        const request = message as unknown as { action?: string }
        if (request.action === 'getSubtitleState' && typeof callback === 'function') {
          callback({
            success: true,
            result: {
              action: 'getSubtitleState',
              playerApiFound: true,
              playerFound: true,
              seekCalled: false,
              sessionIds: ['session-id'],
              subtitlesEnabled: false,
              subtitleTrack: 'Off',
            },
          })
        }
        return undefined as never
      })

      await saveSettings({
        ...DEFAULT_SETTINGS,
        pip: { ...DEFAULT_SETTINGS.pip, subtitlesEnabled: true },
      })
      const video = document.createElement('video')
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

      await vi.waitFor(() => {
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({ action: 'getSubtitleState' }),
          expect.any(Function)
        )
      })
      await vi.waitFor(() => {
        expect(
          pipWindow.document.querySelector('[data-pip-control="subtitle-switch"]')
        ).toHaveAttribute('aria-checked', 'false')
      })
      expect((await getSettings()).pip.subtitlesEnabled).toBe(false)
    } finally {
      cleanup()
    }
  })

  it('uses shared shortcut feedback and persists live PiP control settings', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

    try {
      let nativeSubtitlesEnabled = true
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
        const request = message as unknown as { action?: string }
        if (
          request.action === 'toggleSubtitles'
        ) {
          nativeSubtitlesEnabled = !nativeSubtitlesEnabled
          if (typeof callback === 'function') {
            callback({
              success: true,
              result: {
                action: 'toggleSubtitles',
                playerApiFound: true,
                playerFound: true,
                seekCalled: false,
                sessionIds: ['session-id'],
                subtitleToggleCalled: true,
                subtitlesEnabled: nativeSubtitlesEnabled,
              },
            })
          }
        }
        return undefined as never
      })

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
      await vi.waitFor(async () => {
        expect((await getSettings()).pip.subtitlesEnabled).toBe(false)
      })

      pipWindow.document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyC',
          key: 'c',
          bubbles: true,
          cancelable: true,
        })
      )
      await vi.waitFor(async () => {
        expect((await getSettings()).pip.subtitlesEnabled).toBe(true)
      })
      expect(
        pipWindow.document.querySelector('[data-pip-control="subtitle-switch"]')
      ).toHaveAttribute('aria-checked', 'true')
      expect(
        pipWindow.document.getElementById('shortcut-override-playback-hint')
      ).toHaveStyle({
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.68)',
      })
      expect(
        pipWindow.document.querySelector(
          '#shortcut-override-playback-hint [data-pip-icon="subtitles"]'
        )
      ).not.toBeNull()

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
      cleanup()
    }
  })

  it('persists a PiP subtitle shortcut result after PiP closes', async () => {
    const { pipWindow, cleanup } = createDocumentPipFixture()

    try {
      let respondToSubtitleToggle: ((response: unknown) => void) | undefined
      vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
        const request = message as unknown as { action?: string }
        if (request.action === 'toggleSubtitles' && typeof callback === 'function') {
          respondToSubtitleToggle = callback as (response: unknown) => void
        }
        return undefined as never
      })

      const video = document.createElement('video')
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

      pipWindow.dispatchEvent(
        new KeyboardEvent('keydown', {
          code: 'KeyC',
          key: 'c',
          bubbles: true,
          cancelable: true,
        })
      )
      expect(respondToSubtitleToggle).toBeTypeOf('function')

      pipWindow.dispatchEvent(
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
      expect(video.parentElement).toBe(document.body)

      respondToSubtitleToggle?.({
        success: true,
        result: {
          action: 'toggleSubtitles',
          playerApiFound: true,
          playerFound: true,
          seekCalled: false,
          sessionIds: ['session-id'],
          subtitleToggleCalled: true,
          subtitlesEnabled: false,
        },
      })

      await vi.waitFor(async () => {
        expect((await getSettings()).pip.subtitlesEnabled).toBe(false)
      })
    } finally {
      cleanup()
    }
  })
})
