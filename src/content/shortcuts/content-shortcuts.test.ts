import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'

import { setupContentIndexTests } from './content-script.test-support'

describe('content media shortcuts', () => {
  setupContentIndexTests()

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

  it('blocks Enter after play/pause is remapped', async () => {
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
    expect(event.defaultPrevented).toBe(true)
    expect(nativeKeyHandler).not.toHaveBeenCalled()
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
})
