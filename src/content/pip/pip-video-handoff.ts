import { selectPresentationReadyVideo } from '../dom-utils'
import { PLAYER_ROOT_SELECTOR } from './pip-selectors'

const VIDEO_HANDOFF_SETTLE_MS = 200
const VIDEO_HANDOFF_TIMEOUT_MS = 8_000
const VIDEO_HANDOFF_ATTEMPT_WINDOW_MS = 5_000
const VIDEO_HANDOFF_MAX_ATTEMPTS = 3
const VIDEO_HANDOFF_REPLACEMENT_WINDOW_MS = 2_000
const SAME_VIDEO_RECOVERY_PROGRESS_SECONDS = 0.75

type EpisodeTransitionState =
  | { status: 'idle' }
  | {
      status: 'pending'
      boundaryTime: number
      seekObservedAfterBoundary: boolean
      candidatesBeforeBoundary: Set<HTMLVideoElement>
    }

const IDLE_EPISODE_TRANSITION: EpisodeTransitionState = { status: 'idle' }

type WindowWithMutationObserver = Window & {
  MutationObserver?: typeof MutationObserver
}

type PipVideoHandoffOptions = {
  sourceDocument: Document
  pipWindow: Window
  videoArea: HTMLElement
  initialVideo: HTMLVideoElement
  isActive: () => boolean
  onVideoHandoff: (candidate: HTMLVideoElement) => boolean
  onEpisodeTransition: (video: HTMLVideoElement) => void
  onTimeout: () => void
}

type VideoHandoffDecision = {
  candidate: HTMLVideoElement | null
  confirmsEpisodeTransition: boolean
}

const getMutationObserver = (targetWindow: Window | null): typeof MutationObserver | null =>
  targetWindow
    ? ((targetWindow as WindowWithMutationObserver).MutationObserver ?? null)
    : null

const isUsablePresentationVideo = (video: HTMLVideoElement): boolean => {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return true
  if (!video.paused && !video.ended) return true
  if (video.videoWidth > 0 && video.videoHeight > 0) return true

  const rect = video.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

class PipVideoHandoffImplementation {
  private readonly sourceDocument: Document
  private readonly pipWindow: Window
  private readonly videoArea: HTMLElement
  private readonly isActive: () => boolean
  private readonly onVideoHandoff: (candidate: HTMLVideoElement) => boolean
  private readonly onEpisodeTransition: (video: HTMLVideoElement) => void
  private readonly onTimeout: () => void
  private currentVideo: HTMLVideoElement | null = null
  private sourceVideoObserver: MutationObserver | null = null
  private sourceRootObserver: MutationObserver | null = null
  private pipVideoObserver: MutationObserver | null = null
  private videoLifecycleCleanup: (() => void) | null = null
  private handoffCheckTimer: number | null = null
  private handoffTimeoutTimer: number | null = null
  private handoffAttemptTimes: number[] = []
  private recoveryCycleStartTimes: number[] = []
  private recoveryCycleActive = false
  private replacementGraceDeadline: number | null = null
  private replacementObservationDeadline: number | null = null
  private preferredPlayerRoot: HTMLElement | null = null
  private episodeTransition: EpisodeTransitionState = IDLE_EPISODE_TRANSITION
  private lastPlaybackTime = 0
  private started = false

  constructor(options: PipVideoHandoffOptions) {
    this.sourceDocument = options.sourceDocument
    this.pipWindow = options.pipWindow
    this.videoArea = options.videoArea
    this.isActive = options.isActive
    this.onVideoHandoff = options.onVideoHandoff
    this.onEpisodeTransition = options.onEpisodeTransition
    this.onTimeout = options.onTimeout
    this.currentVideo = options.initialVideo
    this.preferredPlayerRoot = this.getPlayerRoot(options.initialVideo.parentElement)
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.bindVideoLifecycle(this.currentVideo)
    this.startObservers()
  }

  stop(): void {
    if (!this.started && this.currentVideo === null) return

    this.started = false
    this.sourceVideoObserver?.disconnect()
    this.sourceRootObserver?.disconnect()
    this.pipVideoObserver?.disconnect()
    this.sourceVideoObserver = null
    this.sourceRootObserver = null
    this.pipVideoObserver = null
    this.cleanupVideoLifecycle()
    this.clearHandoffTimers()
    this.handoffAttemptTimes = []
    this.recoveryCycleStartTimes = []
    this.recoveryCycleActive = false
    this.replacementGraceDeadline = null
    this.replacementObservationDeadline = null
    this.preferredPlayerRoot = null
    this.episodeTransition = IDLE_EPISODE_TRANSITION
    this.lastPlaybackTime = 0
    this.currentVideo = null
  }

  isVideoClickBlocked(): boolean {
    return (
      this.replacementGraceDeadline !== null &&
      Date.now() <= this.replacementGraceDeadline
    )
  }

  isEpisodeTransitionPending(): boolean {
    return this.episodeTransition.status === 'pending'
  }

  recordUserSeek(): void {
    const transition = this.episodeTransition
    if (transition.status !== 'pending') return
    this.episodeTransition = {
      ...transition,
      seekObservedAfterBoundary: true,
    }
  }

  private bindVideoLifecycle(video: HTMLVideoElement | null): void {
    this.cleanupVideoLifecycle()
    this.currentVideo = video
    if (!video) return
    this.lastPlaybackTime = Number.isFinite(video.currentTime) ? video.currentTime : 0

    const onEpisodeBoundary = () => {
      if (this.currentVideo !== video || !this.isActive()) return
      this.episodeTransition = {
        status: 'pending',
        boundaryTime: Math.max(
          this.lastPlaybackTime,
          Number.isFinite(video.currentTime) ? video.currentTime : 0
        ),
        seekObservedAfterBoundary: false,
        candidatesBeforeBoundary: new Set(this.getVideoHandoffCandidates(video)),
      }
      this.beginReplacementGrace()
      this.scheduleHandoffCheck()
    }
    const onReplacementNeeded = () => {
      if (this.currentVideo !== video || !this.isActive()) return
      if (!this.beginRecoveryCycle()) return
      this.beginReplacementGrace()
      this.scheduleHandoffCheck()
    }
    const onPlaybackRecovered = () => {
      if (
        this.currentVideo !== video ||
        video.parentElement !== this.videoArea
      ) {
        return
      }
      const transition = this.episodeTransition
      if (transition.status === 'pending' && this.started && this.isActive()) {
        const restartedNearBeginning =
          transition.boundaryTime > 30 &&
          video.currentTime <= 30
        if (restartedNearBeginning && !transition.seekObservedAfterBoundary) {
          this.episodeTransition = IDLE_EPISODE_TRANSITION
          this.onEpisodeTransition(video)
          return
        }
        const recoveredWithoutEpisodeTransition =
          transition.seekObservedAfterBoundary ||
          transition.boundaryTime <= 30 ||
          video.currentTime >
            transition.boundaryTime + SAME_VIDEO_RECOVERY_PROGRESS_SECONDS
        if (!recoveredWithoutEpisodeTransition) {
          return
        }
        this.episodeTransition = IDLE_EPISODE_TRANSITION
      }
      this.replacementGraceDeadline = null
      this.replacementObservationDeadline = null
      this.recoveryCycleActive = false
      this.clearHandoffTimers()
    }
    const onTimeUpdate = () => {
      if (this.currentVideo === video && Number.isFinite(video.currentTime)) {
        this.lastPlaybackTime = video.currentTime
        onPlaybackRecovered()
      }
    }

    const onEnded = () => onEpisodeBoundary()
    const onEmptied = () => onEpisodeBoundary()
    video.addEventListener('ended', onEnded)
    video.addEventListener('emptied', onEmptied)
    video.addEventListener('error', onReplacementNeeded)
    video.addEventListener('loadedmetadata', onPlaybackRecovered)
    video.addEventListener('playing', onPlaybackRecovered)
    video.addEventListener('timeupdate', onTimeUpdate)

    this.videoLifecycleCleanup = () => {
      video.removeEventListener('ended', onEnded)
      video.removeEventListener('emptied', onEmptied)
      video.removeEventListener('error', onReplacementNeeded)
      video.removeEventListener('loadedmetadata', onPlaybackRecovered)
      video.removeEventListener('playing', onPlaybackRecovered)
      video.removeEventListener('timeupdate', onTimeUpdate)
    }
  }

  private startObservers(): void {
    const sourceRoot = this.sourceDocument.documentElement
    const SourceMutationObserver = getMutationObserver(
      this.sourceDocument.defaultView
    )
    const PipMutationObserver = getMutationObserver(this.pipWindow)
    if (!sourceRoot || !SourceMutationObserver || !PipMutationObserver) return

    this.sourceVideoObserver = new SourceMutationObserver(() =>
      this.scheduleHandoffCheck()
    )
    this.sourceRootObserver = new SourceMutationObserver(() => {
      this.refreshSourceObservers(sourceRoot)
      this.scheduleHandoffCheck()
    })
    this.refreshSourceObservers(sourceRoot)

    this.pipVideoObserver = new PipMutationObserver(() =>
      this.scheduleHandoffCheck()
    )
    this.pipVideoObserver.observe(this.videoArea, { childList: true })
  }

  private scheduleHandoffCheck(): void {
    const currentVideo = this.currentVideo
    if (!this.started || !this.isActive()) {
      this.clearHandoffTimers()
      return
    }

    const currentVideoAttached = currentVideo?.parentElement === this.videoArea
    let replacementGraceActive = this.isReplacementGraceActive()
    const replacementObservationActive = this.isReplacementObservationActive()
    if (
      !currentVideoAttached &&
      !replacementGraceActive &&
      this.replacementGraceDeadline === null
    ) {
      if (!this.beginRecoveryCycle()) return
      this.beginReplacementGrace()
      replacementGraceActive = true
    }

    const decision = this.getVideoHandoffDecision(currentVideo)
    const candidate = decision.candidate
    if (candidate && decision.confirmsEpisodeTransition) {
      this.completeEpisodeTransition(candidate)
      return
    }
    if (
      !replacementGraceActive &&
      this.replacementGraceDeadline !== null &&
      this.handoffTimeoutTimer !== null
    ) {
      return
    }
    if (
      currentVideoAttached &&
      !replacementGraceActive &&
      !replacementObservationActive
    ) {
      if (this.replacementGraceDeadline === null) this.clearHandoffTimers()
      return
    }

    const timerWindow = this.sourceDocument.defaultView
    if (!timerWindow) return

    if (this.handoffTimeoutTimer === null) {
      this.handoffTimeoutTimer = timerWindow.setTimeout(() => {
        this.handoffTimeoutTimer = null
        const activeVideo = this.currentVideo
        const replacementPending = this.replacementGraceDeadline !== null
        if (
          replacementPending ||
          activeVideo?.parentElement !== this.videoArea
        ) {
          this.onTimeout()
        }
      }, VIDEO_HANDOFF_TIMEOUT_MS)
    }

    if (!candidate) {
      this.scheduleHandoffRetry()
      return
    }
    if (this.handoffCheckTimer !== null) return
    this.handoffCheckTimer = timerWindow.setTimeout(() => {
      this.handoffCheckTimer = null
      this.tryVideoHandoff()
    }, VIDEO_HANDOFF_SETTLE_MS)
  }

  private tryVideoHandoff(): void {
    const currentVideo = this.currentVideo
    if (!this.started || !this.isActive()) return

    const currentVideoAttached = currentVideo?.parentElement === this.videoArea
    const decision = this.getVideoHandoffDecision(currentVideo)
    const candidate = decision.candidate
    if (
      !this.isReplacementGraceActive() &&
      this.replacementGraceDeadline !== null &&
      this.handoffTimeoutTimer !== null
    ) {
      return
    }
    if (
      !candidate ||
      (currentVideoAttached &&
        !this.isReplacementGraceActive() &&
        !this.isReplacementObservationActive())
    ) {
      if (currentVideoAttached && this.replacementGraceDeadline === null) {
        this.clearHandoffTimers()
      }
      if (!candidate && this.replacementGraceDeadline !== null) {
        this.scheduleHandoffRetry()
      }
      return
    }
    if (!candidate.parentElement) {
      this.clearHandoffTimers()
      return
    }

    const transition = this.episodeTransition
    if (decision.confirmsEpisodeTransition) {
      this.completeEpisodeTransition(candidate)
      return
    }

    if (candidate !== currentVideo && !this.beginRecoveryCycle()) return
    const candidatePlayerRoot = this.getPlayerRoot(candidate.parentElement)

    const didHandoff = (() => {
      try {
        return this.onVideoHandoff(candidate)
      } catch {
        return false
      }
    })()
    if (!didHandoff || !this.started || !this.isActive()) {
      const now = Date.now()
      this.handoffAttemptTimes = this.handoffAttemptTimes.filter(
        attemptTime => now - attemptTime <= VIDEO_HANDOFF_ATTEMPT_WINDOW_MS
      )
      this.handoffAttemptTimes.push(now)
      if (this.handoffAttemptTimes.length >= VIDEO_HANDOFF_MAX_ATTEMPTS) {
        this.onTimeout()
        return
      }
      this.clearHandoffCheckTimer()
      this.scheduleHandoffRetry()
      return
    }

    this.handoffAttemptTimes = []
    this.recoveryCycleActive = false
    this.bindVideoLifecycle(candidate)
    this.preferredPlayerRoot = candidatePlayerRoot ?? this.preferredPlayerRoot
    this.replacementGraceDeadline = null
    this.replacementObservationDeadline =
      candidate === currentVideo
        ? Date.now() + VIDEO_HANDOFF_REPLACEMENT_WINDOW_MS
        : null
    this.clearHandoffTimers()
    if (transition.status === 'pending' && candidate !== currentVideo) {
      this.episodeTransition = IDLE_EPISODE_TRANSITION
    }
  }

  private isReplacementGraceActive(): boolean {
    if (this.replacementGraceDeadline === null) return false
    if (Date.now() <= this.replacementGraceDeadline) return true
    return false
  }

  private isReplacementObservationActive(): boolean {
    if (this.replacementObservationDeadline === null) return false
    if (Date.now() <= this.replacementObservationDeadline) return true
    this.replacementObservationDeadline = null
    return false
  }

  private beginReplacementGrace(): void {
    this.replacementGraceDeadline = Date.now() + VIDEO_HANDOFF_TIMEOUT_MS
  }

  private beginRecoveryCycle(): boolean {
    if (this.recoveryCycleActive) return true
    const now = Date.now()
    this.recoveryCycleStartTimes = this.recoveryCycleStartTimes.filter(
      startedAt => now - startedAt < VIDEO_HANDOFF_ATTEMPT_WINDOW_MS
    )
    this.recoveryCycleStartTimes.push(now)
    this.recoveryCycleActive = true
    if (this.recoveryCycleStartTimes.length < VIDEO_HANDOFF_MAX_ATTEMPTS) return true
    this.onTimeout()
    return false
  }

  private isNewEpisodeCandidate(
    currentVideo: HTMLVideoElement | null,
    candidate: HTMLVideoElement
  ): boolean {
    const transition = this.episodeTransition
    return (
      transition.status === 'pending' &&
      candidate !== currentVideo &&
      !transition.candidatesBeforeBoundary.has(candidate)
    )
  }

  private getVideoHandoffDecision(
    currentVideo: HTMLVideoElement | null
  ): VideoHandoffDecision {
    const candidate = this.findVideoHandoffCandidate(currentVideo)
    return {
      candidate,
      confirmsEpisodeTransition:
        candidate !== null && this.isNewEpisodeCandidate(currentVideo, candidate),
    }
  }

  private completeEpisodeTransition(candidate: HTMLVideoElement): void {
    this.episodeTransition = IDLE_EPISODE_TRANSITION
    this.clearHandoffTimers()
    this.onEpisodeTransition(candidate)
  }

  private findVideoHandoffCandidate(
    currentVideo: HTMLVideoElement | null
  ): HTMLVideoElement | null {
    const candidates = this.getVideoHandoffCandidates(currentVideo)
    const transition = this.episodeTransition
    if (transition.status === 'pending') {
      const nextEpisodeVideo = selectPresentationReadyVideo(
        candidates.filter(video => !transition.candidatesBeforeBoundary.has(video))
      )
      if (nextEpisodeVideo) return nextEpisodeVideo
    }

    const replacementVideo = selectPresentationReadyVideo(
      candidates.filter(isUsablePresentationVideo)
    )
    if (replacementVideo) return replacementVideo

    return currentVideo &&
      currentVideo.parentElement !== this.videoArea &&
      currentVideo.parentElement &&
      isUsablePresentationVideo(currentVideo)
      ? currentVideo
      : null
  }

  private getVideoHandoffCandidates(
    currentVideo: HTMLVideoElement | null
  ): HTMLVideoElement[] {
    const playerRoots = this.getPlayerRoots()
    const currentVideoRoot =
      currentVideo?.ownerDocument === this.sourceDocument
        ? this.getPlayerRoot(currentVideo.parentElement)
        : null
    const currentVideoInSourceDocument =
      currentVideo?.ownerDocument === this.sourceDocument &&
      currentVideo.parentElement !== null
    const preferredRoot = currentVideoRoot ??
      (currentVideoInSourceDocument ? null : this.preferredPlayerRoot)
    const searchRoots: ParentNode[] = preferredRoot?.isConnected
      ? [
          preferredRoot,
          ...playerRoots.filter(playerRoot => playerRoot !== preferredRoot),
        ]
      : playerRoots.length > 0
        ? playerRoots
        : [this.sourceDocument]
    const candidates = new Set<HTMLVideoElement>()
    for (const root of searchRoots) {
      for (const video of root.querySelectorAll<HTMLVideoElement>('video')) {
        if (video !== currentVideo && video.parentElement !== null) candidates.add(video)
      }
    }
    return Array.from(candidates)
  }

  private clearHandoffTimers(): void {
    this.clearHandoffCheckTimer()
    const timerWindow = this.sourceDocument.defaultView
    if (timerWindow && this.handoffTimeoutTimer !== null) {
      timerWindow.clearTimeout(this.handoffTimeoutTimer)
    }
    this.handoffTimeoutTimer = null
  }

  private clearHandoffCheckTimer(): void {
    const timerWindow = this.sourceDocument.defaultView
    if (timerWindow && this.handoffCheckTimer !== null) {
      timerWindow.clearTimeout(this.handoffCheckTimer)
    }
    this.handoffCheckTimer = null
  }

  private scheduleHandoffRetry(): void {
    const timerWindow = this.sourceDocument.defaultView
    if (
      !timerWindow ||
      this.handoffCheckTimer !== null ||
      !this.started ||
      !this.isActive()
    ) {
      return
    }
    this.handoffCheckTimer = timerWindow.setTimeout(() => {
      this.handoffCheckTimer = null
      this.tryVideoHandoff()
    }, VIDEO_HANDOFF_SETTLE_MS)
  }

  private cleanupVideoLifecycle(): void {
    this.videoLifecycleCleanup?.()
    this.videoLifecycleCleanup = null
  }

  private getPlayerRoots(): HTMLElement[] {
    return Array.from(
      this.sourceDocument.querySelectorAll<HTMLElement>(PLAYER_ROOT_SELECTOR)
    )
  }

  private getPlayerRoot(parent: HTMLElement | null): HTMLElement | null {
    return parent?.closest(PLAYER_ROOT_SELECTOR) ?? null
  }

  private refreshSourceObservers(sourceRoot: HTMLElement): void {
    if (!this.sourceVideoObserver || !this.sourceRootObserver) return

    const playerRoots = this.getPlayerRoots()
    const sourceTargets =
      playerRoots.length > 0 ? playerRoots : [this.sourceDocument.body ?? sourceRoot]
    this.sourceVideoObserver.disconnect()
    for (const target of sourceTargets) {
      this.sourceVideoObserver.observe(target, { childList: true, subtree: true })
    }

    this.sourceRootObserver.disconnect()
    if (playerRoots.length === 0) return

    const structureTargets = new Set<HTMLElement>()
    for (const playerRoot of playerRoots) {
      let ancestor = playerRoot.parentElement
      structureTargets.add(playerRoot)
      while (ancestor) {
        structureTargets.add(ancestor)
        if (ancestor === this.sourceDocument.body) break
        ancestor = ancestor.parentElement
      }
    }
    for (const target of structureTargets) {
      this.sourceRootObserver.observe(target, {
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'data-uia'],
      })
    }
  }
}

export const createPipVideoHandoff = (options: PipVideoHandoffOptions) =>
  new PipVideoHandoffImplementation(options)
