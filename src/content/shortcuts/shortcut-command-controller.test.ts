import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHintManager } from '@/content/hints/hint-manager'
import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import type { NetflixApiResponse } from '@/shared/netflix-api'
import { createShortcutCommandController } from './shortcut-command-controller'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { PipControls } from '@/content/pip/pip-controls'

describe('ShortcutCommandController', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    getHintManager(document).destroy()
    vi.useRealTimers()
  })

  it('routes keyboard, hold-speed, and PiP commands through one playback session', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'seek',
        playerApiFound: true,
        playerFound: true,
        seekCalled: true,
        sessionIds: ['session-id'],
      },
    })
    const playbackSession = createNetflixPlaybackSession(transport)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession)
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { configurable: true, value: false })
    video.playbackRate = 1
    document.body.append(video)

    controller.execute('seekForward', document)
    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)
    controller.completeHoldSpeedInteraction('Space')

    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 12 })
    Object.defineProperty(video, 'duration', { configurable: true, value: 240 })
    const pipControls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: milliseconds => playbackSession.seekTo(milliseconds),
    })
    pipControls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')
    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()

    expect(transport).toHaveBeenNthCalledWith(1, 'seek', 10_000)
    expect(transport).toHaveBeenNthCalledWith(2, 'setPlaybackRate', 2)
    expect(transport).toHaveBeenNthCalledWith(3, 'setPlaybackRate', 1)
    expect(transport).toHaveBeenNthCalledWith(4, 'seekTo', 90_000)
    pipControls.destroy()
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

  it('sets the configured preferred speed without toggling', () => {
    const video = document.createElement('video')
    video.playbackRate = 0.75
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('setPreferredSpeed', document)).toBe(true)
    expect(video.playbackRate).toBe(1.5)
    expect(document.getElementById('shortcut-override-speed-hint')).toHaveTextContent('1.5x')
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()

    expect(controller.execute('setPreferredSpeed', document)).toBe(true)
    expect(video.playbackRate).toBe(1.5)
  })

  it('toggles Netflix subtitles and shows the shared icon in the standard circular hint', async () => {
    const transport = vi.fn().mockResolvedValue({
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
    const playbackSession = createNetflixPlaybackSession(transport)
    const onSubtitlesToggled = vi.fn()
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession, {
      onSubtitlesToggled,
    })

    expect(controller.execute('toggleSubtitles', document)).toBe(true)
    await vi.waitFor(() => {
      expect(document.getElementById('shortcut-override-playback-hint')).toBeInTheDocument()
    })

    expect(transport).toHaveBeenCalledWith('toggleSubtitles')
    expect(onSubtitlesToggled).toHaveBeenCalledWith(false, document)
    const hint = document.getElementById('shortcut-override-playback-hint')
    const icon = hint?.querySelector('[data-hint-icon="subtitles"]')
    expect(hint).toHaveTextContent('')
    expect(hint).toHaveStyle({
      width: '92px',
      height: '92px',
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.68)',
      color: 'rgba(255, 255, 255, 0.62)',
    })
    expect(icon).toHaveAttribute('data-pip-icon', 'subtitles')
    expect(icon).toHaveAttribute('width', '56')
    expect(icon).toHaveAttribute('height', '56')
    expect(icon).toHaveAttribute('stroke', 'currentColor')
    expect(icon?.querySelector('[data-pip-icon-part="subtitle-lines"]')).toHaveAttribute(
      'd',
      'M6 11.5h7.5M16 11.5h4M6 16.5h3.5M12.5 16.5H20'
    )
  })

  it('serializes rapid subtitle shortcut commands', async () => {
    const resolvers: Array<(response: NetflixApiResponse) => void> = []
    const transport = vi.fn(
      () => new Promise<NetflixApiResponse>(resolve => resolvers.push(resolve))
    )
    const playbackSession = createNetflixPlaybackSession(transport)
    const onSubtitlesToggled = vi.fn()
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession, {
      onSubtitlesToggled,
    })

    controller.execute('toggleSubtitles', document)
    controller.execute('toggleSubtitles', document)
    expect(transport).toHaveBeenCalledTimes(1)

    resolvers[0]?.({
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
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2))

    resolvers[1]?.({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitleToggleCalled: true,
        subtitlesEnabled: true,
      },
    })
    await vi.waitFor(() => {
      expect(onSubtitlesToggled).toHaveBeenCalledWith(true, document)
    })
  })

  it('restores the playback rate and hides the hold hint on completion', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: true }))
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    expect(controller.shouldInterceptHoldSpeedRepeat('Space')).toBe(true)
    await vi.advanceTimersByTimeAsync(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).not.toBeNull()

    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)

    expect(video.playbackRate).toBe(1)
    expect(controller.shouldInterceptHoldSpeedRepeat('Space')).toBe(false)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
  })

  it('shows the hold hint while Netflix confirmation is still pending', () => {
    vi.useFakeTimers()
    const transport = vi.fn(() => new Promise<NetflixApiResponse>(() => undefined))
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(transport)
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toHaveTextContent('2x')

    controller.completeHoldSpeedInteraction('Space')
  })

  it('does not show the hold-speed rate hint when it is disabled', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const settings = {
      ...DEFAULT_SETTINGS,
      holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, showHint: false },
    }
    const controller = createShortcutCommandController(() => settings)

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()

    controller.completeHoldSpeedInteraction('Space')
  })

  it('does not present hold speed as active when Netflix rejects the rate change', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({
      success: false,
      error: 'Netflix player unavailable',
    })
    const playbackSession = createNetflixPlaybackSession(transport)
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      playbackSession
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    await vi.advanceTimersByTimeAsync(250)

    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
  })

  it('keeps the hold hint visible during a seek hint while the play key remains pressed', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: true }))
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    await vi.advanceTimersByTimeAsync(250)
    const holdHint = document.getElementById('shortcut-override-hold-speed-hint')
    expect(holdHint).not.toBeNull()
    controller.execute('seekForward', document)

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBe(holdHint)
    expect(holdHint?.style.opacity).toBe('1')
    expect(document.getElementById('shortcut-override-seek-hint')).not.toBeNull()

    vi.advanceTimersByTime(720)

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBe(holdHint)
    expect(holdHint?.style.opacity).toBe('1')

    controller.completeHoldSpeedInteraction('Space')

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-seek-hint')).not.toBeNull()
  })

  it('toggles playback on a short play-key interaction', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    const pause = vi.fn()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)

    expect(pause).toHaveBeenCalledOnce()
    expect(video.playbackRate).toBe(1)
  })

  it('ignores unrelated keyup events during a hold interaction', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginHoldSpeedInteraction(document, video, 'KeyX')

    expect(controller.completeHoldSpeedInteraction('ShiftLeft')).toBe(false)
    expect(controller.shouldInterceptHoldSpeedRepeat('KeyX')).toBe(true)
    vi.advanceTimersByTime(250)
    expect(video.playbackRate).toBe(2)

    expect(controller.completeHoldSpeedInteraction('KeyX')).toBe(true)
    expect(video.playbackRate).toBe(1)
  })

  it('restores the pre-press paused state after a play-key hold', () => {
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

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)
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
    expect(volumeHint?.querySelector('div')?.style.width).toBe('92px')
    expect(volumeHint?.querySelector('div')?.style.borderRadius).toBe('50%')
    expect(document.querySelectorAll('[id^="shortcut-override-"]').length).toBeGreaterThan(0)
  })

  it('renders muted volume feedback as zero percent', () => {
    const video = document.createElement('video')
    video.volume = 0.05
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('mute', document)).toBe(true)

    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('0%')
    expect(document.querySelector('[data-hint-icon="volume-mute"]')).toBeInTheDocument()
  })

  it('uses directional icons for volume shortcuts regardless of the resulting level', () => {
    const video = document.createElement('video')
    video.volume = 0.2
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('volumeUp', document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('25%')
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeNull()

    expect(controller.execute('volumeDown', document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('20%')
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeNull()
  })

  it('shows the volume slider direction with shared feedback', () => {
    const video = document.createElement('video')
    video.volume = 0.2
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.setVolume(0.45, document)).toBe(true)

    expect(video.volume).toBe(0.45)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('45%')
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeNull()

    expect(controller.setVolume(0.15, document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('15%')
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeNull()
  })

  it('uses the configured seek interval for both directions', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const onSeekRequested = vi.fn()
    const settings = {
      ...DEFAULT_SETTINGS,
      seek: { seconds: 7 },
    }
    const controller = createShortcutCommandController(
      () => settings,
      undefined,
      { onSeekRequested }
    )

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
    expect(onSeekRequested).toHaveBeenCalledTimes(2)
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
