import { beforeEach, describe, expect, it, vi } from 'vitest'

// Announcement lifecycle is covered separately; isolate bridge registration.
vi.mock('@/background/feature-announcements', () => ({ registerFeatureAnnouncements: vi.fn() }))

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

  it('keeps the injected MAIN-world function self-contained after serialization', async () => {
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]

    listener?.(
      { type: 'EXECUTE_NETFLIX_API', action: 'diagnose' },
      { tab: { id: 42 } } as chrome.runtime.MessageSender,
      vi.fn()
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
    const injection = vi.mocked(chrome.scripting.executeScript).mock.calls.at(-1)?.[0] as
      | { func?: (action: 'diagnose') => unknown }
      | undefined
    const serializedFunction = injection?.func?.toString()
    if (!serializedFunction) throw new Error('Expected an injected function')

    const isolatedFunction = Function(`return (${serializedFunction})`)() as (
      action: 'diagnose'
    ) => { playerApiFound?: boolean }

    expect(isolatedFunction('diagnose')).toEqual(
      expect.objectContaining({ playerApiFound: false })
    )
  })

  it('returns selected caption metadata through a serialized background injection', async () => {
    window.history.replaceState(null, '', '/watch/123')
    const track = { trackId: 'en', url: 'https://a.nflxvideo.net/sub.vtt' }
    Object.assign(window, { netflix: { appContext: { state: { playerApp: { getAPI: () => ({
      videoPlayer: {
        getAllPlayerSessionIds: () => ['session'],
        getVideoPlayerBySessionId: () => ({ getCurrentTime: () => 3500, getTextTrack: () => track }),
      },
    }) } } } } })
    vi.mocked(chrome.scripting.executeScript).mockImplementation(async injection => {
      const { func, args } = injection as unknown as { func: (...args: unknown[]) => unknown; args: unknown[] }
      const isolated = Function(`return (${func.toString()})`)() as typeof func
      return [{ frameId: 0, result: isolated(...args) }]
    })
    try {
      await import('@/background/index')
      const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
      const respond = vi.fn()
      listener?.({ type: 'EXECUTE_NETFLIX_API', action: 'getCaptionMetadata' }, { tab: { id: 42 } } as chrome.runtime.MessageSender, respond)
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        result: expect.objectContaining({ captionMetadata: {
          key: '123:session:en', watchId: '123', currentMs: 3500, url: track.url,
        } }),
      })))
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(expect.objectContaining({
        target: { tabId: 42 }, world: 'MAIN', args: ['getCaptionMetadata', undefined],
      }))
    } finally { window.history.replaceState(null, '', '/') }
  })

  it('returns a specific permission error without requesting the subtitle CDN', async () => {
    vi.mocked(chrome.permissions.contains).mockImplementation(() => Promise.resolve(false) as never)
    vi.mocked(chrome.tabs.get).mockImplementation(() => Promise.resolve({ id: 42, url: 'https://www.netflix.com/watch/123' }) as never)
    const request = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', request)
    try {
      await import('@/background/index')
      const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
      const respond = vi.fn()
      listener?.(
        { type: 'FETCH_NETFLIX_CAPTION', watchId: '123', url: 'https://a.nflxvideo.net/sub?secret=token' },
        { id: chrome.runtime.id, frameId: 0, tab: { id: 42 }, url: 'https://www.netflix.com/watch/123' } as chrome.runtime.MessageSender,
        respond,
      )
      await vi.waitFor(() => expect(respond).toHaveBeenCalledWith({ error: true, code: 'CAPTION_PERMISSION_REQUIRED' }))
      expect(request).not.toHaveBeenCalled()
      expect(chrome.permissions.contains).toHaveBeenCalledWith({ origins: ['https://a.nflxvideo.net/*'] })
    } finally { vi.unstubAllGlobals() }
  })
})
