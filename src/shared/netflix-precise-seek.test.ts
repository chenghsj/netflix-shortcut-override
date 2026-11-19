import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeNetflixPageApi } from './netflix-page-api-executor'
import { subtitleTarget } from './subtitle-navigation'

const execute = Function(`return (${executeNetflixPageApi.toString()})`)() as typeof executeNetflixPageApi
type TestPage = typeof window & {
  __shortcutOverrideFrameStep?: { clear(): void }
  __shortcutOverrideCancelSubtitleRefresh?: () => void
}
const page = window as TestPage

beforeEach(() => {
  document.body.innerHTML = '<video></video>'
  window.history.replaceState(null, '', '/watch/82014058')
})
afterEach(() => {
  page.__shortcutOverrideFrameStep?.clear()
  page.__shortcutOverrideCancelSubtitleRefresh?.()
  vi.useRealTimers()
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
    const starts = [1000, 3000, 6000, 9000, 11_000, 13_000].map(startMs => ({ startMs, endMs: startMs + 1500 }))
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
    vi.useFakeTimers()
    const { player, internal } = installCoarsePlayer(10_000)
    internal.seek.mockImplementation(() => { throw new Error('seek rejected') })
    expect(execute('seekTo', 11_000)).toMatchObject({ seekCalled: false, error: 'seek rejected' })
    expect(player.seek).not.toHaveBeenCalled()
    expect(internal.seek).toHaveBeenCalledExactlyOnceWith(11_000, undefined, undefined, true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('still seeks when reading the paused state for subtitle refresh throws', () => {
    const { player, internal } = installCoarsePlayer(10_000)
    player.getPaused = () => { throw new Error('paused state unavailable') }
    expect(execute('seekTo', 11_000)).toMatchObject({ seekCalled: true })
    expect(internal.seek).toHaveBeenCalledExactlyOnceWith(11_000, undefined, undefined, true)
  })

  it('refreshes once when two nearby seeks share a completion event', () => {
    vi.useFakeTimers()
    const { internal } = installCoarsePlayer(10_000)
    const updateActiveEntry = vi.fn()
    Reflect.set(internal, 'playback', { timedTextManager: {
      timedTextTimer: { updatedForMediaTime: 11_000 }, updateActiveEntry,
    } })
    execute('seekTo', 11_000)
    execute('seekTo', 11_200)
    document.querySelector('video')!.dispatchEvent(new Event('seeked'))
    expect(updateActiveEntry).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['video', 'session'] as const)('discards a refresh when the %s changes at the same URL', changed => {
    vi.useFakeTimers()
    const { internal } = installCoarsePlayer(10_000)
    const video = document.querySelector('video')!
    const presentingState = { value: 1 }
    const updateActiveEntry = vi.fn()
    Reflect.set(internal, 'playback', { presentingState, timedTextManager: {
      timedTextTimer: { updatedForMediaTime: 11_000 }, updateActiveEntry,
    } })
    execute('seekTo', 11_000)
    video.dispatchEvent(new Event('seeked'))
    if (changed === 'video') document.body.prepend(document.createElement('video'))
    else installCoarsePlayer(11_000)
    expect(video.isConnected).toBe(true)
    presentingState.value = 3
    vi.runAllTimers()
    expect(updateActiveEntry).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('refreshes a stale empty native subtitle as soon as a paused precise seek completes', () => {
    vi.useFakeTimers()
    const { player, internal } = installCoarsePlayer(200_000)
    const video = document.querySelector('video')!
    const timer = { updatedForMediaTime: 192_568 as number | undefined }
    const updateActiveEntry = vi.fn(() => {
      // Cadmium skips recomputation if it already checked this exact time,
      // even when that earlier check cached an empty entry during the seek.
      if (timer.updatedForMediaTime === player.getCurrentTime()) return
      timer.updatedForMediaTime = player.getCurrentTime()
      video.textContent = 'The selected native subtitle'
    })
    Reflect.set(internal, 'playback', { timedTextManager: { timedTextTimer: timer, updateActiveEntry } })
    execute('seekTo', 192_568)
    expect(video.textContent).toBe('')
    video.dispatchEvent(new Event('seeked'))
    expect(video.textContent).toBe('The selected native subtitle')
    expect(player.getCurrentTime()).toBe(192_568)
    expect(player.play).not.toHaveBeenCalled()
    expect(player.pause).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['ready', 'superseded', 'expired'] as const)(
    'handles subtitle refresh when the renderer becomes %s after seeked', outcome => {
      vi.useFakeTimers()
      const { internal } = installCoarsePlayer(200_000)
      const video = document.querySelector('video')!
      const presentingState = { value: 1 }
      const updateActiveEntry = vi.fn()
      Reflect.set(internal, 'playback', { presentingState, timedTextManager: {
        timedTextTimer: { updatedForMediaTime: 192_568 }, updateActiveEntry,
      } })
      execute('seekTo', 192_568)
      video.dispatchEvent(new Event('seeked'))
      expect(updateActiveEntry).not.toHaveBeenCalled()

      if (outcome === 'superseded') video.dispatchEvent(new Event('seeking'))
      if (outcome === 'expired') vi.runAllTimers()
      presentingState.value = 3
      vi.advanceTimersToNextTimer()

      expect(updateActiveEntry).toHaveBeenCalledTimes(outcome === 'ready' ? 1 : 0)
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('refreshes when missing subtitle data becomes available after a paused seek', () => {
    vi.useFakeTimers()
    const { player, internal } = installCoarsePlayer(200_000)
    const video = document.querySelector('video')!
    const getCurrentAndNextSubtitles = vi.fn<() => unknown[] | null>().mockReturnValue(null)
    const updateActiveEntry = vi.fn()
    Reflect.set(internal, 'playback', { timedTextManager: {
      timedTextTimer: {
        updatedForMediaTime: 192_568,
        getMediaTime: player.getCurrentTime,
        manager: { getCurrentAndNextSubtitles },
      },
      updateActiveEntry,
    } })
    execute('seekTo', 192_568)
    video.dispatchEvent(new Event('seeked'))
    expect(updateActiveEntry).not.toHaveBeenCalled()

    getCurrentAndNextSubtitles.mockReturnValue([{ startTime: 192_568, endTime: 195_529 }])
    vi.advanceTimersToNextTimer()
    expect(updateActiveEntry).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['play', 'emptied', 'detached', 'navigation', 'another seek', 'resumed'] as const)(
    'discards a pending subtitle refresh after %s', change => {
      vi.useFakeTimers()
      const { player, internal } = installCoarsePlayer(200_000)
      const video = document.querySelector('video')!
      const updateActiveEntry = vi.fn()
      Reflect.set(internal, 'playback', { timedTextManager: {
        timedTextTimer: { updatedForMediaTime: 192_568 }, updateActiveEntry,
      } })
      execute('seekTo', 192_568)
      if (change === 'play' || change === 'emptied') video.dispatchEvent(new Event(change))
      else if (change === 'detached') video.remove()
      else if (change === 'navigation') window.history.replaceState(null, '', '/watch/other')
      else if (change === 'another seek') internal.seek(180_000)
      else player.getPaused = () => false
      video.dispatchEvent(new Event('seeked'))
      vi.runAllTimers()
      expect(updateActiveEntry).not.toHaveBeenCalled()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('expires refresh without a seek event and tolerates unsupported native renderers', () => {
    vi.useFakeTimers()
    const { internal } = installCoarsePlayer(200_000)
    const video = document.querySelector('video')!
    const updateActiveEntry = vi.fn(() => { throw new Error('renderer unavailable') })
    Reflect.set(internal, 'playback', { timedTextManager: {
      timedTextTimer: { updatedForMediaTime: 192_568 }, updateActiveEntry,
    } })
    expect(execute('seekTo', 192_568)).toMatchObject({ seekCalled: true })
    video.dispatchEvent(new Event('seeked'))
    expect(() => vi.runAllTimers()).not.toThrow()
    expect(updateActiveEntry).toHaveBeenCalledOnce()
    internal.seek.mockImplementation(() => {})
    expect(execute('seekTo', 192_568)).toMatchObject({ seekCalled: true })
    vi.runAllTimers()
    expect(updateActiveEntry).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
})
