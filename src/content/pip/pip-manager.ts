import { canHandlePlaybackShortcut, findVideo } from '@/content/dom-utils'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { findSubtitleSearchRoot, SubtitleMirror } from './pip-subtitle-mirror'
import { PipControls } from './pip-controls'
import { createPipVideoHandoff } from './pip-video-handoff'
import {
  getNetflixVideoTitle,
  getNetflixWatchId,
  startNextEpisodePauseGuard,
} from './next-episode-pause-guard'
import {
  createNetflixPlaybackSession,
  type NetflixPlaybackSession,
} from '@/content/netflix-playback-session'
import { VideoPlacement } from './video-placement'
import { markPipDocument } from './pip-document'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getCopy } from '@/shared/i18n'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import type { ShortcutCommandController } from '@/content/shortcuts/shortcut-command-controller'

type DocumentPictureInPictureApi = {
  requestWindow: (options?: {
    width?: number
    height?: number
    disallowReturnToOpener?: boolean
    preferInitialWindowPlacement?: boolean
  }) => Promise<Window>
}

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPictureApi
}

const PIP_INITIAL_WIDTH = 640
const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9
const PLAYBACK_CONTEXT_CHECK_INTERVAL_MS = 250
const WATCH_ID_CHANGE_CLASSIFICATION_MS = 500
const SOURCE_WATCH_CHANGE_USER_INTENT_MS = 1_500
export type PipKeyboardHandlers = {
  onKeydown: (event: KeyboardEvent, targetDoc: Document) => void
  onKeyup: (event: KeyboardEvent, targetDoc: Document) => void
  onBlur?: (targetDoc: Document) => void
  onClick?: (event: MouseEvent, targetDoc: Document) => void
}

type PipManagerOptions = PipKeyboardHandlers & {
  sourceDocument?: Document
  playbackSession?: NetflixPlaybackSession
  commands?: Pick<ShortcutCommandController, 'execute' | 'setVolume'>
  settings?: ShortcutSettings
  onSettingsChange?: (settings: ShortcutSettings) => void
}

const getDocumentPictureInPicture = (sourceWindow: Window): DocumentPictureInPictureApi | null => {
  const api = (sourceWindow as WindowWithDocumentPictureInPicture).documentPictureInPicture
  return api && typeof api.requestWindow === 'function' ? api : null
}

const getVideoAspectRatio = (video: HTMLVideoElement): number => {
  if (video.videoWidth > 0 && video.videoHeight > 0) {
    return video.videoWidth / video.videoHeight
  }

  const rect = video.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 ? rect.width / rect.height : DEFAULT_VIDEO_ASPECT_RATIO
}

const isPipControlTarget = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== 'object' || !('closest' in target)) return false

  const closest = (target as Element).closest
  return typeof closest === 'function' && Boolean(closest.call(target, '[data-shortcut-override-pip-control]'))
}

export class PipManager {
  private readonly sourceDocument: Document
  private readonly keyboardHandlers: PipKeyboardHandlers
  private readonly videoPlacement: VideoPlacement
  private readonly playbackSession: NetflixPlaybackSession
  private readonly commands: PipManagerOptions['commands']
  private readonly onSettingsChange: PipManagerOptions['onSettingsChange']
  private settings: ShortcutSettings
  private pipWindow: Window | null = null

  private subtitleMirror: SubtitleMirror | null = null
  private pipControls: PipControls | null = null
  private videoHandoff: ReturnType<typeof createPipVideoHandoff> | null = null
  private videoArea: HTMLElement | null = null
  private keyboardCleanup: (() => void) | null = null
  private playbackContextCleanup: (() => void) | null = null
  private nextEpisodePauseCleanup: (() => void) | null = null
  private pipEntryWatchId: string | null = null
  private pipEntryVideoTitle: string | null = null
  private sourceWatchChangeIntentDeadline = 0
  private restoring = false
  private entering = false
  private entryVersion = 0

  constructor(options: PipManagerOptions) {
    const { sourceDocument, onKeydown, onKeyup, onBlur, onClick, playbackSession } = options
    this.sourceDocument = sourceDocument ?? document
    this.videoPlacement = new VideoPlacement(this.sourceDocument)
    this.playbackSession = playbackSession ?? createNetflixPlaybackSession()
    this.commands = options.commands
    this.keyboardHandlers = { onKeydown, onKeyup, onBlur, onClick }
    this.onSettingsChange = options.onSettingsChange
    this.settings = options.settings ?? DEFAULT_SETTINGS
  }

  static isSupported(sourceWindow: Window = window): boolean {
    if (!getBrowserCapabilities(sourceWindow.navigator.userAgent).supportsSubtitlePreservingPip) {
      return false
    }
    return getDocumentPictureInPicture(sourceWindow) !== null
  }

  get isActive(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed
  }

  getPipDocument(): Document | null {
    return this.isActive ? this.pipWindow?.document ?? null : null
  }

  isPipDocument(targetDoc: Document): boolean {
    return this.getPipDocument() === targetDoc
  }

  updateSettings(settings: ShortcutSettings): void {
    this.settings = settings
    this.subtitleMirror?.setSettings(settings.pip)
    this.pipControls?.updateSettings(this.getControlsSettings())
  }

  recordUserSeek(): void {
    this.videoHandoff?.recordUserSeek()
  }

  async toggle(): Promise<boolean> {
    if (this.isActive) {
      this.exit()
      return true
    }

    return this.enter()
  }

  async enter(): Promise<boolean> {
    if (this.entering) return false
    this.stopNextEpisodePauseGuard()
    const entryVersion = ++this.entryVersion
    this.entering = true

    try {
      if (this.pipWindow?.closed) this.restore()
      const sourceWindow = this.sourceDocument.defaultView
      if (!sourceWindow || !PipManager.isSupported(sourceWindow) || this.isActive) return false
      this.pipEntryWatchId = getNetflixWatchId(sourceWindow)
      this.pipEntryVideoTitle = getNetflixVideoTitle(this.sourceDocument)
      this.sourceWatchChangeIntentDeadline = 0

      const video = findVideo(this.sourceDocument)
      const parent = video?.parentElement
      if (!video || !parent) return false
      const shouldMonitorPlaybackContext = canHandlePlaybackShortcut(this.sourceDocument)

      this.videoPlacement.prepare(video)

      let pipWin: Window | null = null

      try {
        pipWin = await this.requestPipWindow(video, sourceWindow)
        if (entryVersion !== this.entryVersion) {
          if (!pipWin.closed) pipWin.close()
          return false
        }

        this.pipWindow = pipWin
        this.initPipDocument(pipWin, this.sourceDocument)

        const videoArea = this.videoPlacement.createPipVideoArea(pipWin)
        this.videoArea = videoArea
        this.mountVideoBindings(pipWin, video, videoArea, parent)
        pipWin.document.body.appendChild(videoArea)
        this.attachPipEventListeners(pipWin)
        this.startVideoHandoffMonitoring(pipWin, video, videoArea)
        this.startPlaybackContextMonitoring(pipWin, shouldMonitorPlaybackContext)
        return true
      } catch {
        const failedWindow = pipWin
        if (entryVersion === this.entryVersion) this.restore()
        if (failedWindow && !failedWindow.closed) failedWindow.close()
        return false
      }
    } finally {
      if (entryVersion === this.entryVersion) this.entering = false
    }
  }

  exit(): void {
    if (this.entering) {
      this.cancelPendingEntry()
      return
    }

    if (!this.isActive) return

    const pipWin = this.pipWindow
    if (!pipWin) return
    this.keyboardHandlers.onBlur?.(pipWin.document)
    this.restore()
    if (pipWin && !pipWin.closed) pipWin.close()
  }

  destroy(): void {
    this.cancelPendingEntry()
    this.stopNextEpisodePauseGuard()

    const pipWin = this.pipWindow
    this.restore()
    if (pipWin && !pipWin.closed) pipWin.close()
  }

  private cancelPendingEntry(): void {
    if (!this.entering) return

    this.entryVersion += 1
    this.entering = false
    this.restore()
  }

  private requestPipWindow(video: HTMLVideoElement, sourceWindow: Window): Promise<Window> {
    const height = Math.round(PIP_INITIAL_WIDTH / getVideoAspectRatio(video))
    return getDocumentPictureInPicture(sourceWindow)!.requestWindow({
      width: PIP_INITIAL_WIDTH,
      height,
    })
  }

  private initPipDocument(pipWin: Window, sourceDocument: Document): void {
    if (!pipWin.document.body) throw new Error('PiP document has no body')

    markPipDocument(pipWin.document)

    this.copyStyles(pipWin, sourceDocument)

    const style = pipWin.document.createElement('style')
    style.textContent = '* { outline: none !important; }'
    pipWin.document.head.appendChild(style)

    Object.assign(pipWin.document.body.style, {
      margin: '0',
      padding: '0',
      overflow: 'hidden',
      background: '#000',
      userSelect: 'none',
      width: '100%',
      height: '100%',
    })
  }

  private attachPipEventListeners(pipWin: Window): void {
    const onKeydown = (event: KeyboardEvent) => {
      if (isPipControlTarget(event.target)) return
      this.keyboardHandlers.onKeydown(event, pipWin.document)
    }
    const onKeyup = (event: KeyboardEvent) => {
      if (isPipControlTarget(event.target)) return
      this.keyboardHandlers.onKeyup(event, pipWin.document)
    }
    const onBlur = () => {
      this.keyboardHandlers.onBlur?.(pipWin.document)
    }
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (isPipControlTarget(event.target)) return
      if (this.videoHandoff?.isVideoClickBlocked()) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        return
      }
      this.keyboardHandlers.onClick?.(event, pipWin.document)
    }
    const onPagehide = () => {
      this.keyboardHandlers.onBlur?.(pipWin.document)
      this.restore()
    }

    pipWin.addEventListener('keydown', onKeydown, true)
    pipWin.addEventListener('keyup', onKeyup, true)
    pipWin.addEventListener('click', onClick, true)
    pipWin.addEventListener('blur', onBlur)
    pipWin.addEventListener('pagehide', onPagehide)

    this.keyboardCleanup = () => {
      pipWin.removeEventListener('keydown', onKeydown, true)
      pipWin.removeEventListener('keyup', onKeyup, true)
      pipWin.removeEventListener('click', onClick, true)
      pipWin.removeEventListener('blur', onBlur)
      pipWin.removeEventListener('pagehide', onPagehide)
    }
  }

  private mountVideoBindings(
    pipWin: Window,
    video: HTMLVideoElement,
    videoArea: HTMLElement,
    fallbackSourceParent: HTMLElement
  ): void {
    this.subtitleMirror = new SubtitleMirror({
      sourceDocument: this.sourceDocument,
      searchRoot: findSubtitleSearchRoot(
        this.videoPlacement.sourceParent ?? fallbackSourceParent
      ),
      pipWindow: pipWin,
      video,
      videoArea,
      settings: this.settings.pip,
    })
    this.subtitleMirror.start()
    this.pipControls = new PipControls({
      pipWindow: pipWin,
      video,
      videoArea,
      seekTo: milliseconds => {
        this.recordUserSeek()
        return this.playbackSession.seekTo(milliseconds)
      },
      resumeAfterSeek: () => this.playbackSession.play(video),
      onVisibilityChange: visible => this.subtitleMirror?.setControlsVisible(visible),
      settings: this.getControlsSettings(),
      onAction: action => this.executeControlAction(action, pipWin.document, video),
      onVolumeChange: volume => this.executeVolumeChange(volume, pipWin.document, video),
      onPipSettingsChange: settings => {
        const nextSettings = { ...this.settings, pip: settings }
        this.updateSettings(nextSettings)
        this.onSettingsChange?.(nextSettings)
      },
    })
    this.pipControls.start()
  }

  private getControlsSettings() {
    const copy = getCopy(resolveLocalePreference(this.settings.locale)).pipControls
    return {
      seekSeconds: this.settings.seek.seconds,
      pip: this.settings.pip,
      copy,
    }
  }

  private executeControlAction(
    action: 'playPause' | 'seekBackward' | 'seekForward' | 'mute',
    targetDoc: Document,
    video: HTMLVideoElement
  ): void {
    if (action === 'seekBackward' || action === 'seekForward') {
      this.recordUserSeek()
    }
    if (this.commands) {
      this.commands.execute(action, targetDoc)
      return
    }

    if (action === 'playPause') {
      void this.playbackSession.togglePlayback(video)
      return
    }
    if (action === 'mute') {
      this.playbackSession.toggleMute(video)
      return
    }
    const direction = action === 'seekBackward' ? -1 : 1
    void this.playbackSession.seekBy(direction * this.settings.seek.seconds * 1_000)
  }

  private executeVolumeChange(
    volume: number,
    targetDoc: Document,
    video: HTMLVideoElement
  ): void {
    if (this.commands) {
      this.commands.setVolume(volume, targetDoc)
      return
    }
    this.playbackSession.setVolume(video, volume)
  }

  private startVideoHandoffMonitoring(
    pipWin: Window,
    video: HTMLVideoElement,
    videoArea: HTMLElement
  ): void {
    this.videoHandoff = createPipVideoHandoff({
      sourceDocument: this.sourceDocument,
      pipWindow: pipWin,
      videoArea,
      initialVideo: video,
      isActive: () => this.isActive,
      onVideoHandoff: candidate => {
        const candidateParent = candidate.parentElement
        if (!candidateParent || !this.videoArea) return false

        this.cleanupVideoBindings()
        this.videoPlacement.replaceVideo(candidate, this.videoArea)
        this.mountVideoBindings(
          pipWin,
          candidate,
          this.videoArea,
          candidateParent
        )
        return true
      },
      onEpisodeTransition: candidate => {
        if (!this.isManualSourceWatchChange()) {
          this.guardNextEpisodePause(candidate)
        }
        this.exit()
      },
      onTimeout: () => this.exit(),
    })
    this.videoHandoff.start()
  }

  private guardNextEpisodePause(video: HTMLVideoElement): void {
    this.stopNextEpisodePauseGuard()
    const cleanup = startNextEpisodePauseGuard({
      sourceDocument: this.sourceDocument,
      confirmedVideo: video,
      entryWatchId: this.pipEntryWatchId,
      entryVideoTitle: this.pipEntryVideoTitle,
      playbackSession: this.playbackSession,
    })
    this.nextEpisodePauseCleanup = () => {
      cleanup()
      this.nextEpisodePauseCleanup = null
    }
  }

  private stopNextEpisodePauseGuard(): void {
    this.nextEpisodePauseCleanup?.()
  }

  private isManualSourceWatchChange(): boolean {
    const sourceWindow = this.sourceDocument.defaultView
    return Boolean(
      sourceWindow &&
      this.pipEntryWatchId !== null &&
      getNetflixWatchId(sourceWindow) !== this.pipEntryWatchId &&
      Date.now() <= this.sourceWatchChangeIntentDeadline
    )
  }

  private startPlaybackContextMonitoring(
    pipWin: Window,
    shouldMonitor: boolean
  ): void {
    this.playbackContextCleanup?.()
    this.playbackContextCleanup = null
    if (!shouldMonitor) return

    const sourceWindow = this.sourceDocument.defaultView
    if (!sourceWindow) return
    const initialWatchId = this.pipEntryWatchId
    let watchIdChangeTimeoutId: number | null = null

    const recordSourceWatchChangeIntent = () => {
      this.sourceWatchChangeIntentDeadline =
        Date.now() + SOURCE_WATCH_CHANGE_USER_INTENT_MS
    }

    const clearWatchIdChangeTimeout = () => {
      if (watchIdChangeTimeoutId === null) return
      sourceWindow.clearTimeout(watchIdChangeTimeoutId)
      watchIdChangeTimeoutId = null
    }
    const scheduleWatchIdChangeExit = () => {
      if (watchIdChangeTimeoutId !== null) return
      watchIdChangeTimeoutId = sourceWindow.setTimeout(() => {
        watchIdChangeTimeoutId = null
        if (this.pipWindow !== pipWin || !this.isActive) return
        if (getNetflixWatchId(sourceWindow) === initialWatchId) return
        if (this.videoHandoff?.isEpisodeTransitionPending()) {
          scheduleWatchIdChangeExit()
          return
        }
        this.exit()
      }, WATCH_ID_CHANGE_CLASSIFICATION_MS)
    }

    const exitIfPlaybackContextEnded = () => {
      if (this.pipWindow !== pipWin || !this.isActive) return
      if (!canHandlePlaybackShortcut(this.sourceDocument)) {
        this.exit()
        return
      }
      if (getNetflixWatchId(sourceWindow) !== initialWatchId) {
        if (this.isManualSourceWatchChange()) {
          this.exit()
          return
        }
        scheduleWatchIdChangeExit()
      } else {
        clearWatchIdChangeTimeout()
      }
    }
    const onSourcePagehide = () => {
      if (this.pipWindow === pipWin) this.exit()
    }
    const intervalId = sourceWindow.setInterval(
      exitIfPlaybackContextEnded,
      PLAYBACK_CONTEXT_CHECK_INTERVAL_MS
    )
    sourceWindow.addEventListener('popstate', exitIfPlaybackContextEnded)
    sourceWindow.addEventListener('hashchange', exitIfPlaybackContextEnded)
    sourceWindow.addEventListener('pagehide', onSourcePagehide)
    this.sourceDocument.addEventListener('pointerdown', recordSourceWatchChangeIntent, true)
    this.sourceDocument.addEventListener('keydown', recordSourceWatchChangeIntent, true)

    this.playbackContextCleanup = () => {
      clearWatchIdChangeTimeout()
      sourceWindow.clearInterval(intervalId)
      sourceWindow.removeEventListener('popstate', exitIfPlaybackContextEnded)
      sourceWindow.removeEventListener('hashchange', exitIfPlaybackContextEnded)
      sourceWindow.removeEventListener('pagehide', onSourcePagehide)
      this.sourceDocument.removeEventListener('pointerdown', recordSourceWatchChangeIntent, true)
      this.sourceDocument.removeEventListener('keydown', recordSourceWatchChangeIntent, true)
    }
  }

  private copyStyles(pipWin: Window, sourceDocument: Document): void {
    for (const node of sourceDocument.querySelectorAll('style, link[rel="stylesheet"]')) {
      pipWin.document.head.appendChild(node.cloneNode(true))
    }
  }

  private restore(): void {
    if (this.restoring) return
    this.restoring = true

    this.videoHandoff?.stop()
    this.videoHandoff = null
    this.playbackContextCleanup?.()
    this.playbackContextCleanup = null
    this.keyboardCleanup?.()
    this.keyboardCleanup = null
    this.cleanupVideoBindings()
    this.pipWindow = null

    this.videoPlacement.restore()
    this.videoArea = null
    this.pipEntryWatchId = null
    this.sourceWatchChangeIntentDeadline = 0
    this.restoring = false
  }

  private cleanupSubtitleMirror(): void {
    this.subtitleMirror?.destroy()
    this.subtitleMirror = null
  }

  private cleanupPipControls(): void {
    this.pipControls?.destroy()
    this.pipControls = null
  }

  private cleanupVideoBindings(): void {
    this.cleanupPipControls()
    this.cleanupSubtitleMirror()
  }

}
