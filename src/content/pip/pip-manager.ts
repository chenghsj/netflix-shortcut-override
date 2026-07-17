import { findVideo } from '@/content/dom-utils'
import { PIP_DOCUMENT_MARKER } from '@/content/hints/hint-manager'
import { findSubtitleSearchRoot, SubtitleMirror } from './pip-subtitle-mirror'
import { VideoPlacement } from './video-placement'

type DocumentPictureInPictureApi = {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>
}

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPictureApi
}

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

const getVideoDimension = (value: number, fallback: number, minimum: number): number =>
  Math.max(minimum, Math.round(value || fallback || minimum))

export class PipManager {
  private readonly sourceDocument: Document
  private readonly keyboardHandlers: PipKeyboardHandlers
  private readonly videoPlacement: VideoPlacement
  private pipWindow: Window | null = null

  private subtitleMirror: SubtitleMirror | null = null
  private keyboardCleanup: (() => void) | null = null
  private restoring = false
  private entering = false
  private entryVersion = 0
  private skipNextPipClick = false

  constructor(options: PipKeyboardHandlers & { sourceDocument?: Document }) {
    const { sourceDocument, onKeydown, onKeyup, onBlur, onClick } = options
    this.sourceDocument = sourceDocument ?? document
    this.videoPlacement = new VideoPlacement(this.sourceDocument)
    this.keyboardHandlers = { onKeydown, onKeyup, onBlur, onClick }
  }

  static isSupported(sourceWindow: Window = window): boolean {
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
        this.subtitleMirror = new SubtitleMirror({
          sourceDocument: this.sourceDocument,
          searchRoot: findSubtitleSearchRoot(this.videoPlacement.sourceParent ?? parent),
          pipWindow: pipWin,
          video,
          videoArea,
        })
        this.subtitleMirror.start()
        pipWin.document.body.appendChild(videoArea)
        this.attachPipEventListeners(pipWin)
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
    const rect = video.getBoundingClientRect()
    const width = getVideoDimension(video.videoWidth, rect.width, 320)
    const height = getVideoDimension(video.videoHeight, rect.height || width * (9 / 16), 180)

    return getDocumentPictureInPicture(sourceWindow)!.requestWindow({ width, height })
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
    this.skipNextPipClick = true

    const onKeydown = (event: KeyboardEvent) => {
      this.keyboardHandlers.onKeydown(event, pipWin.document)
    }
    const onKeyup = (event: KeyboardEvent) => {
      this.keyboardHandlers.onKeyup(event, pipWin.document)
    }
    const onBlur = () => {
      this.skipNextPipClick = true
      this.keyboardHandlers.onBlur?.(pipWin.document)
    }
    const onFocus = () => {
      this.skipNextPipClick = true
    }
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0) return
      if (this.skipNextPipClick) {
        this.skipNextPipClick = false
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
    pipWin.addEventListener('focus', onFocus)
    pipWin.addEventListener('click', onClick, true)
    pipWin.addEventListener('blur', onBlur)
    pipWin.addEventListener('pagehide', onPagehide)

    this.keyboardCleanup = () => {
      pipWin.removeEventListener('keydown', onKeydown, true)
      pipWin.removeEventListener('keyup', onKeyup, true)
      pipWin.removeEventListener('focus', onFocus)
      pipWin.removeEventListener('click', onClick, true)
      pipWin.removeEventListener('blur', onBlur)
      pipWin.removeEventListener('pagehide', onPagehide)
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

    this.keyboardCleanup?.()
    this.keyboardCleanup = null
    this.cleanupSubtitleMirror()
    this.pipWindow = null
    this.skipNextPipClick = false

    this.videoPlacement.restore()
    this.restoring = false
  }

  private cleanupSubtitleMirror(): void {
    this.subtitleMirror?.destroy()
    this.subtitleMirror = null
  }

}
