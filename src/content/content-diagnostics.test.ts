import { beforeEach, describe, expect, it, vi } from 'vitest'

import { COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE } from '@/shared/diagnostics'

describe('content compatibility diagnostics', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-shortcut-override-netflix-bridge')
    delete (window as typeof window & { netflix?: unknown }).netflix
  })

  it('reports content, video, API, and PiP capability without changing playback', async () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({}),
                },
              }),
            },
          },
        },
      },
    })

    await import('@/content/netflix-api-bridge')
    await import('@/content/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    const sendResponse = vi.fn()

    const keepsChannelOpen = listener?.(
      { type: COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE },
      {} as chrome.runtime.MessageSender,
      sendResponse
    )

    expect(keepsChannelOpen).toBe(true)
    await vi.waitFor(() => expect(sendResponse).toHaveBeenCalled())
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        contentScriptReady: true,
        settingsLoaded: true,
        videoFound: true,
        bridgeReady: true,
        playerApiFound: true,
        playerFound: true,
      })
    )
    expect(video.currentTime).toBe(30)
  })
})
