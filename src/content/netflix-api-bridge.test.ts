import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
  }
}

const callBridge = (action: string, value?: number): BridgeResponse | null => {
  const id = `test-${action}-${value ?? 'none'}`
  let response: BridgeResponse | null = null
  const handleResponse = (event: Event) => {
    const detail = 'detail' in event ? (event.detail as BridgeResponse) : null
    if (detail?.id === id) response = detail
  }

  window.addEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
  window.dispatchEvent(
    new CustomEvent(NETFLIX_API_REQUEST_EVENT, {
      detail: { source: 'shortcut-override', id, action, value },
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

  it('marks the DOM when the page bridge is ready', () => {
    expect(document.documentElement.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR)).toBe('ready')
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
