import type { PlaybackCommandResult } from '@/content/netflix-playback-session'

const SEEK_CONFIRM_TIMEOUT_MS = 3_000
const SEEK_CONFIRM_TOLERANCE_SECONDS = 0.75

type PipTimelineControllerOptions = {
  pipWindow: Window
  video: HTMLVideoElement
  timeline: HTMLInputElement
  currentTimeLabel: HTMLElement
  durationLabel: HTMLElement
  seekTo: (milliseconds: number) => Promise<PlaybackCommandResult>
  resumeAfterSeek?: () => Promise<PlaybackCommandResult>
  onReveal: () => void
  onError: (message: string) => void
}

const formatTime = (value: number | null): string => {
  if (value === null || !Number.isFinite(value) || value < 0) return '--:--'
  const totalSeconds = Math.floor(value)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getFiniteDuration = (video: HTMLVideoElement): number | null =>
  Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null

const getCurrentTime = (video: HTMLVideoElement, duration: number | null): number => {
  const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0
  return duration === null ? currentTime : Math.min(duration, currentTime)
}

class PipTimelineController {
  private readonly options: PipTimelineControllerOptions
  private readonly cleanups: Array<() => void> = []
  private confirmationTimer: number | null = null
  private pendingTarget: number | null = null
  private requestId = 0
  private dragging = false
  private pendingCommit = false
  private started = false

  constructor(options: PipTimelineControllerOptions) {
    this.options = options
  }

  get isInteracting(): boolean {
    return this.dragging
  }

  start(): void {
    if (this.started) return
    this.started = true
    const { video, timeline } = this.options
    for (const type of ['timeupdate', 'loadedmetadata', 'durationchange', 'loadstart', 'emptied']) {
      this.listen(video, type, () => this.syncFromVideo())
    }
    this.listen(timeline, 'pointerdown', () => {
      this.requestId += 1
      this.clearPendingSeek()
      this.dragging = true
      this.pendingCommit = false
      timeline.dataset.dragging = 'true'
      this.options.onReveal()
    })
    this.listen(timeline, 'input', () => {
      this.pendingCommit = true
      this.dragging = true
      timeline.dataset.dragging = 'true'
      this.syncPreview()
    })
    this.listen(timeline, 'change', () => this.commit())
    this.listen(timeline, 'pointerup', () => this.commit())
    this.listen(timeline, 'pointercancel', () => this.cancelPreview())
    this.syncFromVideo()
  }

  updateLabel(label: string): void {
    this.options.timeline.setAttribute('aria-label', label)
    this.options.timeline.title = label
  }

  destroy(): void {
    if (!this.started) return
    this.started = false
    for (const cleanup of this.cleanups.splice(0)) cleanup()
    this.requestId += 1
    this.clearPendingSeek()
    this.dragging = false
    this.pendingCommit = false
  }

  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener)
    this.cleanups.push(() => target.removeEventListener(type, listener))
  }

  private syncFromVideo(): void {
    const { video, timeline, currentTimeLabel, durationLabel } = this.options
    const duration = getFiniteDuration(video)
    const currentTime = getCurrentTime(video, duration)
    if (
      this.pendingTarget !== null &&
      Math.abs(currentTime - this.pendingTarget) <= SEEK_CONFIRM_TOLERANCE_SECONDS
    ) {
      this.clearPendingSeek()
    }
    const displayedTime =
      this.dragging || this.pendingCommit
        ? Number(timeline.value)
        : (this.pendingTarget ?? currentTime)
    timeline.max = duration === null ? '0' : duration.toString()
    if (!this.dragging && !this.pendingCommit) timeline.value = displayedTime.toString()
    currentTimeLabel.textContent = formatTime(displayedTime)
    durationLabel.textContent = formatTime(duration)
    this.updateProgress(displayedTime, duration)
  }

  private syncPreview(): void {
    const { video, timeline, currentTimeLabel } = this.options
    const previewTime = Number(timeline.value)
    currentTimeLabel.textContent = formatTime(previewTime)
    this.updateProgress(previewTime, getFiniteDuration(video))
    this.options.onReveal()
  }

  private updateProgress(value: number, duration: number | null): void {
    const progress =
      duration && duration > 0
        ? Math.min(100, Math.max(0, (value / duration) * 100))
        : 0
    this.options.timeline.style.setProperty('--pip-progress', `${progress}%`)
  }

  private commit(): void {
    const { timeline, video, resumeAfterSeek, seekTo } = this.options
    timeline.blur()
    if (!this.pendingCommit && !this.dragging) return
    const requestedTime = Number(timeline.value)
    const targetTime = Number.isFinite(requestedTime) ? Math.max(0, requestedTime) : 0
    this.pendingCommit = false
    this.dragging = false
    timeline.dataset.dragging = 'false'
    const requestId = ++this.requestId
    const shouldResume = resumeAfterSeek !== undefined && (video.ended || !video.paused)
    this.beginPendingSeek(targetTime, requestId)
    void this.runSeek(seekTo(targetTime * 1_000), requestId, shouldResume)
  }

  private cancelPreview(): void {
    this.options.timeline.blur()
    this.pendingCommit = false
    this.dragging = false
    this.options.timeline.dataset.dragging = 'false'
    this.syncFromVideo()
  }

  private beginPendingSeek(targetTime: number, requestId: number): void {
    this.clearPendingSeek()
    this.pendingTarget = targetTime
    this.confirmationTimer = this.options.pipWindow.setTimeout(() => {
      if (requestId !== this.requestId) return
      this.pendingTarget = null
      this.confirmationTimer = null
      this.syncFromVideo()
    }, SEEK_CONFIRM_TIMEOUT_MS)
  }

  private clearPendingSeek(): void {
    if (this.confirmationTimer !== null) {
      this.options.pipWindow.clearTimeout(this.confirmationTimer)
    }
    this.confirmationTimer = null
    this.pendingTarget = null
  }

  private async runSeek(
    request: Promise<PlaybackCommandResult>,
    requestId: number,
    shouldResume: boolean
  ): Promise<void> {
    try {
      const seekResult = await request
      if (seekResult.failureLabel && requestId === this.requestId) {
        this.clearPendingSeek()
        this.syncFromVideo()
        this.options.onError(seekResult.failureLabel)
        return
      }
      if (!shouldResume || requestId !== this.requestId) return
      const resumeResult = await this.options.resumeAfterSeek!()
      if (resumeResult.failureLabel && requestId === this.requestId) {
        this.clearPendingSeek()
        this.syncFromVideo()
        this.options.onError(resumeResult.failureLabel)
      }
    } catch (error) {
      if (requestId !== this.requestId) return
      this.clearPendingSeek()
      this.syncFromVideo()
      this.options.onError(
        `Seek failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

export const createPipTimelineController = (options: PipTimelineControllerOptions) =>
  new PipTimelineController(options)
