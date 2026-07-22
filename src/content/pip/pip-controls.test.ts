import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import { PipControls, type PipControlActions } from './pip-controls'

const flushPromises = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

const setVideoState = (
  video: HTMLVideoElement,
  state: {
    currentTime?: number
    duration?: number
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

const createActions = (): PipControlActions => ({
  seekTo: vi.fn().mockResolvedValue({
    response: { success: true, result: { seekCalled: true } },
    failureLabel: null,
  }),
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
    const actions = createActions()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow, video, videoArea, actions })
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
    expect(videoArea.querySelector('[data-pip-control="seek-backward"]')).toBeNull()
    expect(videoArea.querySelector('[data-pip-control="seek-forward"]')).toBeNull()
    expect(videoArea.querySelector('[data-pip-control="mute"]')).toBeNull()

    controls.destroy()
  })

  it('uses one absolute Netflix seek on timeline release without writing native currentTime', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const actions = createActions()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, actions })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(actions.seekTo).toHaveBeenCalledOnce()
    expect(actions.seekTo).toHaveBeenCalledWith(90_000)
    expect(video.currentTime).toBe(12)

    controls.destroy()
  })

  it('uses the shared playback session for absolute PiP seeks', async () => {
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'seekTo',
        playerApiFound: true,
        playerFound: true,
        seekCalled: true,
        sessionIds: ['session-id'],
      },
    })
    const playbackSession = createNetflixPlaybackSession(transport)
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240 })
    const videoArea = document.createElement('div')
    document.body.append(videoArea)

    const controls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      playbackSession,
    })
    controls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()

    expect(transport).toHaveBeenCalledWith('seekTo', 90_000)
    controls.destroy()
  })

  it('keeps the requested timeline position while Netflix confirms the seek', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const actions = createActions()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, actions })
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

  it('keeps the timeline as the only transport control', () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 12, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const actions = createActions()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, actions })
    controls.start()

    expect(videoArea.querySelectorAll('button')).toHaveLength(0)
    expect(videoArea.querySelector('[data-pip-control="timeline"]')).not.toBeNull()
    expect(actions.seekTo).not.toHaveBeenCalled()

    controls.destroy()
  })

  it('shows seek failures and restores the last confirmed position', async () => {
    const video = document.createElement('video')
    setVideoState(video, { currentTime: 30, duration: 240, paused: false, muted: false, volume: 0.7 })
    const videoArea = document.createElement('div')
    const actions = createActions()
    actions.seekTo = vi.fn().mockResolvedValue({
      response: { success: false, error: 'Netflix rejected seek' },
      failureLabel: 'Seek failed: Netflix rejected seek',
    })
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, actions })
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
    const actions = createActions()
    document.body.append(videoArea)

    const controls = new PipControls({ pipWindow: window, video, videoArea, actions })
    controls.start()
    const root = videoArea.querySelector<HTMLElement>('[data-shortcut-override-pip-controls]')
    if (!root) throw new Error('Expected PiP controls')

    vi.advanceTimersByTime(1_100)
    expect(root).toHaveAttribute('data-visible', 'true')
    vi.advanceTimersByTime(200)
    expect(root).toHaveAttribute('data-visible', 'false')

    videoArea.dispatchEvent(new Event('mousemove'))
    expect(root).toHaveAttribute('data-visible', 'true')
    vi.advanceTimersByTime(1_300)
    expect(root).toHaveAttribute('data-visible', 'false')

    controls.destroy()
    expect(videoArea.querySelector('[data-shortcut-override-pip-controls]')).toBeNull()
    video.dispatchEvent(new Event('play'))
    expect(root.isConnected).toBe(false)
  })
})
