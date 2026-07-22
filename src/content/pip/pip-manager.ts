import { findVideo } from '@/content/dom-utils'
import { PIP_DOCUMENT_MARKER } from '@/content/hints/hint-manager'
import { isFirefoxBrowser } from '@/shared/browser-info'
import { findSubtitleSearchRoot, SubtitleMirror } from './pip-subtitle-mirror'
import { PipControls } from './pip-controls'
import { createPipVideoHandoff } from './pip-video-handoff'
import { VideoPlacement } from './video-placement'

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

export type PipKeyboardHandlers = {
  onKeydown: (event: KeyboardEvent, targetDoc: Document) => void
  onKeyup: (event: KeyboardEvent, targetDoc: Document) => void
  onBlur?: (targetDoc: Document) => void
  onClick?: (event: MouseEvent, targetDoc: Document) => void
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
  private pipWindow: Window | null = null

  private subtitleMirror: SubtitleMirror | null = null
  private pipControls: PipControls | null = null
  private videoHandoff: ReturnType<typeof createPipVideoHandoff> | null = null
  private videoArea: HTMLElement | null = null
  private keyboardCleanup: (() => void) | null = null
  private restoring = false
  private entering = false
  private entryVersion = 0

  constructor(options: PipKeyboardHandlers & { sourceDocument?: Document }) {
    const { sourceDocument, onKeydown, onKeyup, onBlur, onClick } = options
    this.sourceDocument = sourceDocument ?? document
    this.videoPlacement = new VideoPlacement(this.sourceDocument)
    this.keyboardHandlers = { onKeydown, onKeyup, onBlur, onClick }
  }

  static isSupported(sourceWindow: Window = window): boolean {
    if (isFirefoxBrowser(sourceWindow.navigator.userAgent)) return false
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

      const video = findVideo(this.sourceDocument)
      const parent = video?.parentElement
      if (!video || !parent) return false

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

    pipWin.document.documentElement.dataset[PIP_DOCUMENT_MARKER] = 'true'

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
    this.pipControls = new PipControls({
      pipWindow: pipWin,
      video,
      videoArea,
    })
    this.pipControls.start()
    this.subtitleMirror = new SubtitleMirror({
      sourceDocument: this.sourceDocument,
      searchRoot: findSubtitleSearchRoot(
        this.videoPlacement.sourceParent ?? fallbackSourceParent
      ),
      pipWindow: pipWin,
      video,
      videoArea,
    })
    this.subtitleMirror.start()
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
      onTimeout: () => this.exit(),
    })
    this.videoHandoff.start()
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
    this.keyboardCleanup?.()
    this.keyboardCleanup = null
    this.cleanupVideoBindings()
    this.pipWindow = null

    this.videoPlacement.restore()
    this.videoArea = null
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
