import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCaptionMetadata } from './subtitle-navigation'
import { CAPTION_REQUEST_EVENT, CAPTION_RESPONSE_EVENT } from '@/shared/netflix-caption-events'
import type { SubtitleFavorite } from '@/shared/subtitle-favorites'

import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'

type BridgeResponse = {
  id?: string
  success?: boolean
  result?: {
    playerApiFound?: boolean
    playerFound?: boolean
    sessionId?: string
    seekCalled?: boolean
    currentTime?: number
    targetTime?: number
    subtitleToggleCalled?: boolean
    subtitlesEnabled?: boolean
    subtitleTrack?: string
    subtitleDiagnostics?: string
  }
}

const callBridge = (
  action: string, value?: number, subtitleFavorites?: readonly SubtitleFavorite[], audioFavorites?: unknown,
): BridgeResponse | null => {
  const id = `test-${action}-${value ?? 'none'}`
  let response: BridgeResponse | null = null
  const handleResponse = (event: Event) => {
    const detail = 'detail' in event ? (event.detail as BridgeResponse) : null
    if (detail?.id === id) response = detail
  }

  window.addEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
  window.dispatchEvent(
    new CustomEvent(NETFLIX_API_REQUEST_EVENT, {
      detail: { source: 'shortcut-override', id, action, value, subtitleFavorites, audioFavorites },
    })
  )
  window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)

  return response
}

describe('main-world Netflix API bridge', () => {
  beforeAll(async () => {
    await import('@/content/netflix-api-bridge')
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    window.history.replaceState(null, '', '/')
    delete (window as typeof window & { netflix?: unknown }).netflix
    delete (window as typeof window & { documentPictureInPicture?: unknown })
      .documentPictureInPicture
    delete (window as typeof window & { __shortcutOverrideSubtitleState?: unknown })
      .__shortcutOverrideSubtitleState
  })

  it('normalizes favorite audio preferences before choosing the requested variant', () => {
    const standard = { trackId: 'en', bcp47: 'en' }
    const description = { trackId: 'en-ad', bcp47: 'en', rawTrackType: 'ASSISTIVE' }
    const setAudioTrack = vi.fn()
    const player = { getAudioTrackList: () => [standard, description], getAudioTrack: () => standard, setAudioTrack }
    Object.assign(window, { netflix: { appContext: { state: { playerApp: { getAPI: () => ({
      videoPlayer: { getAllPlayerSessionIds: () => ['player'], getVideoPlayerBySessionId: () => player },
    }) } } } } })
    expect(callBridge('cycleAudioTrack', 1, undefined, [
      { language: ' EN ', audioDescription: true }, { language: 'en', audioDescription: true }, null,
    ])).toMatchObject({ success: true, result: { audioTrackSwitchCalled: true } })
    expect(setAudioTrack).toHaveBeenCalledExactlyOnceWith(description)
  })

  it('marks the DOM when the page bridge is ready', () => {
    expect(document.documentElement.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR)).toBe('ready')
  })

  it('round-trips caption metadata using string details in both worlds', async () => {
    window.history.replaceState(null, '', '/watch/123')
    const track = { trackId: 'en', ttDownloadables: { 'webvtt-lssdh': {
      downloadUrls: { main: 'https://a.nflxvideo.net/sub.vtt' },
    } } }
    const player = { getCurrentTime: () => 3500, getTextTrack: () => track, getTextTrackList: () => [track] }
    Object.assign(window, { netflix: { appContext: { state: { playerApp: { getAPI: () => ({
      videoPlayer: { getAllPlayerSessionIds: () => ['player'], getVideoPlayerBySessionId: () => player },
    }) } } } } })
    const details: unknown[] = []
    const observe = (event: Event) => details.push((event as CustomEvent).detail)
    window.addEventListener(CAPTION_REQUEST_EVENT, observe)
    window.addEventListener(CAPTION_RESPONSE_EVENT, observe)
    try {
      await expect(requestCaptionMetadata()).resolves.toMatchObject({
        key: '123:player:en', watchId: '123', url: 'https://a.nflxvideo.net/sub.vtt', currentMs: 3500,
      })
      expect(details).toHaveLength(2)
      expect(details.every(detail => typeof detail === 'string')).toBe(true)
    } finally {
      window.removeEventListener(CAPTION_REQUEST_EVENT, observe)
      window.removeEventListener(CAPTION_RESPONSE_EVENT, observe)
    }
  })

  it('returns caption failure codes through the string protocol', async () => {
    await expect(requestCaptionMetadata()).rejects.toThrow('watch')
  })

  it('ignores malformed or untrusted caption requests', () => {
    const respond = vi.fn()
    window.addEventListener(CAPTION_RESPONSE_EVENT, respond)
    try {
      for (const detail of ['{', 'null', '[]', JSON.stringify({ source: 'other', id: 'test' }), { source: 'shortcut-override', id: 'test' }]) {
        window.dispatchEvent(new CustomEvent(CAPTION_REQUEST_EVENT, { detail }))
      }
      expect(respond).not.toHaveBeenCalled()
    } finally { window.removeEventListener(CAPTION_RESPONSE_EVENT, respond) }
  })

  it('uses the Netflix player seek API without mutating native video time', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)
    const seek = vi.fn()

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({
                    seek,
                    getCurrentTime: () => 30000,
                  }),
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('seek', 10000)

    expect(seek).toHaveBeenCalledWith(40000)
    expect(video.currentTime).toBe(30)
    expect(response?.success).toBe(true)
    expect(response?.result?.playerApiFound).toBe(true)
    expect(response?.result?.playerFound).toBe(true)
    expect(response?.result?.seekCalled).toBe(true)
    expect(response?.result?.currentTime).toBe(30000)
    expect(response?.result?.targetTime).toBe(40000)
  })

  it('uses the requested absolute position for PiP timeline seeks', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)
    const seek = vi.fn()

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({
                    seek,
                    getCurrentTime: () => 30000,
                  }),
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('seekTo', 90000)

    expect(seek).toHaveBeenCalledWith(90000)
    expect(video.currentTime).toBe(30)
    expect(response?.result?.currentTime).toBe(30000)
    expect(response?.result?.targetTime).toBe(90000)
    expect(response?.result?.seekCalled).toBe(true)
  })

  it('turns Netflix subtitles off and restores the previous track', () => {
    const noneTrack = { id: 'none', displayName: 'Off', isNoneTrack: true }
    const englishTrack = { id: 'en', displayName: 'English', bcp47: 'en' }
    let currentTrack = englishTrack
    const setTextTrack = vi.fn((track: typeof noneTrack | typeof englishTrack) => {
      currentTrack = track as typeof englishTrack
    })

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({
                    getCurrentTime: () => 30_000,
                    getTextTrackList: () => [noneTrack, englishTrack],
                    getTextTrack: () => currentTrack,
                    setTextTrack,
                  }),
                },
              }),
            },
          },
        },
      },
    })

    const disabled = callBridge('toggleSubtitles')
    const enabled = callBridge('toggleSubtitles')

    expect(setTextTrack).toHaveBeenNthCalledWith(1, noneTrack)
    expect(setTextTrack).toHaveBeenNthCalledWith(2, englishTrack)
    expect(disabled?.result).toEqual(
      expect.objectContaining({
        subtitleToggleCalled: true,
        subtitlesEnabled: false,
        subtitleTrack: 'Off',
      })
    )
    expect(enabled?.result).toEqual(
      expect.objectContaining({
        subtitleToggleCalled: true,
        subtitlesEnabled: true,
        subtitleTrack: 'English',
      })
    )
  })

  const mockPlayer = (player: Record<string, unknown>) => {
    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({ getCurrentTime: () => 30_000, ...player }),
                },
              }),
            },
          },
        },
      },
    })
  }

  it('toggles subtitles using the audio-matched forced narrative track when no noneTrack exists', () => {
    const frenchForced = { trackId: 'T:2:0;1;fr;0;0;0;0;', bcp47: 'fr', displayName: 'Off', isForcedNarrative: true }
    const frenchSub = { trackId: 'T:2:0;1;fr;1;1;0;0;', bcp47: 'fr', displayName: 'Français', isForcedNarrative: false }
    let current = frenchSub
    const setTextTrack = vi.fn((track: typeof frenchForced) => { current = track })
    mockPlayer({
      getAudioTrack: () => ({ bcp47: 'fr' }),
      getTextTrackList: () => [frenchForced, frenchSub],
      getTextTrack: () => ({ trackId: current.trackId, bcp47: current.bcp47 }),
      setTextTrack,
    })

    expect(callBridge('toggleSubtitles')?.result).toMatchObject({ subtitleToggleCalled: true, subtitlesEnabled: false, subtitleTrack: 'Off' })
    expect(callBridge('getSubtitleState')?.result).toMatchObject({ subtitlesEnabled: false })
    expect(callBridge('toggleSubtitles')?.result).toMatchObject({ subtitleToggleCalled: true, subtitlesEnabled: true, subtitleTrack: 'Français' })
    expect(setTextTrack).toHaveBeenNthCalledWith(1, frenchForced)
    expect(setTextTrack).toHaveBeenNthCalledWith(2, frenchSub)
  })

  it('falls back to visibility and DOM hiding when neither noneTrack nor forced narrative track exists, and clears on manual track change', () => {
    const english = { id: 'en', displayName: 'English', bcp47: 'en' }
    const french = { id: 'fr', displayName: 'Français', bcp47: 'fr' }
    let current = english
    const setTimedTextVisibility = vi.fn()
    mockPlayer({
      getTextTrackList: () => [english, french],
      getTextTrack: () => current,
      setTextTrack: vi.fn((next: typeof english) => { current = next }),
      setTimedTextVisibility,
    })

    expect(callBridge('toggleSubtitles')?.result).toMatchObject({ subtitleToggleCalled: true, subtitlesEnabled: false, subtitleTrack: 'Off' })
    expect(setTimedTextVisibility).toHaveBeenCalledWith(false)
    expect(document.documentElement.getAttribute('data-shortcut-override-subtitles-hidden')).toBe('true')

    expect(callBridge('toggleSubtitles')?.result).toMatchObject({ subtitleToggleCalled: true, subtitlesEnabled: true, subtitleTrack: 'English' })
    expect(setTimedTextVisibility).toHaveBeenLastCalledWith(true)
    expect(document.documentElement.getAttribute('data-shortcut-override-subtitles-hidden')).toBeNull()

    callBridge('toggleSubtitles')
    current = french
    expect(callBridge('getSubtitleState')?.result).toMatchObject({ subtitlesEnabled: true, subtitleTrack: 'Français' })
    expect(document.documentElement.getAttribute('data-shortcut-override-subtitles-hidden')).toBeNull()
  })

  it('retries forced narrative when noneTrack is ignored, preserves displayName variant, and reports diagnostics', () => {
    const staleNone = { id: 'none', displayName: 'Off', isNoneTrack: true }
    const jaForced = { id: 'ja-fn', bcp47: 'ja', displayName: 'Off (Forced)', isForcedNarrative: true }
    const zhCc = { id: 'zh-cc-v1', bcp47: 'zh-Hant', displayName: '中文（繁體）[CC]' }
    const zhNormal = { id: 'zh-normal-v1', bcp47: 'zh-Hant', displayName: '中文（繁體）' }
    let current: { id: string; displayName: string; bcp47?: string } = zhNormal
    let tracks = [staleNone, jaForced, zhCc, zhNormal]
    const setTextTrack = vi.fn((next: typeof current) => {
      if (next !== staleNone) current = next
    })
    mockPlayer({
      getAudioTrack: () => ({ bcp47: 'ja' }),
      getTextTrackList: () => tracks,
      getTextTrack: () => current,
      setTextTrack,
    })

    expect(callBridge('toggleSubtitles')?.result?.subtitlesEnabled).toBe(false)
    expect(setTextTrack).toHaveBeenNthCalledWith(1, staleNone)
    expect(setTextTrack).toHaveBeenNthCalledWith(2, jaForced)

    const regeneratedZhNormal = { ...zhNormal, id: 'zh-normal-v2' }
    tracks = [jaForced, { ...zhCc, id: 'zh-cc-v2' }, regeneratedZhNormal]
    expect(callBridge('toggleSubtitles')?.result).toMatchObject({ subtitlesEnabled: true, subtitleTrack: '中文（繁體）' })
    expect(setTextTrack).toHaveBeenLastCalledWith(regeneratedZhNormal)
    expect(callBridge('diagnose')?.result).toMatchObject({ subtitleDiagnostics: '2 selectable (3 total, off: forced-narrative)' })
  })

  it('cycles regular and CC tracks while skipping Off and forced tracks', () => {
    const off = { id: 'none', displayName: 'Off', isNoneTrack: true }
    const forced = { id: 'ja-fn', bcp47: 'ja', isForcedNarrative: true }
    const english = { id: 'en', bcp47: 'en', displayName: 'English' }
    const englishCc = { id: 'en-cc', bcp47: 'en', displayName: 'English [CC]' }
    const japanese = { id: 'ja', bcp47: 'ja', displayName: '日本語', trackType: 'ASSISTIVE' }
    let current: { id: string } = off
    const setTextTrack = vi.fn((track: typeof current) => { current = track })
    mockPlayer({
      getTimedTextTrackList: () => [off, english, forced, englishCc, japanese],
      getTimedTextTrack: () => ({ id: current.id }),
      setTimedTextTrack: setTextTrack,
    })

    for (const track of [english, englishCc, japanese, english]) {
      expect(callBridge('cycleSubtitleTrack')?.result).toMatchObject({
        subtitlesEnabled: true,
        subtitleTrack: track.displayName,
        subtitleTrackLanguage: track.bcp47,
        subtitleTrackIsClosedCaption: track !== english,
      })
      expect(setTextTrack).toHaveBeenLastCalledWith(track)
    }
    expect(callBridge('cycleSubtitleTrack', -1)?.result).toMatchObject({ subtitleTrackLanguage: 'ja' })
    expect(setTextTrack).toHaveBeenLastCalledWith(japanese)
    callBridge('cycleSubtitleTrack')
    callBridge('toggleSubtitles')
    expect(setTextTrack).toHaveBeenLastCalledWith(off)
    callBridge('toggleSubtitles')
    expect(setTextTrack).toHaveBeenLastCalledWith(english)
  })

  it('leaves a single active subtitle track selected', () => {
    const english = { id: 'en', bcp47: 'en', displayName: 'English', rawTrackType: 'closedcaptions' }
    const setTextTrack = vi.fn()
    mockPlayer({
      getTextTrackList: () => [english],
      getTextTrack: () => english,
      setTextTrack,
    })
    expect(callBridge('cycleSubtitleTrack')?.result).toMatchObject({
      subtitlesEnabled: true,
      subtitleTrack: 'English',
    })
    expect(setTextTrack).not.toHaveBeenCalled()
  })

  it('cycles available favorites in order and reevaluates them when the title changes', () => {
    const off = { id: 'none', isNoneTrack: true }
    const englishUS = { id: 'en-us', bcp47: 'en-US', rawTrackType: 'closedcaptions' }
    const englishUK = { id: 'en-gb', bcp47: 'en-GB', rawTrackType: 'closedcaptions' }
    const chinese = { id: 'zh', bcp47: 'zh' }
    const traditional = { id: 'zh-tw', bcp47: 'zh-TW', rawTrackType: 'closedcaptions' }
    const simplified = { id: 'zh-cn', bcp47: 'zh-CN', rawTrackType: 'closedcaptions' }
    const japanese = { id: 'ja', bcp47: 'ja' }
    const japaneseCC = { id: 'ja-cc', bcp47: 'ja', rawTrackType: 'closedcaptions' }
    let current: { id: string } = off
    let tracks = [off, englishUS, japanese, chinese, simplified, englishUK, traditional, japaneseCC]
    const setTextTrack = vi.fn((next: typeof current) => { current = next })
    mockPlayer({
      getTextTrackList: () => tracks,
      getTextTrack: () => current,
      setTextTrack,
    })
    const favorites = [
      { language: 'en' },
      { language: 'zh-Hant' },
      { language: 'ja' },
      { language: 'en-US' },
    ] as const
    const cycle = (direction?: -1) => callBridge('cycleSubtitleTrack', direction, favorites)?.result

    for (const track of [englishUK, traditional, japanese, englishUS, englishUK]) {
      expect(cycle()).toMatchObject({ subtitleTrackLanguage: track.bcp47, subtitlesEnabled: true })
      expect(setTextTrack).toHaveBeenLastCalledWith(track)
    }
    current = off
    for (const track of [englishUS, japanese, traditional, englishUK, englishUS]) {
      expect(cycle(-1)).toMatchObject({ subtitleTrackLanguage: track.bcp47, subtitlesEnabled: true })
      expect(setTextTrack).toHaveBeenLastCalledWith(track)
    }

    tracks = [off, chinese, simplified, japanese]
    current = japanese
    setTextTrack.mockClear()
    expect(cycle(-1)).toMatchObject({ subtitleTrackLanguage: 'ja', subtitleTrackIsClosedCaption: false })
    expect(setTextTrack).not.toHaveBeenCalled()

    tracks = [off, japaneseCC]
    expect(cycle()).toMatchObject({ subtitleTrackIsClosedCaption: true, subtitlesEnabled: true })
    expect(setTextTrack).toHaveBeenCalledExactlyOnceWith(japaneseCC)
    cycle()
    expect(setTextTrack).toHaveBeenCalledTimes(1)
  })

  it.each([
    { favorite: 'en', regularLanguage: 'en-US', ccLanguage: 'en', useRegular: true },
    { favorite: 'zh-Hant', regularLanguage: 'zh-TW', ccLanguage: 'zh-Hant', useRegular: true },
    { favorite: 'en-US', regularLanguage: 'en-Latn-US', ccLanguage: 'en-US', useRegular: true },
    { favorite: 'en-US', regularLanguage: 'en-GB', ccLanguage: 'en-US', useRegular: false },
    { favorite: 'zh-Hant', regularLanguage: 'zh-Hans', ccLanguage: 'zh-Hant', useRegular: false },
  ])('respects regular-subtitle preference and locale constraints for $favorite with $regularLanguage', ({
    favorite, regularLanguage, ccLanguage, useRegular,
  }) => {
    const off = { id: 'none', isNoneTrack: true }
    const regular = { id: 'regular', bcp47: regularLanguage }
    const cc = { id: 'cc', bcp47: ccLanguage, rawTrackType: 'closedcaptions' }
    const setTextTrack = vi.fn()
    mockPlayer({
      getTextTrackList: () => [off, cc, regular],
      getTextTrack: () => off,
      setTextTrack,
    })

    expect(callBridge('cycleSubtitleTrack', undefined, [{ language: favorite }])?.result)
      .toMatchObject({ subtitlesEnabled: true, subtitleTrackIsClosedCaption: !useRegular })
    expect(setTextTrack).toHaveBeenCalledExactlyOnceWith(useRegular ? regular : cc)
  })

  it('reserves a regular regional track before falling back to CC for a generic favorite', () => {
    const off = { id: 'none', isNoneTrack: true }
    const regular = { id: 'en-us', bcp47: 'en-US' }
    const cc = { id: 'en-cc', bcp47: 'en', rawTrackType: 'closedcaptions' }
    let current: { id: string } = off
    const setTextTrack = vi.fn((track: typeof current) => { current = track })
    mockPlayer({
      getTextTrackList: () => [off, regular, cc],
      getTextTrack: () => current,
      setTextTrack,
    })
    const favorites = [{ language: 'en' }, { language: 'en-US' }]

    for (const track of [cc, regular, cc]) {
      callBridge('cycleSubtitleTrack', undefined, favorites)
      expect(setTextTrack).toHaveBeenLastCalledWith(track)
    }
  })

  it('prefers regular subtitles for favorites and falls back to CC when needed', () => {
    const off = { id: 'none', isNoneTrack: true }
    const japanese = { id: 'ja', bcp47: 'ja' }
    const japaneseCC = { id: 'ja-cc', bcp47: 'ja', rawTrackType: 'closedcaptions' }
    const english = { id: 'en', bcp47: 'en' }
    let current: { id: string } = off
    let tracks = [off, japaneseCC, japanese, english]
    const setTextTrack = vi.fn((track: typeof current) => { current = track })
    mockPlayer({ getTextTrackList: () => tracks, getTextTrack: () => current, setTextTrack })
    const favorite = { language: 'ja' } as const

    expect(callBridge('cycleSubtitleTrack', undefined, [favorite])?.result)
      .toMatchObject({ subtitleTrackIsClosedCaption: false })
    expect(setTextTrack).toHaveBeenLastCalledWith(japanese)

    tracks = [off, japaneseCC, english]
    expect(callBridge('cycleSubtitleTrack', undefined, [favorite])?.result)
      .toMatchObject({ subtitleTrackIsClosedCaption: true })
    expect(setTextTrack).toHaveBeenLastCalledWith(japaneseCC)

    tracks = [off, english]
    setTextTrack.mockClear()
    expect(callBridge('cycleSubtitleTrack', undefined, [favorite])?.result)
      .toMatchObject({ subtitleCycleOutcome: 'no-tracks-available' })
    expect(setTextTrack).not.toHaveBeenCalled()
  })

  it('reads the selected Netflix subtitle track without changing it', () => {
    const englishTrack = { id: 'en', displayName: 'English', bcp47: 'en' }
    const setTextTrack = vi.fn()

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({
                    getCurrentTime: () => 30_000,
                    getTextTrackList: () => [englishTrack],
                    getTextTrack: () => englishTrack,
                    setTextTrack,
                  }),
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('getSubtitleState')

    expect(response?.result).toEqual(
      expect.objectContaining({
        subtitlesEnabled: true,
        subtitleTrack: 'English',
      })
    )
    expect(setTextTrack).not.toHaveBeenCalled()
  })

  it('reports when the Netflix subtitle API is unavailable', () => {
    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({ getCurrentTime: () => 30_000 }),
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('toggleSubtitles')

    expect(response?.success).toBe(true)
    expect(response?.result?.subtitleToggleCalled).not.toBe(true)
  })

  it('seeks and resumes the PiP episode instead of the first preview session', () => {
    const previewVideo = document.createElement('video')
    const episodeVideo = document.createElement('video')
    Object.defineProperties(previewVideo, {
      currentTime: { configurable: true, value: 0 },
      duration: { configurable: true, value: 87 },
      paused: { configurable: true, value: true },
    })
    Object.defineProperties(episodeVideo, {
      currentTime: { configurable: true, value: 1_406 },
      duration: { configurable: true, value: 1_449 },
      paused: { configurable: true, value: false },
    })
    const iframe = document.createElement('iframe')
    document.body.append(previewVideo, iframe)
    if (!iframe.contentWindow) throw new Error('Expected PiP window')
    iframe.contentWindow.document.body.append(episodeVideo)
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { window: iframe.contentWindow },
    })
    const previewSeek = vi.fn()
    const episodeSeek = vi.fn()
    const previewPlay = vi.fn()
    const episodePlay = vi.fn()

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['preview-session', 'episode-session'],
                  getVideoPlayerBySessionId: (id: string) =>
                    id === 'preview-session'
                      ? { play: previewPlay, seek: previewSeek, getCurrentTime: () => 0 }
                      : {
                          play: episodePlay,
                          seek: episodeSeek,
                          getCurrentTime: () => 1_406_000,
                        },
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('seekTo', 1_200_000)

    document.body.append(episodeVideo)
    Object.defineProperty(episodeVideo, 'paused', { configurable: true, value: true })
    delete (window as typeof window & { documentPictureInPicture?: unknown })
      .documentPictureInPicture
    const playResponse = callBridge('play')

    expect(previewSeek).not.toHaveBeenCalled()
    expect(episodeSeek).toHaveBeenCalledWith(1_200_000)
    expect(response?.result?.sessionId).toBe('episode-session')
    expect(previewPlay).not.toHaveBeenCalled()
    expect(episodePlay).toHaveBeenCalledOnce()
    expect(playResponse?.result?.sessionId).toBe('episode-session')
  })

  it('reports missing Netflix player API without native seek fallback', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)

    const response = callBridge('seek', -10000)

    expect(video.currentTime).toBe(30)
    expect(response?.success).toBe(true)
    expect(response?.result?.playerApiFound).toBe(false)
    expect(response?.result?.playerFound).toBe(false)
    expect(response?.result?.seekCalled).toBe(false)
  })

  it('diagnoses Netflix API availability without changing playback', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    video.volume = 0.5
    document.body.append(video)

    const response = callBridge('diagnose')

    expect(response?.success).toBe(true)
    expect(response?.result?.playerApiFound).toBe(false)
    expect(video.currentTime).toBe(30)
    expect(video.volume).toBe(0.5)
    expect(video.paused).toBe(true)
  })
})
