import { describe, expect, it, vi } from 'vitest'
import { createPlaybackRequestArbiter, type PlaybackEffect } from './playback-request-arbiter'
import type { PlaybackIntent } from './shortcut-command-types'

const intents: PlaybackIntent[] = ['play', 'pause', 'toggle']
const effects: PlaybackEffect[] = [...intents, 'seek']
const request = (order: number) => ({ time: 0, order })
const cancelledBy = (effect: PlaybackEffect | undefined, intent: PlaybackIntent) =>
  effect !== undefined && (effect === 'seek' || effect === 'toggle' || effect !== intent)

describe('playback request ordering', () => {
  it.each(intents.flatMap(intent => effects.flatMap(effect => [false, true].map(late => ({ intent, effect, late })))))('$intent versus confirmed $effect, cancellation arrives later=$late', ({ intent, effect, late }) => {
      const arbiter = createPlaybackRequestArbiter(120)
      const execute = vi.fn(), cancel = vi.fn()
      // A later unknown input holds the older operation until classification.
      if (late) arbiter.registerPending(request(2), effects)
      else arbiter.confirm(request(2), effect)
      arbiter.dispatch(request(1), intent, execute, cancel)
      if (late) {
        expect(execute).not.toHaveBeenCalled()
        arbiter.settle(request(2), () => arbiter.confirm(request(2), effect))
      }
      expect(execute).toHaveBeenCalledTimes(cancelledBy(effect, intent) ? 0 : 1)
      expect(cancel).toHaveBeenCalledTimes(cancelledBy(effect, intent) ? 1 : 0)
    })

  it.each(intents.flatMap(intent => [...effects, undefined].map(effect => ({ intent, effect }))))('resolves a tentative canceller of $intent to $effect', ({ intent, effect }) => {
      const arbiter = createPlaybackRequestArbiter(120)
      const execute = vi.fn(), cancel = vi.fn()
      arbiter.registerPending(request(2), effects)
      arbiter.dispatch(request(1), intent, execute, cancel)
      expect(execute).not.toHaveBeenCalled()
      expect(cancel).not.toHaveBeenCalled()
      arbiter.settle(request(2), () => { if (effect) arbiter.confirm(request(2), effect) })
      expect(execute).toHaveBeenCalledTimes(cancelledBy(effect, intent) ? 0 : 1)
      expect(cancel).toHaveBeenCalledTimes(cancelledBy(effect, intent) ? 1 : 0)
    })

  it('does not undo a real cancellation when another tentative canceller resolves to custom input', () => {
    const arbiter = createPlaybackRequestArbiter(120)
    const execute = vi.fn(), cancel = vi.fn()
    arbiter.registerPending(request(2), ['pause'])
    arbiter.confirm(request(3), 'seek')
    arbiter.dispatch(request(1), 'play', execute, cancel)
    arbiter.settle(request(2), () => {})
    expect(execute).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('retains confirmed cancellation for a late hold callback after the pairing window', () => {
    const arbiter = createPlaybackRequestArbiter(120)
    const execute = vi.fn(), cancel = vi.fn()
    arbiter.confirm(request(2), 'pause')
    arbiter.registerPending({ time: -1000, order: 3 }, [])
    arbiter.settle(request(3), () => {})
    arbiter.dispatch(request(1), 'play', execute, cancel)
    expect(execute).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('clears deferred playback without reviving it on a later settlement', () => {
    const arbiter = createPlaybackRequestArbiter(120)
    const execute = vi.fn(), cancel = vi.fn()
    arbiter.registerPending(request(2), ['pause'])
    arbiter.dispatch(request(1), 'play', execute, cancel)
    arbiter.clear()
    arbiter.settle(request(2), () => {})
    expect(execute).not.toHaveBeenCalled()
    expect(cancel).toHaveBeenCalledOnce()
    arbiter.dispatch(request(3), 'play', execute)
    expect(execute).toHaveBeenCalledOnce()
  })
})
