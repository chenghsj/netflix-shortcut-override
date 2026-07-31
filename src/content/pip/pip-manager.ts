import { canHandlePlaybackShortcut, findVideo } from '@/content/dom-utils'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { AdoptedVideoBinding } from './adopted-video-binding'
import { createPipVideoHandoff } from './pip-video-handoff'
import {
  createNetflixPlaybackSession,
  type NetflixPlaybackSession,
} from '@/content/netflix-playback-session'
import { markPipDocument } from './pip-document'
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

const getNetflixWatchId = (sourceWindow: Window): string | null =>
  sourceWindow.location.pathname.match(/^\/watch\/([^/]+)/)?.[1] ?? null

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
  private readonly playbackSession: NetflixPlaybackSession
  private readonly commands: PipManagerOptions['commands']
  private readonly onSettingsChange: PipManagerOptions['onSettingsChange']
  private settings: ShortcutSettings
  private pipWindow: Window | null = null

  private adoptedVideoBinding: AdoptedVideoBinding | null = null
  private videoHandoff: ReturnType<typeof createPipVideoHandoff> | null = null
  private keyboardCleanup: (() => void) | null = null
  private playbackContextCleanup: (() => void) | null = null
  private pipEntryWatchId: string | null = null
  private sourceWatchChangeIntentDeadline = 0
  private restoring = false
  private entering = false
  private entryVersion = 0

  constructor(options: PipManagerOptions) {
    const { sourceDocument, onKeydown, onKeyup, onBlur, onClick, playbackSession } = options
    this.sourceDocument = sourceDocument ?? document
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
    this.adoptedVideoBinding?.updateSettings(settings)
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
    const entryVersion = ++this.entryVersion
    this.entering = true

    try {
      if (this.pipWindow?.closed) this.restore()
      const sourceWindow = this.sourceDocument.defaultView
      if (!sourceWindow || !PipManager.isSupported(sourceWindow) || this.isActive) return false
      this.pipEntryWatchId = getNetflixWatchId(sourceWindow)
      this.sourceWatchChangeIntentDeadline = 0

      const video = findVideo(this.sourceDocument)
      if (!video || !video.parentElement) return false
      const shouldMonitorPlaybackContext = canHandlePlaybackShortcut(this.sourceDocument)

      let pipWin: Window | null = null

      try {
        pipWin = await this.requestPipWindow(video, sourceWindow)
        if (entryVersion !== this.entryVersion) {
          if (!pipWin.closed) pipWin.close()
          return false
        }

        this.pipWindow = pipWin
        this.initPipDocument(pipWin, this.sourceDocument)

        this.adoptedVideoBinding = new AdoptedVideoBinding({
          sourceDocument: this.sourceDocument,
          pipWindow: pipWin,
          playbackSession: this.playbackSession,
          commands: this.commands,
          settings: this.settings,
          onSettingsChange: this.onSettingsChange,
          onUserSeek: () => this.recordUserSeek(),
        })
        const videoArea = this.adoptedVideoBinding.adopt(video)
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

    this.closeActivePip(true)
  }

  private closeActivePip(restoreAdoptedVideo: boolean): void {
    if (!this.isActive) return

    const pipWin = this.pipWindow
    if (!pipWin) return
    this.keyboardHandlers.onBlur?.(pipWin.document)
    this.restore(restoreAdoptedVideo)
    if (pipWin && !pipWin.closed) pipWin.close()
  }

  destroy(): void {
    this.cancelPendingEntry()

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
      onVideoHandoff: candidate => this.adoptedVideoBinding?.replace(candidate) ?? false,
      onEpisodeTransition: candidate => {
        const restoreAdoptedVideo =
          this.isManualSourceWatchChange() || candidate === this.adoptedVideoBinding?.currentVideo
        this.closeActivePip(restoreAdoptedVideo)
      },
      onTimeout: () => this.exit(),
    })
    this.videoHandoff.start()
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

  private restore(restoreAdoptedVideo = true): void {
    if (this.restoring) return
    this.restoring = true

    this.videoHandoff?.stop()
    this.videoHandoff = null
    this.playbackContextCleanup?.()
    this.playbackContextCleanup = null
    this.keyboardCleanup?.()
    this.keyboardCleanup = null
    this.adoptedVideoBinding?.destroy(restoreAdoptedVideo)
    this.adoptedVideoBinding = null
    this.pipWindow = null
    this.pipEntryWatchId = null
    this.sourceWatchChangeIntentDeadline = 0
    this.restoring = false
  }

}
