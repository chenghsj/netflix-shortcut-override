export const PLAYER_ROOT_SELECTOR =
  '[data-uia="player"], .watch-video, .watch-video--player-view'
const DEFAULT_VIDEO_SIZE = { width: 16, height: 9 }

type VideoSize = {
  width: number
  height: number
}

const getIntrinsicVideoSize = (video: HTMLVideoElement): VideoSize | null =>
  video.videoWidth > 0 && video.videoHeight > 0
    ? { width: video.videoWidth, height: video.videoHeight }
    : null

const getRenderedVideoSize = (video: HTMLVideoElement): VideoSize | null => {
  const rect = video.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
    ? { width: rect.width, height: rect.height }
    : null
}

const findLiveRestoreParent = (sourceDocument: Document): HTMLElement => {
  const playerRoot = sourceDocument.querySelector<HTMLElement>(PLAYER_ROOT_SELECTOR)
  return playerRoot?.isConnected
    ? playerRoot
    : sourceDocument.body ?? sourceDocument.documentElement
}

const getPlaceholderAspectRatio = (video: HTMLVideoElement): string => {
  const rect = video.getBoundingClientRect()
  const width = video.videoWidth || rect.width
  const height = video.videoHeight || rect.height
  return width > 0 && height > 0 ? `${width} / ${height}` : '16 / 9'
}

export class VideoPlacement {
  private readonly sourceDocument: Document
  private video: HTMLVideoElement | null = null
  private originalParent: HTMLElement | null = null
  private originalAnchor: Node | null = null
  private originalInlineStyle: string | null = null
  private originalControls = false
  private placeholder: HTMLElement | null = null
  private lastVideoSize: VideoSize | null = null
  private metadataCleanup: (() => void) | null = null

  constructor(sourceDocument: Document) {
    this.sourceDocument = sourceDocument
  }

  get currentVideo(): HTMLVideoElement | null {
    return this.video
  }

  get sourceParent(): HTMLElement | null {
    return this.originalParent
  }

  prepare(video: HTMLVideoElement): void {
    if (this.video) throw new Error('A video is already placed in PiP')

    const parent = video.parentElement
    if (!parent) throw new Error('Video has no parent element')

    this.video = video
    this.originalParent = parent
    this.originalAnchor = video.nextSibling
    this.originalInlineStyle = video.getAttribute('style')
    this.originalControls = video.controls
    this.lastVideoSize ??=
      getIntrinsicVideoSize(video) ?? getRenderedVideoSize(video) ?? DEFAULT_VIDEO_SIZE
    this.placeholder = this.createPlaceholder(video)
    parent.insertBefore(this.placeholder, video)
  }

  createPipVideoArea(pipWindow: Window): HTMLElement {
    const videoArea = pipWindow.document.createElement('div')
    Object.assign(videoArea.style, {
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#000',
    })

    this.attachCurrentVideo(videoArea)
    return videoArea
  }

  replaceVideo(video: HTMLVideoElement, videoArea: HTMLElement): void {
    if (this.video === video && video.parentElement && video.parentElement !== videoArea) {
      this.originalParent = video.parentElement
      this.originalAnchor = video.nextSibling
    }
    this.restore(true)
    this.prepare(video)
    this.attachCurrentVideo(videoArea)
  }

  private attachCurrentVideo(videoArea: HTMLElement): void {
    const video = this.video
    if (!video) throw new Error('Video placement has not been prepared')

    const intrinsicSize = getIntrinsicVideoSize(video)
    if (intrinsicSize) this.lastVideoSize = intrinsicSize
    const displaySize = this.lastVideoSize ?? DEFAULT_VIDEO_SIZE

    Object.assign(video.style, {
      position: 'relative',
      inset: 'auto',
      margin: '0',
      transform: 'none',
      display: 'block',
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
      aspectRatio: `${displaySize.width} / ${displaySize.height}`,
      objectFit: intrinsicSize ? 'contain' : 'fill',
    })
    video.controls = false
    videoArea.appendChild(video)

    const onLoadedMetadata = () => {
      const loadedSize = getIntrinsicVideoSize(video)
      if (!loadedSize) return
      this.lastVideoSize = loadedSize
      video.style.aspectRatio = `${loadedSize.width} / ${loadedSize.height}`
      video.style.objectFit = 'contain'
    }
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    this.metadataCleanup = () => video.removeEventListener('loadedmetadata', onLoadedMetadata)
  }

  restore(preserveVideoSize = false): void {
    const video = this.video
    const parent = this.originalParent
    const anchor = this.originalAnchor
    const placeholder = this.placeholder

    this.metadataCleanup?.()
    this.metadataCleanup = null

    const restoreParent = parent?.isConnected
      ? parent
      : placeholder?.parentElement?.isConnected
        ? placeholder.parentElement
        : findLiveRestoreParent(this.sourceDocument)

    if (video && restoreParent) {
      if (this.originalInlineStyle === null) video.removeAttribute('style')
      else video.setAttribute('style', this.originalInlineStyle)
      video.controls = this.originalControls

      if (restoreParent === parent && anchor && anchor.parentNode === restoreParent) {
        restoreParent.insertBefore(video, anchor)
      } else if (placeholder?.parentNode === restoreParent) {
        restoreParent.insertBefore(video, placeholder.nextSibling)
      } else {
        restoreParent.appendChild(video)
      }
    }

    placeholder?.remove()
    this.video = null
    this.originalParent = null
    this.originalAnchor = null
    this.originalInlineStyle = null
    this.originalControls = false
    this.placeholder = null
    if (!preserveVideoSize) this.lastVideoSize = null

    if (video) {
      const sourceWindow = this.sourceDocument.defaultView
      const syncLayout = () => sourceWindow?.dispatchEvent(new sourceWindow.Event('resize'))
      if (sourceWindow && typeof sourceWindow.requestAnimationFrame === 'function') {
        sourceWindow.requestAnimationFrame(syncLayout)
      } else {
        syncLayout()
      }
    }
  }

  private createPlaceholder(video: HTMLVideoElement): HTMLElement {
    const placeholder = this.sourceDocument.createElement('div')
    Object.assign(placeholder.style, {
      width: '100%',
      maxWidth: '100%',
      aspectRatio: getPlaceholderAspectRatio(video),
      display: 'block',
      pointerEvents: 'none',
      background: 'transparent',
      flexShrink: '0',
    })
    placeholder.dataset.shortcutOverridePipPlaceholder = 'true'
    placeholder.setAttribute('aria-hidden', 'true')
    return placeholder
  }
}
