import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeNetflixPageApi } from './netflix-page-api-executor'
import { subtitleTarget } from './subtitle-navigation'

const execute = Function(`return (${executeNetflixPageApi.toString()})`)() as typeof executeNetflixPageApi
type TestPage = typeof window & { __shortcutOverrideFrameStep?: { clear(): void } }
const page = window as TestPage

beforeEach(() => {
  document.body.innerHTML = '<video></video>'
  window.history.replaceState(null, '', '/watch/82014058')
})
afterEach(() => {
  page.__shortcutOverrideFrameStep?.clear()
  vi.unstubAllGlobals()
})

// Cadmium's public seek forwards only the time argument. Its internal seek's
// fourth argument requests precision; otherwise the seek manager may align to
// a preceding subfragment. Four-second fragments make that behavior explicit.
function installCoarsePlayer(currentMs: number) {
  const video = document.querySelector('video')!
  const internal = {
    seek: vi.fn((target: number, _cause?: unknown, _segment?: unknown, precise = false) => {
      currentMs = precise ? Math.round(target) : Math.floor(target / 4000) * 4000
      video.currentTime = currentMs / 1000
      video.dispatchEvent(new Event('seeked'))
    }),
  }
  const player = {
    getCurrentTime: () => currentMs,
    getDuration: () => 100_000,
    getPaused: () => true,
    getDiagnostics: () => ({ getGroups: () => [{ Framerate: 25 }] }),
    getInternalPlayer: () => internal,
    seek: vi.fn((target: number) => internal.seek(target)),
    play: vi.fn(),
    pause: vi.fn(),
  }
  vi.stubGlobal('netflix', { appContext: { state: { playerApp: { getAPI: () => ({
    videoPlayer: { getAllPlayerSessionIds: () => ['watch'], getVideoPlayerBySessionId: () => player },
  }) } } } })
  return { player, internal }
}

describe('precise Netflix seek requests', () => {
  it('advances paused frames instead of repeatedly returning to a fragment boundary', () => {
    const { player } = installCoarsePlayer(8000)
    execute('stepFrame', 1)
    expect(player.getCurrentTime()).toBe(8040)
    execute('stepFrame', 1)
    expect(player.getCurrentTime()).toBe(8080)
    execute('stepFrame', -1)
    expect(player.getCurrentTime()).toBe(8040)
  })

  it.each(['next', 'previous'] as const)('lands on the %s subtitle rather than an earlier fragment', action => {
    const { player } = installCoarsePlayer(10_000)
    const starts = [1000, 3000, 6000, 9000, 11_000, 13_000]
    const first = subtitleTarget(starts, player.getCurrentTime(), action)!
    execute('seekTo', first)
    expect(player.getCurrentTime()).toBe(first)
    const second = subtitleTarget(starts, player.getCurrentTime(), action)!
    execute('seekTo', second)
    expect(player.getCurrentTime()).toBe(second)
    expect(action === 'next' ? second > first : second < first).toBe(true)
    expect(player.play).not.toHaveBeenCalled()
    expect(player.pause).not.toHaveBeenCalled()
  })

  it('keeps ordinary relative seeks on the public transport', () => {
    const { player, internal } = installCoarsePlayer(10_000)
    expect(execute('seek', 5000)).toMatchObject({ targetTime: 15_000, seekCalled: true })
    expect(player.seek).toHaveBeenCalledExactlyOnceWith(15_000)
    expect(internal.seek).toHaveBeenCalledExactlyOnceWith(15_000)
  })

  it.each(['absent', 'unavailable', 'missing seek'] as const)('uses the public transport when internal transport is %s', availability => {
    const { player } = installCoarsePlayer(10_000)
    if (availability === 'absent') Reflect.deleteProperty(player, 'getInternalPlayer')
    else if (availability === 'unavailable') player.getInternalPlayer = () => { throw new Error('unavailable') }
    else Reflect.set(player, 'getInternalPlayer', () => ({}))
    expect(execute('seekTo', 11_000)).toMatchObject({ seekCalled: true, targetTime: 11_000 })
    expect(player.seek).toHaveBeenCalledExactlyOnceWith(11_000)
  })

  it('reports an internal seek failure without issuing a second seek', () => {
    const { player, internal } = installCoarsePlayer(10_000)
    internal.seek.mockImplementation(() => { throw new Error('seek rejected') })
    expect(execute('seekTo', 11_000)).toMatchObject({ seekCalled: false, error: 'seek rejected' })
    expect(player.seek).not.toHaveBeenCalled()
    expect(internal.seek).toHaveBeenCalledExactlyOnceWith(11_000, undefined, undefined, true)
  })
})
