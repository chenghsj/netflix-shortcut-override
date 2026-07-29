import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PlaybackCommandResult } from '@/content/netflix-playback-session'
import { PipControls } from './pip-controls'

const flushPromises = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const setVideoState = (
  video: HTMLVideoElement,
  state: {
    currentTime?: number
    duration?: number
    ended?: boolean
    muted?: boolean
    paused?: boolean
    volume?: number
  }
): void => {
  for (const [property, value] of Object.entries(state)) {
    Object.defineProperty(video, property, {
      configurable: true,
      get: () => value,
    })
  }
}

const createSeekTo = () =>
  vi.fn().mockResolvedValue({
    response: { success: true, result: { seekCalled: true } },
    failureLabel: null,
  })

describe('PipControls', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders Netflix-style controls from read-only video state', () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 8.5, duration: 240, paused: true, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const pipWindow = window
    const seekTo = createSeekTo()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow, video, videoArea, seekTo })
    controls.start()

    const root = videoArea.querySelector<HTMLElement>('[data-shortcut-override-pip-controls]')
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')

    expect(root).not.toBeNull()
    expect(root).toHaveAttribute('data-visible', 'true')
    expect(timeline).toHaveAttribute('max', '240')
    expect(timeline).toHaveValue('8.5')
    expect(videoArea.querySelector('[data-pip-control="current-time"]')).toHaveTextContent('0:08')
    expect(videoArea.querySelector('[data-pip-control="duration"]')).toHaveTextContent('4:00')
    expect(videoArea.querySelector('[data-pip-control="playback-status"]')).toBeNull()
    expect(videoArea.querySelector('[data-pip-control="seek-backward"]')).toHaveAccessibleName(
      'Rewind 10 seconds'
    )
    expect(videoArea.querySelector('[data-pip-control="seek-forward"]')).toHaveAccessibleName(
      'Forward 10 seconds'
    )
    expect(videoArea.querySelector('[data-pip-control="playback"]')).toHaveAccessibleName('Play')
    expect(
      videoArea.querySelector('[data-pip-control="playback"] [data-hint-icon="playback-play"]')
    ).not.toBeNull()
    expect(
      Array.from(
        videoArea.querySelector('[data-pip-control="transport"]')?.children ?? [],
        child => child.getAttribute('data-pip-control')
      )
    ).toEqual(['seek-backward', 'playback', 'seek-forward'])
    expect(videoArea.querySelector('[data-pip-control="mute"]')).toHaveAccessibleName('Mute')
    expect(videoArea.querySelector('[data-pip-control="mute"] [data-hint-icon="volume-up"]'))
      .not.toBeNull()
    expect(videoArea.querySelector('[data-pip-control="volume"]')).toHaveValue('70')
    const subtitleSvg = videoArea.querySelector(
      '[data-pip-control="subtitles-button"] [data-pip-icon="subtitles"]'
    )
    expect(subtitleSvg).not.toBeNull()
    expect(
      videoArea.querySelector('[data-pip-control="seek-backward"] [data-pip-icon="seek-backward"]')
    ).not.toBeNull()
    expect(
      videoArea.querySelector('[data-pip-control="seek-forward"] [data-pip-icon="seek-forward"]')
    ).not.toBeNull()
    expect(videoArea.querySelector('[data-pip-control="seek-backward"] text')).toBeNull()
    expect(videoArea.querySelector('[data-pip-control="seek-forward"] text')).toBeNull()

    controls.destroy()
  })

  it('switches the centered playback icon between play and pause state', () => {
    const video = document.createElement('video')
    let paused = true
    Object.defineProperties(video, {
      paused: { configurable: true, get: () => paused },
      ended: { configurable: true, value: false },
      currentTime: { configurable: true, value: 12 },
      duration: { configurable: true, value: 240 },
    })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo: createSeekTo() })
    controls.start()
    const playback = videoArea.querySelector<HTMLButtonElement>('[data-pip-control="playback"]')

    expect(playback).toHaveAccessibleName('Play')
    expect(playback).toHaveAttribute('data-paused', 'true')

    paused = false
    video.dispatchEvent(new Event('play'))
    expect(playback).toHaveAccessibleName('Pause')
    expect(playback).toHaveAttribute('data-paused', 'false')
    expect(playback?.querySelector('[data-hint-icon="playback-pause"]')).not.toBeNull()
    controls.destroy()
  })

  it('keeps the bottom audio button as an audible/muted toggle', () => {
    const video = document.createElement('video')
    video.volume = 0.25
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo: createSeekTo() })
    controls.start()
    const muteButton = videoArea.querySelector<HTMLButtonElement>('[data-pip-control="mute"]')

    expect(muteButton?.querySelector('[data-hint-icon="volume-up"]')).not.toBeNull()

    video.muted = true
    video.dispatchEvent(new Event('volumechange'))
    expect(muteButton?.querySelector('[data-hint-icon="volume-mute"]')).not.toBeNull()
    controls.destroy()
  })

  it('uses one absolute Netflix seek on timeline release without writing native currentTime', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const seekTo = createSeekTo()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(seekTo).toHaveBeenCalledOnce()
    expect(seekTo).toHaveBeenCalledWith(90_000)
    expect(video.currentTime).toBe(12)

    controls.destroy()
  })

  it('uses the injected playback command for absolute PiP seeks', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240 })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)

    const seekTo = createSeekTo()
    const resumeAfterSeek = vi.fn()
    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo,
      resumeAfterSeek,
    })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(seekTo).toHaveBeenCalledWith(90_000)
    expect(resumeAfterSeek).not.toHaveBeenCalled()
    controls.destroy()
  })

  it('reasserts playback after seeking an episode that was still playing', async () => {
    const video = document.createElement('video')
    setVideoState(video, {
      currentTime: 1_406,
      duration: 1_449,
      ended: false,
      paused: false,
    })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const seekTo = createSeekTo()
    const resumeAfterSeek = vi.fn().mockResolvedValue({
      response: { success: true, result: { action: 'play' } },
      failureLabel: null,
    })

    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo,
      resumeAfterSeek,
    })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '1200'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(seekTo).toHaveBeenCalledWith(1_200_000)
    expect(resumeAfterSeek).toHaveBeenCalledOnce()

    controls.destroy()
  })

  it('resumes Netflix playback when seeking back from an ended episode', async () => {
    const video = document.createElement('video')
    setVideoState(video, {
      currentTime: 240,
      duration: 240,
      ended: true,
      paused: true,
    })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const seekTo = createSeekTo()
    const resumeAfterSeek = vi.fn().mockResolvedValue({
      response: { success: true, result: { action: 'play' } },
      failureLabel: null,
    })

    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo,
      resumeAfterSeek,
    })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '180'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(seekTo).toHaveBeenCalledWith(180_000)
    expect(resumeAfterSeek).toHaveBeenCalledOnce()

    controls.destroy()
  })

  it('cancels the ended-episode resume when PiP closes during a seek', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 240, duration: 240, ended: true, paused: true })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    let resolveSeek: (result: PlaybackCommandResult) => void = () => undefined
    const seekTo = vi.fn(
      () =>
        new Promise<PlaybackCommandResult>(resolve => {
          resolveSeek = resolve
        })
    )
    const resumeAfterSeek = vi.fn().mockResolvedValue({
      response: { success: true, result: { action: 'play' } },
      failureLabel: null,
    })

    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo,
      resumeAfterSeek,
    })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '180'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    controls.destroy()
    resolveSeek({
      response: {
        success: true,
        result: {
          action: 'seekTo',
          playerApiFound: true,
          sessionIds: [],
          playerFound: true,
          seekCalled: true,
        },
      },
      failureLabel: null,
    })
    await flushPromises()

    expect(resumeAfterSeek).not.toHaveBeenCalled()
  })

  it('keeps the requested timeline position while Netflix confirms the seek', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const seekTo = createSeekTo()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    video.dispatchEvent(new Event('timeupdate'))
    expect(timeline).toHaveValue('90')
    expect(videoArea.querySelector('[data-pip-control="current-time"]')).toHaveTextContent('1:30')

    setVideoState(video, { currentTime: 90 })
    video.dispatchEvent(new Event('timeupdate'))
    setVideoState(video, { currentTime: 91 })
    video.dispatchEvent(new Event('timeupdate'))
    expect(timeline).toHaveValue('91')

    controls.destroy()
  })

  it('routes seek and mute buttons through the shared command callback', () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const seekTo = createSeekTo()
    const onAction = vi.fn()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo, onAction })
    controls.start()

    const rewindButton = videoArea.querySelector<HTMLButtonElement>(
      '[data-pip-control="seek-backward"]'
    )
    rewindButton?.focus()
    rewindButton?.click()
    expect(document.activeElement).toBe(document.body)
    videoArea.querySelector<HTMLButtonElement>('[data-pip-control="playback"]')?.click()
    videoArea.querySelector<HTMLButtonElement>('[data-pip-control="seek-forward"]')?.click()
    videoArea.querySelector<HTMLButtonElement>('[data-pip-control="mute"]')?.click()

    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      'seekBackward',
      'playPause',
      'seekForward',
      'mute',
    ])
    expect(seekTo).not.toHaveBeenCalled()

    controls.destroy()
  })

  it('updates seek button labels while PiP remains open', () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, volume: 0.7 })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo: createSeekTo() })
    controls.start()

    controls.updateSettings({
      seekSeconds: 25,
      pip: {
        subtitlesEnabled: true,
        subtitleSize: 'medium',
        subtitleBackground: 'translucent',
      },
      copy: {
        timeline: '播放時間軸',
        rewind: '倒轉 {seconds} 秒',
        forward: '快轉 {seconds} 秒',
        play: '播放',
        pause: '暫停',
        mute: '靜音',
        unmute: '解除靜音',
        volume: '音量',
        subtitles: '字幕',
        subtitlesEnabled: '字幕',
        back: '返回',
        subtitleFontSize: '字型大小',
        subtitleSmall: '小',
        subtitleMedium: '中',
        subtitleLarge: '大',
        subtitleBackground: '字幕背景',
        subtitleBackgroundNone: '無',
        subtitleBackgroundTranslucent: '半透明',
        subtitleBackgroundDark: '深色',
      },
    })

    expect(videoArea.querySelector('[data-pip-control="seek-backward"]')).toHaveAccessibleName(
      '倒轉 25 秒'
    )
    expect(videoArea.querySelector('[data-pip-control="seek-forward"]')).not.toHaveTextContent('25')
    expect(videoArea.querySelector('[data-pip-control="seek-forward"]')).toHaveAccessibleName(
      '快轉 25 秒'
    )
    controls.destroy()
  })

  it('throttles live volume input and commits the final value on release', () => {
    const video = document.createElement('video')
    video.volume = 0.7
    const videoArea = document.createElement('div')
    const onVolumeChange = vi.fn()
    document.body.append(videoArea)
    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: createSeekTo(),
      onVolumeChange,
    })
    controls.start()
    const slider = videoArea.querySelector<HTMLInputElement>('[data-pip-control="volume"]')
    if (!slider) throw new Error('Expected volume slider')

    slider.value = '35'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    slider.value = '40'
    slider.dispatchEvent(new Event('input', { bubbles: true }))
    expect(onVolumeChange).not.toHaveBeenCalled()

    slider.focus()
    expect(document.activeElement).toBe(slider)
    slider.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onVolumeChange).toHaveBeenCalledOnce()
    expect(onVolumeChange).toHaveBeenCalledWith(0.4)
    expect(document.activeElement).toBe(document.body)
    controls.destroy()
  })

  it('keeps controls visible while the subtitle menu is open and saves its choices', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    video.volume = 0.7
    const videoArea = document.createElement('div')
    const onPipSettingsChange = vi.fn()
    document.body.append(videoArea)
    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: createSeekTo(),
      onPipSettingsChange,
    })
    controls.start()
    const root = videoArea.querySelector<HTMLElement>('[data-shortcut-override-pip-controls]')
    const subtitlesButton = videoArea.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitles-button"]'
    )
    const menu = videoArea.querySelector<HTMLElement>('[data-pip-control="subtitle-menu"]')
    const toggle = videoArea.querySelector<HTMLButtonElement>('[data-pip-control="subtitle-switch"]')
    const sizeNav = videoArea.querySelector<HTMLButtonElement>('[data-pip-subtitle-nav="size"]')
    const backgroundNav = videoArea.querySelector<HTMLButtonElement>(
      '[data-pip-subtitle-nav="background"]'
    )
    const large = videoArea.querySelector<HTMLInputElement>('[data-pip-subtitle-size="large"]')
    const dark = videoArea.querySelector<HTMLInputElement>(
      '[data-pip-subtitle-background="dark"]'
    )

    subtitlesButton?.click()
    expect(menu).toHaveAttribute('data-open', 'true')
    expect(menu).toHaveAttribute('data-panel', 'main')
    expect(sizeNav).toHaveTextContent('Medium')
    expect(backgroundNav).toHaveTextContent('Translucent')
    vi.advanceTimersByTime(2_000)
    expect(root).toHaveAttribute('data-visible', 'true')

    toggle?.click()
    sizeNav?.click()
    expect(menu).toHaveAttribute('data-panel', 'size')
    expect(document.activeElement).toBe(
      videoArea.querySelector('[data-pip-subtitle-size="medium"]')
    )
    videoArea
      .querySelector<HTMLElement>('[data-pip-subtitle-panel-title="size"]')
      ?.click()
    expect(menu).toHaveAttribute('data-panel', 'main')
    expect(document.activeElement).toBe(sizeNav)

    sizeNav?.click()
    large?.click()
    expect(onPipSettingsChange).toHaveBeenNthCalledWith(1, {
      subtitlesEnabled: false,
      subtitleSize: 'medium',
      subtitleBackground: 'translucent',
    })
    expect(onPipSettingsChange).toHaveBeenNthCalledWith(2, {
      subtitlesEnabled: false,
      subtitleSize: 'large',
      subtitleBackground: 'translucent',
    })
    expect(menu).toHaveAttribute('data-panel', 'main')
    expect(document.activeElement).toBe(sizeNav)

    backgroundNav?.click()
    dark?.click()
    expect(onPipSettingsChange).toHaveBeenNthCalledWith(3, {
      subtitlesEnabled: false,
      subtitleSize: 'large',
      subtitleBackground: 'dark',
    })
    expect(menu).toHaveAttribute('data-panel', 'main')
    expect(document.activeElement).toBe(backgroundNav)

    backgroundNav?.click()
    menu?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(menu).toHaveAttribute('data-open', 'true')
    expect(menu).toHaveAttribute('data-panel', 'main')

    menu?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    )
    expect(menu).toHaveAttribute('data-open', 'false')
    expect(document.activeElement).toBe(document.body)
    controls.destroy()
  })

  it('closes the subtitle menu on PiP window blur without restoring PiP focus', () => {
    const video = document.createElement('video')
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: createSeekTo(),
    })
    controls.start()
    const subtitlesButton = videoArea.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitles-button"]'
    )
    const menu = videoArea.querySelector<HTMLElement>('[data-pip-control="subtitle-menu"]')
    const bodyFocus = vi.spyOn(document.body, 'focus')

    subtitlesButton?.click()
    expect(menu).toHaveAttribute('data-open', 'true')

    window.dispatchEvent(new Event('blur'))

    expect(menu).toHaveAttribute('data-open', 'false')
    expect(subtitlesButton).toHaveAttribute('aria-expanded', 'false')
    expect(bodyFocus).not.toHaveBeenCalled()
    controls.destroy()
  })

  it('shows seek failures and restores the last confirmed position', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 30, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const seekTo = vi.fn().mockResolvedValue({
      response: { success: false, error: 'Netflix rejected seek' },
      failureLabel: 'Seek failed: Netflix rejected seek',
    })
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '120'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(videoArea.querySelector('[data-pip-control="error"]')).toHaveTextContent(
      'Seek failed: Netflix rejected seek'
    )
    expect(timeline).toHaveValue('30')

    controls.destroy()
  })

  it('reveals controls on pointer movement, hides after idle, and removes listeners on destroy', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 0, duration: 240, paused: true, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const seekTo = createSeekTo()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, seekTo })
    controls.start()
    const root = videoArea.querySelector<HTMLElement>('[data-shortcut-override-pip-controls]')
    if (!root) throw new Error('Expected PiP controls')

    vi.advanceTimersByTime(2_900)
    expect(root).toHaveAttribute('data-visible', 'true')
    vi.advanceTimersByTime(200)
    expect(root).toHaveAttribute('data-visible', 'false')

    videoArea.dispatchEvent(new Event('mousemove'))
    expect(root).toHaveAttribute('data-visible', 'true')
    vi.advanceTimersByTime(3_100)
    expect(root).toHaveAttribute('data-visible', 'false')

    controls.destroy()
    expect(videoArea.querySelector('[data-shortcut-override-pip-controls]')).toBeNull()
    video.dispatchEvent(new Event('play'))
    expect(root.isConnected).toBe(false)
  })

  it('continues the idle countdown while a control is hovered', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 0, duration: 240, paused: true, volume: 0.7 })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: createSeekTo(),
    })
    controls.start()
    const root = videoArea.querySelector<HTMLElement>('[data-shortcut-override-pip-controls]')
    const rewind = videoArea.querySelector<HTMLElement>('[data-pip-control="seek-backward"]')

    rewind?.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(2_900)
    expect(root).toHaveAttribute('data-visible', 'true')
    vi.advanceTimersByTime(200)
    expect(root).toHaveAttribute('data-visible', 'false')
    controls.destroy()
  })
})
