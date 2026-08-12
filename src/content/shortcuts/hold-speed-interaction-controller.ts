import type { NetflixPlaybackSession } from '@/content/netflix-playback-session'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { formatPlaybackRate } from '@/shared/playback-speed'
import type { Locale } from '@/shared/shortcut-types'
import type { CommandContext } from './shortcut-command-types'

type HoldSpeedInteractionState = {
  targetDoc: Document
  video: HTMLVideoElement
  initiatingCode: string
  restoreRate: number
  wasPaused: boolean
  timer: number | null
  active: boolean
}

type HoldSpeedInteractionDependencies = {
  createContext: (targetDoc: Document, actionToken?: number) => CommandContext
  startAction: () => number
  executeShortPress: (targetDoc: Document) => boolean
  hideHoldSpeedHint: (targetDoc: Document) => void
  playbackSession: NetflixPlaybackSession
  showHoldSpeedHint: (context: CommandContext, label: string) => void
}

export type HoldSpeedInteractionController = {
  beginHoldSpeedInteraction(
    targetDoc: Document,
    video: HTMLVideoElement,
    initiatingCode: string
  ): void
  cancelHoldSpeedInteraction(): void
  clearHoldSpeedInteraction(): void
  completeHoldSpeedInteraction(code: string): boolean
  shouldInterceptHoldSpeedRepeat(code: string): boolean
}

const HOLD_SPEED_DELAY_MS = 250

const getRestorablePlaybackRate = (video: HTMLVideoElement): number =>
  Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1

const formatHoldSpeedRate = (rate: number, locale: Locale): string => {
  const value = formatPlaybackRate(rate).replace(/x$/, '')
  if (locale === 'zh-TW' || locale === 'zh-CN') return `${value} 倍`
  if (locale === 'ja') return `${value}倍`
  if (locale === 'ko') return `${value}배`
  return `${value}x`
}

export const createHoldSpeedInteractionController = (
  dependencies: HoldSpeedInteractionDependencies
): HoldSpeedInteractionController => {
  let state: HoldSpeedInteractionState | null = null
  let cancelledInitiatingCode: string | null = null

  const restore = (currentState: HoldSpeedInteractionState): void => {
    dependencies.hideHoldSpeedHint(currentState.targetDoc)
    void dependencies.playbackSession.setPlaybackRate(currentState.video, currentState.restoreRate)

    if (currentState.wasPaused) {
      void dependencies.playbackSession.pause(currentState.video)
    } else if (currentState.video.paused) {
      void dependencies.playbackSession.play(currentState.video)
    }
  }

  const endHoldSpeedInteraction = (): HoldSpeedInteractionState | null => {
    const currentState = state
    if (currentState?.timer != null) {
      const timerWindow = currentState.targetDoc.defaultView ?? window
      timerWindow.clearTimeout(currentState.timer)
    }
    if (currentState?.active) restore(currentState)
    state = null
    return currentState
  }

  const cancelHoldSpeedInteraction = (): void => {
    const currentState = endHoldSpeedInteraction()
    if (currentState) cancelledInitiatingCode = currentState.initiatingCode
  }

  const clearHoldSpeedInteraction = (): void => {
    cancelledInitiatingCode = null
    endHoldSpeedInteraction()
  }

  const beginHoldSpeedInteraction = (
    targetDoc: Document,
    video: HTMLVideoElement,
    initiatingCode: string
  ): void => {
    if (state) return
    cancelledInitiatingCode = null

    const actionToken = dependencies.startAction()
    const nextState: HoldSpeedInteractionState = {
      targetDoc,
      video,
      initiatingCode,
      restoreRate: getRestorablePlaybackRate(video),
      wasPaused: video.paused,
      timer: null,
      active: false,
    }

    const timerWindow = targetDoc.defaultView ?? window
    nextState.timer = timerWindow.setTimeout(() => {
      if (state !== nextState) return

      nextState.timer = null
      nextState.active = true

      const context = dependencies.createContext(nextState.targetDoc, actionToken)
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
          formatHoldSpeedRate(
            context.settings.holdSpeed.speed,
            resolveLocalePreference(context.settings.locale)
          )
        )
      }

      void Promise.all(completions).then(results => {
        if (state !== nextState || !nextState.active) return
        if (results.some(result => result.failureLabel)) {
          restore(nextState)
        }
      })
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
      return dependencies.executeShortPress(currentState.targetDoc)
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
