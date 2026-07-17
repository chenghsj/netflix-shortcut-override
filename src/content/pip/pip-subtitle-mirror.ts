const PIP_SUBTITLE_ID = 'shortcut-override-pip-subtitle'

const PLAYER_ROOT_SELECTOR = '[data-uia="player"], .watch-video, .watch-video--player-view'

const SUBTITLE_SELECTORS = [
  '.player-timedtext',
  '.player-timedtext-text-container',
  '.player-timedtext-text',
  '[data-uia="subtitle-text"]',
  '[data-uia*="subtitle"]',
  '[class*="player-timedtext"]',
  '[class*="timedtext"]',
  '[class*="subtitle"]',
]

const SUBTITLE_SELECTOR = SUBTITLE_SELECTORS.join(', ')
const DEFAULT_PIP_SUBTITLE_BOTTOM = '8%'
const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9

type Rect = {
  left: number
  top: number
  width: number
  height: number
}

export type SubtitleMirrorOptions = {
  sourceDocument: Document
  searchRoot: HTMLElement
  pipWindow: Window
  video: HTMLVideoElement
  videoArea: HTMLElement
}

const getSubtitleStyle = (element: HTMLElement): CSSStyleDeclaration | null =>
  element.ownerDocument.defaultView?.getComputedStyle(element) ?? null

const SUBTITLE_STYLE_PROPERTIES = [
  'color',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-shadow',
  'text-transform',
  'white-space',
  'word-break',
  'overflow-wrap',
  'background-color',
  'padding',
  'border',
  'border-radius',
] as const

const copySubtitleAttributes = (source: HTMLElement, target: HTMLElement): void => {
  for (const attribute of Array.from(target.attributes)) {
    if (attribute.name !== 'id' && attribute.name !== 'aria-hidden') {
      target.removeAttribute(attribute.name)
    }
  }

  for (const attribute of Array.from(source.attributes)) {
    if (attribute.name === 'id' || attribute.name === 'aria-hidden') continue
    target.setAttribute(attribute.name, attribute.value)
  }
}

const copyComputedSubtitleStyles = (source: HTMLElement, target: HTMLElement): void => {
  const style = getSubtitleStyle(source)
  if (!style) return

  for (const property of SUBTITLE_STYLE_PROPERTIES) {
    if (source.style.getPropertyValue(property)) continue
    const value = style.getPropertyValue(property)
    if (value) target.style.setProperty(property, value)
  }
}

const getPercentage = (value: string | undefined): number | null => {
  const match = value?.trim().match(/^(-?\d+(?:\.\d+)?)%$/)
  return match ? Number(match[1]) : null
}

const stabilizeLowerSubtitlePosition = (source: HTMLElement, inner: HTMLElement): void => {
  const sourceElements = source.querySelectorAll<HTMLElement>('*')
  const mirroredElements = inner.querySelectorAll<HTMLElement>('*')
  const sourceFrameRect = source.getBoundingClientRect()

  for (const [index, mirroredElement] of mirroredElements.entries()) {
    const sourceElement = sourceElements[index]
    if (!sourceElement) continue

    const sourceStyle = getSubtitleStyle(sourceElement)
    if (sourceStyle?.position !== 'absolute' && sourceStyle?.position !== 'fixed') continue

    const topPercentage =
      getPercentage(sourceElement.style.top || sourceStyle?.top) ??
      (sourceFrameRect.height > 0
        ? ((sourceElement.getBoundingClientRect().top - sourceFrameRect.top) /
            sourceFrameRect.height) *
          100
        : null)
    if (topPercentage === null || topPercentage < 50) continue

    Object.assign(mirroredElement.style, {
      top: 'auto',
      bottom: DEFAULT_PIP_SUBTITLE_BOTTOM,
    })
  }
}

const hasVisibleSubtitle = (element: HTMLElement): boolean => {
  const style = getSubtitleStyle(element)
  if (style?.display === 'none' || style?.visibility === 'hidden' || style?.opacity === '0') {
    return false
  }

  return Boolean(element.textContent?.trim())
}

const hasSubtitleText = (element: HTMLElement): boolean => Boolean(element.textContent?.trim())

const getNodeElement = (node: Node): Element | null => {
  if (node.nodeType === Node.ELEMENT_NODE) return node as Element
  return node.parentElement
}

const isSubtitleRelatedNode = (node: Node): boolean => {
  const element = getNodeElement(node)
  if (!element) return false

  return Boolean(element.matches(SUBTITLE_SELECTOR) || element.closest(SUBTITLE_SELECTOR))
}

const containsSubtitleNode = (node: Node): boolean => {
  const element = getNodeElement(node)
  if (!element) return false

  return element.matches(SUBTITLE_SELECTOR) || Boolean(element.querySelector(SUBTITLE_SELECTOR))
}

export const getContainedVideoRect = (
  videoArea: HTMLElement,
  video: HTMLVideoElement | null,
  fallbackWidth: number,
  fallbackHeight: number
): Rect => {
  const areaWidth = videoArea.clientWidth || fallbackWidth || 1
  const areaHeight = videoArea.clientHeight || fallbackHeight || 1
  const intrinsicWidth = video?.videoWidth || fallbackWidth || areaWidth
  const intrinsicHeight = video?.videoHeight || fallbackHeight || areaHeight
  const scale = Math.min(areaWidth / intrinsicWidth, areaHeight / intrinsicHeight)
  const width = intrinsicWidth * scale
  const height = intrinsicHeight * scale

  return {
    left: (areaWidth - width) / 2,
    top: (areaHeight - height) / 2,
    width,
    height,
  }
}

export const findSubtitleSearchRoot = (parent: HTMLElement): HTMLElement =>
  (parent.closest(PLAYER_ROOT_SELECTOR) as HTMLElement | null) ?? parent

const getSubtitleFrameSize = (
  source: HTMLElement,
  video: HTMLVideoElement,
  videoArea: HTMLElement
): { width: number; height: number } => {
  const sourceRect = source.getBoundingClientRect()
  const width = source.offsetWidth || sourceRect.width || videoArea.clientWidth || 1
  const aspectRatio =
    video.videoWidth > 0 && video.videoHeight > 0
      ? video.videoWidth / video.videoHeight
      : DEFAULT_VIDEO_ASPECT_RATIO

  return { width, height: width / aspectRatio }
}

export class SubtitleMirror {
  private readonly sourceDocument: Document
  private readonly searchRoot: HTMLElement
  private readonly pipWindow: Window
  private readonly video: HTMLVideoElement
  private readonly videoArea: HTMLElement
  private source: HTMLElement | null = null
  private mirror: HTMLElement | null = null
  private inner: HTMLElement | null = null
  private sourceObserver: MutationObserver | null = null
  private rootObserver: MutationObserver | null = null
  private resizeObserver: ResizeObserver | null = null
  private refreshFrameId: number | null = null
  private syncFrameId: number | null = null
  private resizeHandler: (() => void) | null = null
  private started = false

  constructor(options: SubtitleMirrorOptions) {
    this.sourceDocument = options.sourceDocument
    this.searchRoot = options.searchRoot
    this.pipWindow = options.pipWindow
    this.video = options.video
    this.videoArea = options.videoArea
  }

  start(): void {
    if (this.started) return
    this.started = true

    const mirror = this.pipWindow.document.createElement('div')
    mirror.id = PIP_SUBTITLE_ID
    mirror.setAttribute('aria-hidden', 'true')
    Object.assign(mirror.style, {
      position: 'absolute',
      inset: '0',
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: '10',
      visibility: 'hidden',
    })

    const inner = this.pipWindow.document.createElement('div')
    Object.assign(inner.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      transformOrigin: 'top left',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
    })
    mirror.appendChild(inner)
    this.videoArea.appendChild(mirror)
    this.mirror = mirror
    this.inner = inner

    this.resizeHandler = () => this.scheduleSync()
    this.pipWindow.addEventListener('resize', this.resizeHandler)

    this.rootObserver = new MutationObserver(mutations => {
      if (this.shouldRefreshSource(mutations)) this.scheduleSourceRefresh()
    })
    this.rootObserver.observe(this.searchRoot, {
      attributes: true,
      attributeFilter: ['class', 'data-uia', 'style', 'aria-hidden'],
      childList: true,
      subtree: true,
    })

    this.refreshSource()
  }

  refresh(): void {
    if (!this.started) return
    this.refreshSource()
  }

  destroy(): void {
    if (this.refreshFrameId !== null) {
      this.sourceDocument.defaultView?.cancelAnimationFrame(this.refreshFrameId)
      this.refreshFrameId = null
    }
    if (this.syncFrameId !== null) {
      this.pipWindow.cancelAnimationFrame(this.syncFrameId)
      this.syncFrameId = null
    }

    this.sourceObserver?.disconnect()
    this.sourceObserver = null
    this.rootObserver?.disconnect()
    this.rootObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    if (this.resizeHandler) this.pipWindow.removeEventListener('resize', this.resizeHandler)
    this.resizeHandler = null
    this.mirror?.remove()
    this.source = null
    this.mirror = null
    this.inner = null
    this.started = false
  }

  private findSource(): HTMLElement | null {
    const candidates = Array.from(
      new Set(
        SUBTITLE_SELECTORS.flatMap(selector =>
          Array.from(this.searchRoot.querySelectorAll<HTMLElement>(selector))
        )
      )
    )
    if (this.searchRoot.matches(SUBTITLE_SELECTOR)) candidates.unshift(this.searchRoot)

    return (
      candidates.find(candidate => hasVisibleSubtitle(candidate)) ??
      candidates.find(candidate => hasSubtitleText(candidate)) ??
      null
    )
  }

  private refreshSource(): void {
    const nextSource = this.findSource()
    if (nextSource === this.source) {
      this.scheduleSync()
      return
    }

    this.sourceObserver?.disconnect()
    this.sourceObserver = null
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.source = nextSource

    if (nextSource) {
      this.sourceObserver = new MutationObserver(() => this.scheduleSync())
      this.sourceObserver.observe(nextSource, {
        attributes: true,
        attributeFilter: ['class', 'style', 'dir', 'lang'],
        childList: true,
        subtree: true,
        characterData: true,
      })

      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => this.scheduleSync())
        this.resizeObserver.observe(nextSource)
      }
    }

    this.scheduleSync()
  }

  private shouldRefreshSource(mutations: MutationRecord[]): boolean {
    if (this.source && !this.source.isConnected) return true

    return mutations.some(mutation => {
      if (mutation.type === 'attributes') return isSubtitleRelatedNode(mutation.target)
      if (mutation.type !== 'childList') return false

      return (
        isSubtitleRelatedNode(mutation.target) ||
        Array.from(mutation.addedNodes).some(containsSubtitleNode) ||
        Array.from(mutation.removedNodes).some(containsSubtitleNode)
      )
    })
  }

  private scheduleSourceRefresh(): void {
    if (this.refreshFrameId !== null) return

    const frameWindow = this.sourceDocument.defaultView ?? window
    this.refreshFrameId = frameWindow.requestAnimationFrame(() => {
      this.refreshFrameId = null
      this.refreshSource()
    })
  }

  private scheduleSync(): void {
    if (this.syncFrameId !== null) return

    this.syncFrameId = this.pipWindow.requestAnimationFrame(() => {
      this.syncFrameId = null
      this.sync()
    })
  }

  private sync(): void {
    const source = this.source
    const inner = this.inner
    const mirror = this.mirror
    if (!inner || !mirror) return

    if (!source || !source.isConnected) {
      inner.replaceChildren()
      mirror.style.visibility = 'hidden'
      return
    }

    copySubtitleAttributes(source, inner)
    copyComputedSubtitleStyles(source, inner)
    inner.replaceChildren(...Array.from(source.childNodes, node => node.cloneNode(true)))
    stabilizeLowerSubtitlePosition(source, inner)

    const { width: sourceWidth, height: sourceHeight } = getSubtitleFrameSize(
      source,
      this.video,
      this.videoArea
    )
    const contentRect = getContainedVideoRect(
      this.videoArea,
      this.video,
      sourceWidth,
      sourceHeight
    )
    const scale = Math.min(contentRect.width / sourceWidth, contentRect.height / sourceHeight)
    const renderedWidth = sourceWidth * scale
    const renderedHeight = sourceHeight * scale
    const offsetLeft = contentRect.left + (contentRect.width - renderedWidth) / 2
    const offsetTop = contentRect.top + (contentRect.height - renderedHeight) / 2

    Object.assign(inner.style, {
      position: 'absolute',
      inset: 'auto',
      top: '0',
      right: 'auto',
      bottom: 'auto',
      left: '0',
      margin: '0',
      boxSizing: 'border-box',
      transformOrigin: 'top left',
      width: `${sourceWidth}px`,
      height: `${sourceHeight}px`,
      minWidth: '0',
      maxWidth: 'none',
      minHeight: '0',
      maxHeight: 'none',
      transform: `translate(${offsetLeft}px, ${offsetTop}px) scale(${scale})`,
      display: 'block',
      overflow: 'visible',
      float: 'none',
      clear: 'none',
      visibility: 'visible',
      opacity: '1',
    })
    mirror.style.visibility = hasSubtitleText(source) ? 'visible' : 'hidden'
  }
}
