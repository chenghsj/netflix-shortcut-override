import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHintManager } from '@/content/hints/hint-manager'
import { createShortcutCommandController } from './shortcut-command-controller'
import { DEFAULT_SETTINGS } from '@/shared/shortcuts'

describe('ShortcutCommandController', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    getHintManager(document).destroy()
    vi.useRealTimers()
  })

  it('ignores a late seek failure after a newer action', async () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('seekBackward', document)
    const seekRequest = vi.mocked(chrome.runtime.sendMessage).mock.calls[0]
    controller.execute('speedUp', document)

    const respondToSeek = seekRequest?.[1]
    if (typeof respondToSeek !== 'function') throw new Error('Expected seek response callback')
    respondToSeek({ success: false, error: 'stale seek' })
    await Promise.resolve()

    expect(document.getElementById('shortcut-override-speed-hint')?.textContent).toContain('1.25x')
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()
  })

  it('uses opposite directional icons for speed up and speed down', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('speedUp', document)
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toHaveAttribute(
      'stroke-linejoin',
      'round'
    )

    controller.execute('speedDown', document)
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toHaveAttribute(
      'stroke-linejoin',
      'round'
    )
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeNull()
  })

  it('uses the playback icon when resetting speed', () => {
    const video = document.createElement('video')
    video.playbackRate = 1.5
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('speedReset', document)

    expect(document.querySelector('[data-hint-icon="playback-play"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="playback-play"] path')).toHaveAttribute(
      'transform',
      'translate(1.25 0)'
    )
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeNull()
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toBeNull()
  })

  it('restores the playback rate and hides the hold hint on completion', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginSpaceInteraction(document, video, true)
    expect(controller.shouldInterceptSpaceRepeat()).toBe(true)
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-space-hold-hint')).not.toBeNull()

    expect(controller.completeSpaceInteraction()).toBe(true)

    expect(video.playbackRate).toBe(1)
    expect(controller.shouldInterceptSpaceRepeat()).toBe(false)
    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
  })

  it('does not restore the hold hint after a seek hint while Space remains pressed', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginSpaceInteraction(document, video, true)
    vi.advanceTimersByTime(250)
    controller.execute('seekForward', document)

    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-seek-hint')).not.toBeNull()

    vi.advanceTimersByTime(720)

    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-seek-hint')?.style.opacity).toBe('0')

    controller.completeSpaceInteraction()

    expect(document.getElementById('shortcut-override-space-hold-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-seek-hint')).toBeNull()
  })

  it('toggles playback on a short Space interaction', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    const pause = vi.fn()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginSpaceInteraction(document, video, true)
    expect(controller.completeSpaceInteraction()).toBe(true)

    expect(pause).toHaveBeenCalledOnce()
    expect(video.playbackRate).toBe(1)
  })

  it('restores the pre-press paused state after a Space hold', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    let paused = true
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
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginSpaceInteraction(document, video, true)
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(controller.completeSpaceInteraction()).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(paused).toBe(true)
    expect(pause).toHaveBeenCalledOnce()
  })

  it('renders volume feedback through the shared hint manager', () => {
    const video = document.createElement('video')
    video.volume = 0.65
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('volumeDown', document)).toBe(true)

    const volumeLabel = document.getElementById('shortcut-override-volume-hint-label')
    expect(volumeLabel?.textContent).toBe('60%')
    expect(volumeLabel?.style.top).toBe('10%')
    expect(volumeLabel?.style.bottom).toBe('')
    const volumeHint = document.getElementById('shortcut-override-volume-hint')
    expect(volumeHint?.style.width).toBe('100%')
    expect(volumeHint?.style.height).toBe('100%')
    expect(volumeHint?.querySelector('div')?.style.width).toBe('100px')
    expect(volumeHint?.querySelector('div')?.style.borderRadius).toBe('50%')
    expect(document.querySelectorAll('[id^="shortcut-override-"]').length).toBeGreaterThan(0)
  })

  it('uses the configured seek interval for both directions', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const settings = {
      ...DEFAULT_SETTINGS,
      seek: { seconds: 7 },
    }
    const controller = createShortcutCommandController(() => settings)

    expect(controller.execute('seekForward', document)).toBe(true)
    expect(controller.execute('seekBackward', document)).toBe(true)

    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'seek', value: 7000 }),
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'seek', value: -7000 }),
      expect.any(Function)
    )
  })

  it('accumulates feedback for consecutive seeks in the same direction', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('seekForward', document)
    controller.execute('seekForward', document)

    expect(document.getElementById('shortcut-override-seek-hint')).toHaveTextContent('+20')
  })
})
