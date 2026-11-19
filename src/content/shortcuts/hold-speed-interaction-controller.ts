import type { NetflixPlaybackSession } from '@/content/netflix-playback-session'
import { formatPlaybackRate } from '@/shared/playback-speed'
import type { CommandContext, PlaybackDispatcher, ShortcutRequest } from './shortcut-command-types'

type HoldSpeedInteractionState = {
  targetDoc: Document
  video: HTMLVideoElement
  initiatingCode: string
  request?: ShortcutRequest
  restoreRate: number
  wasPaused: boolean
  timer: number | null
  active: boolean
  applied: boolean
}

type HoldSpeedInteractionDependencies = {
  createContext: (targetDoc: Document, actionToken?: number, request?: ShortcutRequest) => CommandContext
  createPlaybackDispatcher?: (targetDoc: Document, request?: ShortcutRequest) => PlaybackDispatcher
  startAction: () => number
  executeShortPress: (targetDoc: Document, request?: ShortcutRequest) => boolean
  hideHoldSpeedHint: (targetDoc: Document) => void
  playbackSession: NetflixPlaybackSession
  showHoldSpeedHint: (context: CommandContext, label: string) => void
}

export type HoldSpeedInteractionController = {
  beginHoldSpeedInteraction(
    targetDoc: Document,
    video: HTMLVideoElement,
    initiatingCode: string,
    request?: ShortcutRequest,
  ): void
  cancelHoldSpeedInteraction(request?: ShortcutRequest): void
  clearHoldSpeedInteraction(restorePlayback?: boolean): void
  completeHoldSpeedInteraction(code: string): boolean
  shouldInterceptHoldSpeedRepeat(code: string): boolean
}

const HOLD_SPEED_DELAY_MS = 250

const getRestorablePlaybackRate = (video: HTMLVideoElement): number =>
  Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1

export const createHoldSpeedInteractionController = (
  dependencies: HoldSpeedInteractionDependencies
): HoldSpeedInteractionController => {
  let state: HoldSpeedInteractionState | null = null
  let cancelledInitiatingCode: string | null = null

  const restore = (currentState: HoldSpeedInteractionState, restorePlayback = true): void => {
    if (!currentState.applied) return
    dependencies.hideHoldSpeedHint(currentState.targetDoc)
    void dependencies.playbackSession.setPlaybackRate(currentState.video, currentState.restoreRate)
    if (!restorePlayback) return

    if (currentState.wasPaused) {
      void dependencies.playbackSession.pause(currentState.video)
    } else if (currentState.video.paused) {
      void dependencies.playbackSession.play(currentState.video)
    }
  }

  const endHoldSpeedInteraction = (restorePlayback = true): HoldSpeedInteractionState | null => {
    const currentState = state
    if (currentState?.timer != null) {
      const timerWindow = currentState.targetDoc.defaultView ?? window
      timerWindow.clearTimeout(currentState.timer)
    }
    if (currentState?.active) restore(currentState, restorePlayback)
    state = null
    return currentState
  }

  const cancelHoldSpeedInteraction = (request?: ShortcutRequest): void => {
    // Input-based cancellation must not let an older receipt stop a newer hold.
    if (request && state?.request && request.order <= state.request.order) return
    const currentState = endHoldSpeedInteraction()
    if (currentState) cancelledInitiatingCode = currentState.initiatingCode
  }

  const clearHoldSpeedInteraction = (restorePlayback = true): void => {
    cancelledInitiatingCode = null
    endHoldSpeedInteraction(restorePlayback)
  }

  const beginHoldSpeedInteraction = (
    targetDoc: Document,
    video: HTMLVideoElement,
    initiatingCode: string,
    request?: ShortcutRequest,
  ): void => {
    if (state) return
    cancelledInitiatingCode = null

    const actionToken = dependencies.startAction()
    const nextState: HoldSpeedInteractionState = {
      targetDoc,
      video,
      initiatingCode,
      request,
      restoreRate: getRestorablePlaybackRate(video),
      wasPaused: video.paused,
      timer: null,
      active: false,
      applied: false,
    }
    const dispatch = dependencies.createPlaybackDispatcher?.(targetDoc, request)

    const timerWindow = targetDoc.defaultView ?? window
    nextState.timer = timerWindow.setTimeout(() => {
      if (state !== nextState) return

      nextState.timer = null
      nextState.active = true

      const execute = () => {
        if (state !== nextState || !nextState.active) return
        nextState.applied = true
        const context = dependencies.createContext(nextState.targetDoc, actionToken, nextState.request)
        const completions = [
          dependencies.playbackSession.setPlaybackRate(
            nextState.video,
            context.settings.holdSpeed.speed
          ),
        ]
        if (nextState.wasPaused || nextState.video.paused) {
          completions.push(dependencies.playbackSession.play(nextState.video))
        }

        if (context.settings.holdSpeed.showHint) {
          dependencies.showHoldSpeedHint(
            context,
            formatPlaybackRate(context.settings.holdSpeed.speed)
          )
        }

        void Promise.all(completions).then(results => {
          if (state !== nextState || !nextState.active) return
          if (results.some(result => result.failureLabel)) {
            restore(nextState)
          }
        })
      }
      if (dispatch) dispatch('play', execute, () => { if (state === nextState) cancelHoldSpeedInteraction() })
      else execute()
    }, HOLD_SPEED_DELAY_MS)

    state = nextState
  }

  const completeHoldSpeedInteraction = (code: string): boolean => {
    const currentState = state
    if (!currentState) {
      if (cancelledInitiatingCode !== code) return false
      cancelledInitiatingCode = null
      return true
    }
    if (currentState.initiatingCode !== code) return false

    state = null
    if (currentState.timer !== null) {
      const timerWindow = currentState.targetDoc.defaultView ?? window
      timerWindow.clearTimeout(currentState.timer)
    }

    if (!currentState.active) {
      return dependencies.executeShortPress(currentState.targetDoc, currentState.request)
    }

    restore(currentState)
    return true
  }

  return {
    beginHoldSpeedInteraction,
    cancelHoldSpeedInteraction,
    clearHoldSpeedInteraction,
    completeHoldSpeedInteraction,
    shouldInterceptHoldSpeedRepeat: code => state?.initiatingCode === code,
  }
}
