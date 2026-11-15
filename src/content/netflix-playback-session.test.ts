import { describe, expect, it, vi } from 'vitest'
import type { NetflixApiResponse } from '@/shared/netflix-api'

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
  it('treats frame stepping as a new playback intent and does not resume a pending PiP seek', async () => {
    let finishSeek: (response: NetflixApiResponse) => void = () => undefined
    const transport = vi.fn().mockImplementation((action: string) => action === 'seekTo'
      ? new Promise<NetflixApiResponse>(resolve => { finishSeek = resolve })
      : Promise.resolve({ success: true, result: { seekCalled: true } }))
    const session = createNetflixPlaybackSession(transport)
    const video = document.createElement('video')
    const play = vi.fn()
    Object.defineProperties(video, { paused: { value: false }, play: { value: play } })
    const seeking = session.seekTo(5_000, { video, isCurrent: () => true })
    await expect(session.stepFrame(-1)).resolves.toMatchObject({ failureLabel: null })
    finishSeek({ success: true, result: { action: 'seekTo', playerApiFound: true, playerFound: true, seekCalled: true, sessionIds: [] } })
    await seeking
    expect(transport).toHaveBeenCalledWith('stepFrame', -1)
    expect(play).not.toHaveBeenCalled()
  })

  it('serializes audio changes and recovers after a failed command', async () => {
    let finishFirst: (response: NetflixApiResponse) => void = () => undefined
    const transport = vi.fn().mockImplementationOnce(() => new Promise<NetflixApiResponse>(resolve => { finishFirst = resolve }))
      .mockResolvedValue({ success: true, result: { audioTrackSwitchCalled: true, audioTrack: '日本語', audioTrackLanguage: 'ja' } })
    const session = createNetflixPlaybackSession(transport)
    const first = session.cycleAudioTrack(1)
    const second = session.cycleAudioTrack(-1)
    expect(transport).toHaveBeenCalledTimes(1)
    finishFirst({ success: false, error: 'unavailable' })
    expect((await first).failureLabel).toContain('unavailable')
    await expect(second).resolves.toMatchObject({ failureLabel: null, track: { name: '日本語', language: 'ja' } })
    expect(transport).toHaveBeenLastCalledWith('cycleAudioTrack', -1)
  })

  it('preserves the audio-description distinction for localized hints', async () => {
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        audioTrackSwitchCalled: true, audioTrack: '日本語', audioTrackLanguage: 'ja', audioTrackIsAudioDescription: true,
      },
    })
    await expect(createNetflixPlaybackSession(transport).cycleAudioTrack(1)).resolves.toMatchObject({
      failureLabel: null, track: { name: '日本語', language: 'ja', isAudioDescription: true },
    })
  })

  it('retains each queued command’s audio preferences and reports unavailable favorites without a failure', async () => {
    const transport = vi.fn().mockResolvedValue({ success: true, result: { audioCycleOutcome: 'no-tracks-available' } })
    const session = createNetflixPlaybackSession(transport)
    const firstFavorites = [{ language: 'en', audioDescription: true }]
    const secondFavorites = [{ language: 'ja', audioDescription: false }]
    const first = session.cycleAudioTrack(1, undefined, firstFavorites)
    const second = session.cycleAudioTrack(-1, undefined, secondFavorites)
    await expect(first).resolves.toMatchObject({ noTracksAvailable: true, failureLabel: null })
    await second
    expect(transport.mock.calls).toEqual([
      ['cycleAudioTrack', 1, undefined, firstFavorites], ['cycleAudioTrack', -1, undefined, secondFavorites],
    ])
  })

  it('drops queued audio changes when the originating playback is no longer available', async () => {
    let finish: (response: NetflixApiResponse) => void = () => undefined
    const transport = vi.fn(() => new Promise<NetflixApiResponse>(resolve => { finish = resolve }))
    const session = createNetflixPlaybackSession(transport)
    let available = true
    const first = session.cycleAudioTrack(1)
    const queued = session.cycleAudioTrack(1, () => available)
    available = false
    finish({ success: false, error: 'old playback' })
    await Promise.all([first, queued])
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each([
    { paused: false, ended: false, resumes: true },
    { paused: true, ended: true, resumes: true },
    { paused: true, ended: false, resumes: false },
  ])('preserves playback after a view seek from $paused / ended $ended', async ({ paused, ended, resumes }) => {
    const video = document.createElement('video')
    const play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperties(video, {
      paused: { value: paused }, ended: { value: ended }, play: { value: play },
    })
    const transport = createTransport()
    const session = createNetflixPlaybackSession(transport)
    await session.seekTo(90_000, { video, isCurrent: () => true })
    expect(transport).toHaveBeenCalledWith('seekTo', 90_000)
    expect(play).toHaveBeenCalledTimes(resumes ? 1 : 0)
  })

  it('does not resume after a failed seek even if the video was playing', async () => {
    const video = document.createElement('video')
    const play = vi.fn().mockResolvedValue(undefined)
    Object.defineProperties(video, { paused: { value: false }, play: { value: play } })
    const session = createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: false, error: 'seek rejected' }))
    const result = await session.seekTo(90_000, { video, isCurrent: () => true })
    expect(result.failureLabel).toContain('seek rejected')
    expect(play).not.toHaveBeenCalled()
  })

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

  it('reports a playback-rate failure when no Netflix player is available', async () => {
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'setPlaybackRate',
        playerApiFound: true,
        playerFound: false,
        seekCalled: false,
        sessionIds: [],
      },
    })
    const video = document.createElement('video')
    const session = createNetflixPlaybackSession(transport)

    const result = await session.setPlaybackRate(video, 2)

    expect(result.failureLabel).toBe('setPlaybackRate failed: no Netflix player')
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

const subtitleResponse = (subtitlesEnabled: boolean): NetflixApiResponse => ({
  success: true,
  result: {
    action: 'toggleSubtitles', playerApiFound: true, playerFound: true,
    seekCalled: false, sessionIds: ['session-id'], subtitleToggleCalled: true,
    subtitlesEnabled,
  },
})

describe('subtitle confirmation through the playback session', () => {
  it.each(['toggle', 'track'] as const)('discards a read superseded by a successful %s command', async command => {
    let finishRead!: (response: NetflixApiResponse) => void
    const transport = vi.fn((action: string) => action === 'getSubtitleState'
      ? new Promise<NetflixApiResponse>(resolve => { finishRead = resolve })
      : Promise.resolve(subtitleResponse(false)))
    const session = createNetflixPlaybackSession(transport)
    const initial = session.getSubtitleState()
    const confirmed = await (command === 'toggle' ? session.toggleSubtitles() : session.cycleSubtitleTrack())
    expect(confirmed).toMatchObject({ subtitlesEnabled: false, failureLabel: null })
    finishRead(subtitleResponse(true))
    expect(await initial).toMatchObject({ subtitlesEnabled: null })
  })

  it('preserves an independent state read when a subtitle command fails', async () => {
    let finishRead!: (response: NetflixApiResponse) => void
    const transport = vi.fn((action: string) => action === 'getSubtitleState'
      ? new Promise<NetflixApiResponse>(resolve => { finishRead = resolve })
      : Promise.reject(new Error('Unavailable')))
    const session = createNetflixPlaybackSession(transport)
    const initial = session.getSubtitleState()
    expect(await session.toggleSubtitles()).toMatchObject({ subtitlesEnabled: null, failureLabel: 'toggleSubtitles failed: Unavailable' })
    finishRead(subtitleResponse(true))
    expect(await initial).toMatchObject({ subtitlesEnabled: true, failureLabel: null })
  })

  it('serializes a track command after a failed toggle and accepts later state reads', async () => {
    let failToggle!: (error: Error) => void
    const transport = vi.fn((action: string) => action === 'toggleSubtitles'
      ? new Promise<NetflixApiResponse>((_, reject) => { failToggle = reject })
      : Promise.resolve(subtitleResponse(true)))
    const session = createNetflixPlaybackSession(transport)
    const toggle = session.toggleSubtitles()
    const track = session.cycleSubtitleTrack([{ language: 'ja' }], -1)
    expect(transport).toHaveBeenCalledTimes(1)
    failToggle(new Error('Unavailable'))
    await expect(toggle).resolves.toMatchObject({ subtitlesEnabled: null })
    await expect(track).resolves.toMatchObject({ subtitlesEnabled: true, failureLabel: null })
    expect(transport).toHaveBeenNthCalledWith(2, 'cycleSubtitleTrack', -1, [{ language: 'ja' }])
    await expect(session.getSubtitleState()).resolves.toMatchObject({ subtitlesEnabled: true })
  })

  it('distinguishes no matching track from an unconfirmed toggle', async () => {
    const transport = vi.fn()
      .mockResolvedValueOnce({ success: true, result: { subtitleCycleOutcome: 'no-tracks-available' } })
      .mockResolvedValueOnce({ success: true, result: { subtitleToggleCalled: true } })
    const session = createNetflixPlaybackSession(transport)
    await expect(session.cycleSubtitleTrack()).resolves.toMatchObject({
      subtitlesEnabled: null, failureLabel: null, noTracksAvailable: true,
    })
    await expect(session.toggleSubtitles()).resolves.toMatchObject({
      subtitlesEnabled: null, failureLabel: 'Unable to toggle subtitles', noTracksAvailable: false,
    })
  })

  it('rechecks queued subtitle availability after a failed toggle and accepts later commands', async () => {
    let finishToggle!: (response: NetflixApiResponse) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<NetflixApiResponse>(resolve => { finishToggle = resolve }))
      .mockResolvedValue(subtitleResponse(true))
    const session = createNetflixPlaybackSession(transport)
    let available = true
    const toggle = session.toggleSubtitles()
    const track = session.cycleSubtitleTrack([{ language: 'ja' }], -1, () => available)
    available = false
    finishToggle({ success: false, error: 'old playback' })
    await toggle
    await expect(track).resolves.toMatchObject({ subtitlesEnabled: null, failureLabel: null, noTracksAvailable: false })
    expect(transport).toHaveBeenCalledTimes(1)

    available = true
    await expect(session.cycleSubtitleTrack(undefined, 1, () => available)).resolves.toMatchObject({ subtitlesEnabled: true })
    expect(transport).toHaveBeenLastCalledWith('cycleSubtitleTrack')
  })
})
