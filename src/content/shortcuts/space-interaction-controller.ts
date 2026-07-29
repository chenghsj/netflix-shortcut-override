import type { NetflixPlaybackSession } from '@/content/netflix-playback-session'
import { resolveLocalePreference } from '@/shared/browser-locale'
import type { CommandContext } from './shortcut-command-types'
import type { Locale } from '@/shared/shortcut-types'

type SpaceInteractionState = {
  targetDoc: Document
  video: HTMLVideoElement
  restoreRate: number
  wasPaused: boolean
  handleShortPress: boolean
  timer: number | null
  active: boolean
}

type SpaceInteractionDependencies = {
  createContext: (targetDoc: Document, actionToken?: number) => CommandContext
  startAction: () => number
  executeShortPress: (targetDoc: Document) => boolean
  hideHints: (targetDoc: Document) => void
  playbackSession: NetflixPlaybackSession
  showSpaceHoldHint: (context: CommandContext, label: string) => void
}

export type SpaceInteractionController = {
  beginSpaceInteraction(
    targetDoc: Document,
    video: HTMLVideoElement,
    holdEnabled: boolean,
    handleShortPress?: boolean
  ): void
  clearSpaceInteraction(): void
  completeSpaceInteraction(): boolean
  shouldInterceptSpaceRepeat(): boolean
}

const SPACE_HOLD_DELAY_MS = 250

const getRestorablePlaybackRate = (video: HTMLVideoElement): number =>
  Number.isFinite(video.playbackRate) && video.playbackRate > 0 ? video.playbackRate : 1

const formatPlaybackRate = (rate: number): string =>
  `${rate.toFixed(2).replace(/\.00$/, '').replace(/0$/, '')}x`

const formatSpaceHoldRate = (rate: number, locale: Locale): string => {
  const value = formatPlaybackRate(rate).replace(/x$/, '')
  if (locale === 'zh-TW' || locale === 'zh-CN') return `${value} 倍`
  if (locale === 'ja') return `${value}倍`
  if (locale === 'ko') return `${value}배`
  return `${value}x`
}

export const createSpaceInteractionController = (
  dependencies: SpaceInteractionDependencies
): SpaceInteractionController => {
  let state: SpaceInteractionState | null = null

  const restore = (currentState: SpaceInteractionState): void => {
    dependencies.hideHints(currentState.targetDoc)
    void dependencies.playbackSession.setPlaybackRate(currentState.video, currentState.restoreRate)

    if (currentState.wasPaused) {
      void dependencies.playbackSession.pause(currentState.video)
    } else if (currentState.video.paused) {
      void dependencies.playbackSession.play(currentState.video)
    }
  }

  const clearSpaceInteraction = (): void => {
    const currentState = state
    if (currentState?.timer != null) {
      const timerWindow = currentState.targetDoc.defaultView ?? window
      timerWindow.clearTimeout(currentState.timer)
    }
    if (currentState?.active) restore(currentState)
    state = null
  }

  const beginSpaceInteraction = (
    targetDoc: Document,
    video: HTMLVideoElement,
    holdEnabled: boolean,
    handleShortPress = true
  ): void => {
    if (state) return

    const actionToken = dependencies.startAction()
    const nextState: SpaceInteractionState = {
      targetDoc,
      video,
      restoreRate: getRestorablePlaybackRate(video),
      wasPaused: video.paused,
      handleShortPress,
      timer: null,
      active: false,
    }

    if (holdEnabled) {
      const timerWindow = targetDoc.defaultView ?? window
      nextState.timer = timerWindow.setTimeout(() => {
        if (state !== nextState) return

        nextState.timer = null
        nextState.active = true

        if (nextState.wasPaused || nextState.video.paused) {
          void dependencies.playbackSession.play(nextState.video)
        }

        const context = dependencies.createContext(nextState.targetDoc, actionToken)
        void dependencies.playbackSession.setPlaybackRate(
          nextState.video,
          context.settings.spaceHold.speed
        )
        if (context.settings.spaceHold.showHint) {
          dependencies.showSpaceHoldHint(
            context,
            formatSpaceHoldRate(
              context.settings.spaceHold.speed,
              resolveLocalePreference(context.settings.locale)
            )
          )
        }
      }, SPACE_HOLD_DELAY_MS)
    }

    state = nextState
  }

  const completeSpaceInteraction = (): boolean => {
    const currentState = state
    if (!currentState) return false

    state = null
    if (currentState.timer !== null) {
      const timerWindow = currentState.targetDoc.defaultView ?? window
      timerWindow.clearTimeout(currentState.timer)
    }

    if (!currentState.active) {
      return currentState.handleShortPress
        ? dependencies.executeShortPress(currentState.targetDoc)
        : false
    }

    restore(currentState)
    return true
  }

  return {
    beginSpaceInteraction,
    clearSpaceInteraction,
    completeSpaceInteraction,
    shouldInterceptSpaceRepeat: () => state !== null,
  }
}
