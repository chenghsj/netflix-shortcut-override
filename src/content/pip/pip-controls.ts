import {
  createNetflixPlaybackSession,
  type NetflixPlaybackSession,
  type PlaybackCommandResult,
} from '@/content/netflix-playback-session'

const PIP_CONTROLS_MARKER = 'shortcutOverridePipControls'
const PIP_CONTROL_MARKER = 'shortcutOverridePipControl'
const PIP_CONTROLS_STYLE_MARKER = 'shortcutOverridePipControlsStyle'
const IDLE_HIDE_DELAY_MS = 1_200
const SEEK_CONFIRM_TIMEOUT_MS = 3_000
const SEEK_CONFIRM_TOLERANCE_SECONDS = 0.75

const formatTime = (value: number | null): string => {
  if (value === null || !Number.isFinite(value) || value < 0) return '--:--'

  const totalSeconds = Math.floor(value)
  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const getFiniteDuration = (video: HTMLVideoElement): number | null => {
  const duration = video.duration
  return Number.isFinite(duration) && duration > 0 ? duration : null
}

const getCurrentTime = (video: HTMLVideoElement, duration: number | null): number => {
  const currentTime = Number.isFinite(video.currentTime) ? Math.max(0, video.currentTime) : 0
  return duration === null ? currentTime : Math.min(duration, currentTime)
}

const createDefaultActions = (): PipControlActions => {
  const playbackSession = createNetflixPlaybackSession()
  return { seekTo: milliseconds => playbackSession.seekTo(milliseconds) }
}

export type PipControlActions = {
  seekTo: (milliseconds: number) => Promise<PlaybackCommandResult>
}

export type PipControlsOptions = {
  pipWindow: Window
  video: HTMLVideoElement
  videoArea: HTMLElement
  actions?: PipControlActions
  playbackSession?: NetflixPlaybackSession
}

const STYLE_TEXT = `
[data-shortcut-override-pip-controls] {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  flex-direction: column;
  box-sizing: border-box;
  padding: 0 16px 12px;
  color: #fff;
  font-family: Arial, sans-serif;
  background: linear-gradient(to top, rgba(0, 0, 0, .86), rgba(0, 0, 0, 0) 48%);
  opacity: 1;
  transition: opacity 160ms ease;
  pointer-events: none;
}

[data-shortcut-override-pip-controls][data-visible="false"] {
  opacity: 0;
}

[data-shortcut-override-pip-controls] [data-pip-control="timeline-shell"] {
  pointer-events: auto;
}

[data-pip-control="timeline-shell"] {
  width: 100%;
  padding: 4px 0 8px;
}

[data-pip-control="timeline"] {
  --pip-progress: 0%;
  display: block;
  width: 100%;
  height: 4px;
  margin: 0;
  appearance: none;
  border-radius: 2px;
  outline: none;
  background: linear-gradient(to right, #e50914 0%, #e50914 var(--pip-progress), rgba(255, 255, 255, .72) var(--pip-progress), rgba(255, 255, 255, .72) 100%);
  cursor: pointer;
}

[data-pip-control="timeline"]::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: transparent;
}

[data-pip-control="timeline"]::-webkit-slider-thumb {
  width: 12px;
  height: 12px;
  margin-top: -4px;
  appearance: none;
  border: 0;
  border-radius: 50%;
  background: #e50914;
}

[data-pip-control="timeline"]::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, .72);
}

[data-pip-control="timeline"]::-moz-range-progress {
  height: 4px;
  border-radius: 2px;
  background: #e50914;
}

[data-pip-control="timeline"]::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border: 0;
  border-radius: 50%;
  background: #e50914;
}

[data-pip-control="time"] {
  align-self: flex-start;
  padding-top: 2px;
  color: rgba(255, 255, 255, .94);
  font-size: 12px;
  white-space: nowrap;
}

[data-pip-control="error"] {
  position: absolute;
  right: 16px;
  bottom: 30px;
  max-width: calc(100% - 32px);
  padding: 5px 8px;
  color: #fff;
  border-radius: 3px;
  background: rgba(80, 0, 0, .84);
  font-size: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
}

[data-pip-control="error"][data-visible="true"] {
  opacity: 1;
}

@media (max-width: 360px), (max-height: 200px) {
  [data-shortcut-override-pip-controls] {
    padding-right: 8px;
    padding-left: 8px;
    padding-bottom: 6px;
  }

  [data-pip-control="time"] {
    font-size: 10px;
  }

}
`

export class PipControls {
  private readonly pipWindow: Window
  private readonly video: HTMLVideoElement
  private readonly videoArea: HTMLElement
  private readonly actions: PipControlActions
  private root: HTMLElement | null = null
  private timeline: HTMLInputElement | null = null
  private currentTimeLabel: HTMLElement | null = null
  private durationLabel: HTMLElement | null = null
  private errorLabel: HTMLElement | null = null
  private styleElement: HTMLStyleElement | null = null
  private idleTimer: number | null = null
  private errorTimer: number | null = null
  private seekConfirmationTimer: number | null = null
  private started = false
  private dragging = false
  private pendingTimelineCommit = false
  private pendingSeekTarget: number | null = null
  private seekRequestId = 0
  private focused = false
  private readonly cleanups: Array<() => void> = []

  constructor(options: PipControlsOptions) {
    this.pipWindow = options.pipWindow
    this.video = options.video
    this.videoArea = options.videoArea
    const playbackSession = options.playbackSession
    this.actions =
      options.actions ??
      (playbackSession
        ? { seekTo: milliseconds => playbackSession.seekTo(milliseconds) }
        : createDefaultActions())
  }

  start(): void {
    if (this.started) return
    this.started = true

    const doc = this.pipWindow.document
    this.styleElement = doc.createElement('style')
    this.styleElement.dataset[PIP_CONTROLS_STYLE_MARKER] = 'true'
    this.styleElement.textContent = STYLE_TEXT
    doc.head.appendChild(this.styleElement)

    const root = doc.createElement('div')
    root.dataset[PIP_CONTROLS_MARKER] = 'true'
    root.dataset.visible = 'true'
    root.setAttribute('aria-label', 'PiP playback controls')

    const timelineShell = doc.createElement('div')
    timelineShell.dataset.pipControl = 'timeline-shell'
    timelineShell.dataset[PIP_CONTROL_MARKER] = 'true'

    const timeline = doc.createElement('input')
    timeline.type = 'range'
    timeline.min = '0'
    timeline.step = '0.1'
    timeline.dataset.pipControl = 'timeline'
    timeline.dataset[PIP_CONTROL_MARKER] = 'true'
    timeline.setAttribute('aria-label', 'Seek timeline')
    timelineShell.appendChild(timeline)

    const time = doc.createElement('span')
    time.dataset.pipControl = 'time'
    time.dataset[PIP_CONTROL_MARKER] = 'true'
    const currentTimeLabel = doc.createElement('span')
    currentTimeLabel.dataset.pipControl = 'current-time'
    const separator = doc.createTextNode(' / ')
    const durationLabel = doc.createElement('span')
    durationLabel.dataset.pipControl = 'duration'
    time.append(currentTimeLabel, separator, durationLabel)

    const errorLabel = doc.createElement('div')
    errorLabel.dataset.pipControl = 'error'
    errorLabel.dataset[PIP_CONTROL_MARKER] = 'true'
    errorLabel.dataset.visible = 'false'
    errorLabel.setAttribute('role', 'status')
    errorLabel.setAttribute('aria-live', 'polite')

    root.append(timelineShell, time, errorLabel)
    this.videoArea.appendChild(root)

    this.root = root
    this.timeline = timeline
    this.currentTimeLabel = currentTimeLabel
    this.durationLabel = durationLabel
    this.errorLabel = errorLabel

    this.listen(this.video, 'timeupdate', () => this.syncFromVideo())
    this.listen(this.video, 'loadedmetadata', () => this.syncFromVideo())
    this.listen(this.video, 'durationchange', () => this.syncFromVideo())
    this.listen(this.video, 'loadstart', () => this.syncFromVideo())
    this.listen(this.video, 'emptied', () => this.syncFromVideo())

    this.listen(this.videoArea, 'pointerenter', () => this.revealControls())
    this.listen(this.videoArea, 'pointermove', () => this.revealControls())
    this.listen(this.videoArea, 'mousemove', () => this.revealControls())
    this.listen(this.videoArea, 'pointerleave', () => this.scheduleHide())
    this.listen(root, 'focusin', () => {
      this.focused = true
      this.revealControls()
    })
    this.listen(root, 'focusout', () => {
      this.focused = false
      this.scheduleHide()
    })

    this.listen(timeline, 'pointerdown', () => {
      this.seekRequestId += 1
      this.clearPendingSeek()
      this.dragging = true
      this.pendingTimelineCommit = false
      this.revealControls()
    })
    this.listen(timeline, 'input', () => {
      this.pendingTimelineCommit = true
      this.dragging = true
      this.syncPreview()
    })
    this.listen(timeline, 'change', () => this.commitTimeline())
    this.listen(timeline, 'pointerup', () => this.commitTimeline())
    this.listen(timeline, 'pointercancel', () => this.cancelTimelinePreview())
    this.listen(root, 'click', event => event.stopPropagation())
    this.listen(root, 'pointerdown', event => event.stopPropagation())
    this.listen(root, 'keydown', event => event.stopPropagation())
    this.listen(root, 'keyup', event => event.stopPropagation())

    this.syncFromVideo()
    this.scheduleHide()
  }

  destroy(): void {
    if (!this.started) return
    this.started = false

    for (const cleanup of this.cleanups.splice(0)) cleanup()
    if (this.idleTimer !== null) this.pipWindow.clearTimeout(this.idleTimer)
    if (this.errorTimer !== null) this.pipWindow.clearTimeout(this.errorTimer)
    this.clearPendingSeek()
    this.idleTimer = null
    this.errorTimer = null
    this.styleElement?.remove()
    this.styleElement = null
    this.root?.remove()
    this.root = null
    this.timeline = null
    this.currentTimeLabel = null
    this.durationLabel = null
    this.errorLabel = null
    this.dragging = false
    this.pendingTimelineCommit = false
    this.seekRequestId += 1
    this.focused = false
  }

  private listen(target: EventTarget, type: string, listener: EventListener): void {
    target.addEventListener(type, listener)
    this.cleanups.push(() => target.removeEventListener(type, listener))
  }

  private syncFromVideo(): void {
    if (!this.timeline || !this.currentTimeLabel || !this.durationLabel) return
    const duration = getFiniteDuration(this.video)
    const currentTime = getCurrentTime(this.video, duration)
    if (
      this.pendingSeekTarget !== null &&
      Math.abs(currentTime - this.pendingSeekTarget) <= SEEK_CONFIRM_TOLERANCE_SECONDS
    ) {
      this.clearPendingSeek()
    }
    const displayedTime =
      this.dragging || this.pendingTimelineCommit
        ? Number(this.timeline.value)
        : (this.pendingSeekTarget ?? currentTime)
    this.timeline.max = duration === null ? '0' : duration.toString()
    if (!this.dragging && !this.pendingTimelineCommit) this.timeline.value = displayedTime.toString()
    this.currentTimeLabel.textContent = formatTime(displayedTime)
    this.durationLabel.textContent = formatTime(duration)
    this.updateTimelineProgress(displayedTime, duration)

  }

  private syncPreview(): void {
    if (!this.timeline || !this.currentTimeLabel) return
    const duration = getFiniteDuration(this.video)
    const previewTime = Number(this.timeline.value)
    this.currentTimeLabel.textContent = formatTime(previewTime)
    this.updateTimelineProgress(previewTime, duration)
    this.revealControls()
  }

  private updateTimelineProgress(value: number, duration: number | null): void {
    if (!this.timeline) return
    const progress = duration && duration > 0 ? Math.min(100, Math.max(0, (value / duration) * 100)) : 0
    this.timeline.style.setProperty('--pip-progress', `${progress}%`)
  }

  private commitTimeline(): void {
    if (!this.timeline) return
    this.timeline.blur()
    if (!this.pendingTimelineCommit && !this.dragging) return
    const requestedTime = Number(this.timeline.value)
    const targetTime = Number.isFinite(requestedTime) ? Math.max(0, requestedTime) : 0
    this.pendingTimelineCommit = false
    this.dragging = false
    const requestId = ++this.seekRequestId
    this.beginPendingSeek(targetTime, requestId)
    void this.runSeek(this.actions.seekTo(targetTime * 1_000), requestId)
  }

  private cancelTimelinePreview(): void {
    this.timeline?.blur()
    this.pendingTimelineCommit = false
    this.dragging = false
    this.syncFromVideo()
  }

  private beginPendingSeek(targetTime: number, requestId: number): void {
    this.clearPendingSeek()
    this.pendingSeekTarget = targetTime
    this.seekConfirmationTimer = this.pipWindow.setTimeout(() => {
      if (requestId !== this.seekRequestId) return
      this.pendingSeekTarget = null
      this.seekConfirmationTimer = null
      this.syncFromVideo()
    }, SEEK_CONFIRM_TIMEOUT_MS)
  }

  private clearPendingSeek(): void {
    if (this.seekConfirmationTimer !== null) {
      this.pipWindow.clearTimeout(this.seekConfirmationTimer)
    }
    this.seekConfirmationTimer = null
    this.pendingSeekTarget = null
  }

  private async runSeek(
    request: Promise<PlaybackCommandResult>,
    requestId: number
  ): Promise<void> {
    try {
      const { failureLabel } = await request
      if (failureLabel && requestId === this.seekRequestId) {
        this.clearPendingSeek()
        this.syncFromVideo()
        this.showError(failureLabel)
      }
    } catch (error) {
      if (requestId !== this.seekRequestId) return
      this.clearPendingSeek()
      this.syncFromVideo()
      this.showError(`Seek failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private showError(message: string): void {
    if (!this.errorLabel) return
    if (this.errorTimer !== null) this.pipWindow.clearTimeout(this.errorTimer)
    this.errorLabel.textContent = message
    this.errorLabel.dataset.visible = 'true'
    this.errorTimer = this.pipWindow.setTimeout(() => {
      if (this.errorLabel) this.errorLabel.dataset.visible = 'false'
      this.errorTimer = null
    }, 1_800)
    this.revealControls()
  }

  private revealControls(): void {
    if (!this.root) return
    this.root.dataset.visible = 'true'
    this.scheduleHide()
  }

  private scheduleHide(): void {
    if (!this.root || this.focused) return
    if (this.idleTimer !== null) this.pipWindow.clearTimeout(this.idleTimer)
    this.idleTimer = this.pipWindow.setTimeout(() => {
      if (this.root && !this.focused) this.root.dataset.visible = 'false'
      this.idleTimer = null
    }, IDLE_HIDE_DELAY_MS)
  }
}
