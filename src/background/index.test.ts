import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('background Netflix API bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    document.body.innerHTML = ''
    delete (window as typeof window & { netflix?: unknown }).netflix
  })

  it('registers an action click handler and a runtime message handler', async () => {
    await import('@/background/index')

    expect(chrome.action.onClicked.addListener).toHaveBeenCalled()
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled()
  })

  it('executes Netflix API messages in the page main world', async () => {
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    expect(listener).toBeDefined()

    const sendResponse = vi.fn()
    listener?.(
      { type: 'EXECUTE_NETFLIX_API', action: 'seek', value: 10000 },
      { tab: { id: 42 } } as chrome.runtime.MessageSender,
      sendResponse
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 42 },
        world: 'MAIN',
      })
    )
  })

  it('does not touch native video seeking when the Netflix player API is unavailable', async () => {
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)

    listener?.(
      { type: 'EXECUTE_NETFLIX_API', action: 'seek', value: -10000 },
      { tab: { id: 42 } } as chrome.runtime.MessageSender,
      vi.fn()
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
    const injection = vi.mocked(chrome.scripting.executeScript).mock.calls.at(-1)?.[0] as
      | { func?: (action: 'seek', value?: number) => void }
      | undefined

    injection?.func?.('seek', -10000)

    expect(video.currentTime).toBe(30)
  })

  it('uses the Netflix player seek API without mutating native video time', async () => {
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
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

    listener?.(
      { type: 'EXECUTE_NETFLIX_API', action: 'seek', value: 10000 },
      { tab: { id: 42 } } as chrome.runtime.MessageSender,
      vi.fn()
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
    const injection = vi.mocked(chrome.scripting.executeScript).mock.calls.at(-1)?.[0] as
      | { func?: (action: 'seek', value?: number) => void }
      | undefined

    injection?.func?.('seek', 10000)

    expect(seek).toHaveBeenCalledWith(40000)
    expect(video.currentTime).toBe(30)
  })
})
