import type { PlaybackIntent, ShortcutRequest } from './shortcut-command-types'

export type PlaybackEffect = PlaybackIntent | 'seek'
type Receipt = { request: ShortcutRequest; effects: readonly PlaybackEffect[]; confirmed: boolean }
type WaitingPlayback = {
  request: ShortcutRequest
  intent: PlaybackIntent
  execute: () => void
  cancel: () => void
}

const supersedes = (effect: PlaybackEffect, intent: PlaybackIntent) => effect === 'seek' || effect === 'toggle' || effect !== intent

// A media notification's plain binding is only a guess until a keyboard partner
// arrives or its pairing deadline expires. Guesses can delay playback, but only
// confirmed operations can cancel it permanently.
export function createPlaybackRequestArbiter(pairWindowMs: number) {
  const receipts = new Map<number, Receipt>()
  const waiting = new Set<WaitingPlayback>()
  let batching = 0
  let flushing = false

  const superseded = (request: ShortcutRequest, intent: PlaybackIntent) =>
    [...receipts.values()].some(receipt => receipt.confirmed && receipt.request.order > request.order &&
      receipt.effects.some(effect => supersedes(effect, intent)))

  const prune = () => {
    // Keep the latest confirmed barrier of each kind for delayed hold/subtitle
    // callbacks, without accumulating a history of every playback command.
    const latest = new Map<PlaybackEffect, number>()
    for (const receipt of receipts.values()) if (receipt.confirmed) {
      for (const effect of receipt.effects) latest.set(effect, Math.max(latest.get(effect) ?? 0, receipt.request.order))
    }
    for (const [order, receipt] of receipts) {
      if (receipt.confirmed && receipt.effects.every(effect => latest.get(effect) !== order) &&
        performance.now() - receipt.request.time >= pairWindowMs) receipts.delete(order)
    }
  }
  const flush = () => {
    if (batching || flushing) return
    flushing = true
    try {
      let progressed: boolean
      do {
        progressed = false
        for (const item of waiting) {
          if (superseded(item.request, item.intent)) {
            waiting.delete(item)
            progressed = true
            item.cancel()
          } else if (![...receipts.values()].some(receipt => !receipt.confirmed && receipt.request.order > item.request.order &&
            receipt.effects.some(effect => supersedes(effect, item.intent)))) {
            waiting.delete(item)
            progressed = true
            item.execute()
          }
        }
      } while (progressed)
    } finally { flushing = false }
    prune()
  }
  const confirm = (request: ShortcutRequest, effect: PlaybackEffect) => {
    // A held key and a delayed subtitle callback keep their original operation.
    if (!receipts.get(request.order)?.confirmed) receipts.set(request.order, { request, effects: [effect], confirmed: true })
    flush()
  }
  return {
    superseded,
    confirm,
    // Possible effects may delay older playback, but do not confirm a command.
    registerPending(request: ShortcutRequest, effects: readonly PlaybackEffect[]) {
      prune()
      receipts.set(request.order, { request, effects, confirmed: false })
    },
    settle(request: ShortcutRequest, execute: () => void) {
      // Route the selected action before flushing: custom input must withdraw
      // its guessed playback effect before any older transport can resume.
      batching++
      try { execute() }
      finally {
        if (!receipts.get(request.order)?.confirmed) receipts.delete(request.order)
        batching--
        flush()
      }
    },
    discard(request: ShortcutRequest) {
      receipts.delete(request.order)
      flush()
    },
    dispatch(request: ShortcutRequest, intent: PlaybackIntent, execute: () => void, cancel = () => {}) {
      batching++
      try {
        confirm(request, intent)
        waiting.add({ request, intent, execute, cancel })
      } finally { batching-- }
      flush()
    },
    clear() {
      receipts.clear()
      const cancelled = [...waiting]
      waiting.clear()
      for (const item of cancelled) item.cancel()
    },
  }
}
