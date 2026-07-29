import { describe, expect, it, vi } from 'vitest'

import {
  createNetflixPlaybackSession,
  type NetflixPlaybackTransport,
} from './netflix-playback-session'

const createTransport = (): ReturnType<typeof vi.fn> & NetflixPlaybackTransport =>
  vi.fn().mockResolvedValue({
    success: true,
    result: {
      action: 'play',
      playerApiFound: true,
      playerFound: true,
      seekCalled: true,
      sessionIds: ['session-id'],
    },
  })

describe('Netflix playback session', () => {
  it('routes playback commands and mirrors native display state in one seam', async () => {
    const transport = createTransport()
    let paused = true
    const play = vi.fn(() => {
      paused = false
      return Promise.resolve()
    })
    const pause = vi.fn(() => {
      paused = true
    })
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
    Object.defineProperty(video, 'play', { configurable: true, value: play })
    Object.defineProperty(video, 'pause', { configurable: true, value: pause })
    document.body.append(video)

    const session = createNetflixPlaybackSession(transport)

    const playResult = session.togglePlayback(video)
    const pauseResult = session.togglePlayback(video)
    const rateResult = session.setPlaybackRate(video, 1.25)
    await Promise.all([playResult, pauseResult, rateResult])

    expect(play).toHaveBeenCalledOnce()
    expect(pause).toHaveBeenCalledOnce()
    expect(video.playbackRate).toBe(1.25)
    expect(video.defaultPlaybackRate).toBe(1.25)
    expect(transport).toHaveBeenNthCalledWith(1, 'play')
    expect(transport).toHaveBeenNthCalledWith(2, 'pause')
    expect(transport).toHaveBeenNthCalledWith(3, 'setPlaybackRate', 1.25)
  })

  it('owns volume adjustment and mute restoration state', async () => {
    const transport = createTransport()
    const video = document.createElement('video')
    video.volume = 0.5
    document.body.append(video)
    const session = createNetflixPlaybackSession(transport)

    const increased = session.adjustVolume(video, 0.05)
    expect(increased).toMatchObject({ volume: 0.55, muted: false })
    expect(video.volume).toBe(0.55)

    const muted = session.toggleMute(video)
    expect(muted).toMatchObject({ volume: 0.55, muted: true })
    expect(video.muted).toBe(true)

    const unmuted = session.toggleMute(video)
    expect(unmuted).toMatchObject({ volume: 0.55, muted: false })
    expect(video.muted).toBe(false)
    expect(video.volume).toBe(0.55)
    await Promise.all([increased.completion, muted.completion, unmuted.completion])
    expect(transport).toHaveBeenNthCalledWith(1, 'setVolume', 0.55)
    expect(transport).toHaveBeenNthCalledWith(2, 'setMuted', 1)
    expect(transport).toHaveBeenNthCalledWith(3, 'unmuteWithVolume', 0.55)
  })

  it('sets an absolute volume and treats zero as mute', async () => {
    const transport = createTransport()
    const video = document.createElement('video')
    video.volume = 0.5
    const session = createNetflixPlaybackSession(transport)

    const muted = session.setVolume(video, 0)
    expect(muted).toMatchObject({ volume: 0, muted: true })
    expect(video.volume).toBe(0)
    expect(video.muted).toBe(true)

    const restored = session.setVolume(video, 0.35)
    expect(restored).toMatchObject({ volume: 0.35, muted: false })
    expect(video.volume).toBe(0.35)
    expect(video.muted).toBe(false)

    await Promise.all([muted.completion, restored.completion])
    expect(transport).toHaveBeenNthCalledWith(1, 'setVolume', 0)
    expect(transport).toHaveBeenNthCalledWith(2, 'setMuted', 1)
    expect(transport).toHaveBeenNthCalledWith(3, 'unmuteWithVolume', 0.35)
  })

  it('keeps relative and absolute seeks distinct and normalizes seek failures', async () => {
    const transport = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        result: {
          action: 'seek',
          playerApiFound: true,
          playerFound: true,
          seekCalled: true,
          sessionIds: ['session-id'],
        },
      })
      .mockResolvedValueOnce({
        success: true,
        result: {
          action: 'seekTo',
          playerApiFound: false,
          playerFound: false,
          seekCalled: false,
          sessionIds: [],
        },
      })
    const session = createNetflixPlaybackSession(transport)

    await expect(session.seekBy(10_000)).resolves.toEqual({
      response: expect.objectContaining({ success: true }),
      failureLabel: null,
    })
    await expect(session.seekTo(90_000)).resolves.toEqual({
      response: expect.objectContaining({ success: true }),
      failureLabel: 'Seek failed: no Netflix API',
    })
    expect(transport).toHaveBeenNthCalledWith(1, 'seek', 10_000)
    expect(transport).toHaveBeenNthCalledWith(2, 'seekTo', 90_000)
  })

  it('normalizes failures for non-seek commands shared by callers', async () => {
    const transport = vi.fn().mockResolvedValue({
      success: false,
      error: 'Netflix command rejected',
    })
    const video = document.createElement('video')
    const session = createNetflixPlaybackSession(transport)

    await expect(session.pause(video)).resolves.toEqual({
      response: { success: false, error: 'Netflix command rejected' },
      failureLabel: 'pause failed: Netflix command rejected',
    })
  })
})
