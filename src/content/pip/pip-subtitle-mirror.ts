import { PLAYER_ROOT_SELECTOR } from './pip-selectors'
import type {
  PipSettings,
  PipSubtitleBackground,
  PipSubtitleSize,
} from '@/shared/shortcut-types'

const PIP_SUBTITLE_ID = 'shortcut-override-pip-subtitle'

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
const CONTROLS_VISIBLE_SUBTITLE_CLEARANCE_PX = 36
const DEFAULT_VIDEO_ASPECT_RATIO = 16 / 9
const SUBTITLE_SIZE_SCALE: Record<PipSubtitleSize, number> = {
  small: 0.8,
  medium: 1,
  large: 1.25,
}
const SUBTITLE_BACKGROUND_COLORS: Record<Exclude<PipSubtitleBackground, 'none'>, string> = {
  translucent: 'rgba(0, 0, 0, 0.55)',
  dark: 'rgba(0, 0, 0, 0.8)',
}
const SUBTITLE_BACKGROUND_SHAPE_ATTRIBUTE = 'data-pip-subtitle-background-shape'

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
  settings?: PipSettings
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

const applyScaledSubtitleTypography = (
  source: HTMLElement,
  target: HTMLElement,
  scale: number
): void => {
  if (scale === 1) return

  const sourceElements = [source, ...source.querySelectorAll<HTMLElement>('*')]
  const targetElements = [target, ...target.querySelectorAll<HTMLElement>('*')]

  for (const [index, targetElement] of targetElements.entries()) {
    const sourceElement = sourceElements[index]
    const style = sourceElement ? getSubtitleStyle(sourceElement) : null
    if (!style) continue

    for (const property of ['font-size', 'line-height'] as const) {
      const value = style.getPropertyValue(property).trim()
      if (!value.endsWith('px')) continue
      const pixels = Number.parseFloat(value)
      if (Number.isFinite(pixels) && pixels > 0) {
        const scaledPixels = Number((pixels * scale).toFixed(3))
        targetElement.style.setProperty(property, `${scaledPixels}px`)
      }
    }
  }
}

const applySubtitleBackground = (
  root: HTMLElement,
  background: PipSubtitleBackground
): void => {
  for (const element of [root, ...root.querySelectorAll<HTMLElement>('*')]) {
    element.style.setProperty('background', 'transparent', 'important')
    element.style.setProperty('background-color', 'transparent', 'important')
  }
  if (background === 'none') return

  const textNodes: Text[] = []
  const walker = root.ownerDocument.createTreeWalker(root, 4)
  let node = walker.nextNode()
  while (node) {
    if (node.textContent?.trim()) textNodes.push(node as Text)
    node = walker.nextNode()
  }

  for (const textNode of textNodes) {
    const parent = textNode.parentNode
    if (!parent) continue
    const span = root.ownerDocument.createElement('span')
    span.dataset.pipSubtitleBackground = background
    span.style.setProperty('background-color', 'transparent', 'important')
    span.style.padding = '0.1em 0.32em 0.14em'
    span.style.borderRadius = '0.2em'
    span.style.lineHeight = '1.35'
    span.style.position = 'relative'
    span.style.zIndex = '1'
    parent.replaceChild(span, textNode)
    span.appendChild(textNode)
  }
}

type SubtitleBackgroundRect = {
  left: number
  top: number
  width: number
  height: number
}

const formatPathNumber = (value: number): string => Number(value.toFixed(3)).toString()

const getRoundedRectPath = (rect: SubtitleBackgroundRect, radius: number): string => {
  const left = rect.left
  const top = rect.top
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const corner = Math.min(radius, rect.width / 2, rect.height / 2)
  const formatCoordinate = formatPathNumber
  return [
    `M ${formatCoordinate(left + corner)} ${formatCoordinate(top)}`,
    `H ${formatCoordinate(right - corner)}`,
    `Q ${formatCoordinate(right)} ${formatCoordinate(top)} ${formatCoordinate(right)} ${formatCoordinate(top + corner)}`,
    `V ${formatCoordinate(bottom - corner)}`,
    `Q ${formatCoordinate(right)} ${formatCoordinate(bottom)} ${formatCoordinate(right - corner)} ${formatCoordinate(bottom)}`,
    `H ${formatCoordinate(left + corner)}`,
    `Q ${formatCoordinate(left)} ${formatCoordinate(bottom)} ${formatCoordinate(left)} ${formatCoordinate(bottom - corner)}`,
    `V ${formatCoordinate(top + corner)}`,
    `Q ${formatCoordinate(left)} ${formatCoordinate(top)} ${formatCoordinate(left + corner)} ${formatCoordinate(top)}`,
    'Z',
  ].join(' ')
}

const getVariableRoundedRectPath = (
  rect: SubtitleBackgroundRect,
  radii: {
    topLeft: number
    topRight: number
    bottomRight: number
    bottomLeft: number
  }
): string => {
  const formatCoordinate = formatPathNumber
  const left = rect.left
  const top = rect.top
  const right = rect.left + rect.width
  const bottom = rect.top + rect.height
  const limitRadius = (radius: number): number =>
    Math.min(radius, rect.width / 2, rect.height / 2)
  const topLeft = limitRadius(radii.topLeft)
  const topRight = limitRadius(radii.topRight)
  const bottomRight = limitRadius(radii.bottomRight)
  const bottomLeft = limitRadius(radii.bottomLeft)
  return [
    `M ${formatCoordinate(left + topLeft)} ${formatCoordinate(top)}`,
    `H ${formatCoordinate(right - topRight)}`,
    `Q ${formatCoordinate(right)} ${formatCoordinate(top)} ${formatCoordinate(right)} ${formatCoordinate(top + topRight)}`,
    `V ${formatCoordinate(bottom - bottomRight)}`,
    `Q ${formatCoordinate(right)} ${formatCoordinate(bottom)} ${formatCoordinate(right - bottomRight)} ${formatCoordinate(bottom)}`,
    `H ${formatCoordinate(left + bottomLeft)}`,
    `Q ${formatCoordinate(left)} ${formatCoordinate(bottom)} ${formatCoordinate(left)} ${formatCoordinate(bottom - bottomLeft)}`,
    `V ${formatCoordinate(top + topLeft)}`,
    `Q ${formatCoordinate(left)} ${formatCoordinate(top)} ${formatCoordinate(left + topLeft)} ${formatCoordinate(top)}`,
    'Z',
  ].join(' ')
}

const getConnectedRowsPath = (
  rows: SubtitleBackgroundRect[],
  outerRadius: number,
  middleRadius: number
): string => {
  if (rows.length === 1 && rows[0]) return getRoundedRectPath(rows[0], outerRadius)

  const pathParts = rows.map((row, index) => {
    const previous = rows[index - 1]
    const next = rows[index + 1]
    const rowRight = row.left + row.width
    const previousRight = previous ? previous.left + previous.width : 0
    const nextRight = next ? next.left + next.width : 0
    return getVariableRoundedRectPath(row, {
      topLeft: index === 0 ? outerRadius : previous && row.left < previous.left ? middleRadius : 0,
      topRight:
        index === 0 ? outerRadius : previous && rowRight > previousRight ? middleRadius : 0,
      bottomRight:
        index === rows.length - 1
          ? outerRadius
          : next && rowRight > nextRight
            ? middleRadius
            : 0,
      bottomLeft:
        index === rows.length - 1
          ? outerRadius
          : next && row.left < next.left
            ? middleRadius
            : 0,
    })
  })
  for (let index = 0; index < rows.length - 1; index += 1) {
    const upper = rows[index]
    const lower = rows[index + 1]
    if (!upper || !lower) continue
    const overlapLeft = Math.max(upper.left, lower.left)
    const overlapRight = Math.min(upper.left + upper.width, lower.left + lower.width)
    const inset = Math.min(middleRadius, Math.max(0, (overlapRight - overlapLeft) / 4))
    const connectorLeft = overlapLeft + inset
    const connectorRight = overlapRight - inset
    if (connectorRight <= connectorLeft) continue
    const upperBottom = upper.top + upper.height
    const formatCoordinate = formatPathNumber
    pathParts.push(
      `M ${formatCoordinate(connectorLeft)} ${formatCoordinate(upperBottom)} H ${formatCoordinate(connectorRight)} V ${formatCoordinate(lower.top)} H ${formatCoordinate(connectorLeft)} Z`
    )
  }
  return pathParts.join(' ')
}

const renderSubtitleBackgroundShape = (
  root: HTMLElement,
  background: PipSubtitleBackground,
  scale: number
): void => {
  root.querySelector(`[${SUBTITLE_BACKGROUND_SHAPE_ATTRIBUTE}]`)?.remove()
  if (background === 'none') return

  const rootRect = root.getBoundingClientRect()
  const safeScale = Math.max(scale, 0.001)
  const rects = Array.from(
    root.querySelectorAll<HTMLElement>('[data-pip-subtitle-background]')
  )
    .flatMap(element => {
      const fragments = Array.from(element.getClientRects())
      return fragments.length > 0 ? fragments : [element.getBoundingClientRect()]
    })
    .filter(rect => rect.width > 0 && rect.height > 0)
    .map<SubtitleBackgroundRect>(rect => ({
      left: (rect.left - rootRect.left) / safeScale,
      top: (rect.top - rootRect.top) / safeScale,
      width: rect.width / safeScale,
      height: rect.height / safeScale,
    }))
    .sort((left, right) => left.top - right.top || left.left - right.left)
  if (rects.length === 0) return

  const groups: SubtitleBackgroundRect[][] = []
  for (const rect of rects) {
    const group = groups.at(-1)
    const previous = group?.at(-1)
    const previousRight = previous ? previous.left + previous.width : 0
    const rectRight = rect.left + rect.width
    const verticalGap = previous ? rect.top - (previous.top + previous.height) : Number.POSITIVE_INFINITY
    const connectionLimit = previous ? Math.min(previous.height, rect.height) * 0.4 : 0
    const isNextRow = previous ? rect.top - previous.top > 2 / safeScale : false
    const horizontallyOverlaps = previous
      ? previous.left < rectRight && previousRight > rect.left
      : false

    if (
      group &&
      previous &&
      isNextRow &&
      horizontallyOverlaps &&
      verticalGap >= -connectionLimit &&
      verticalGap <= connectionLimit
    ) {
      group.push(rect)
    } else {
      groups.push([rect])
    }
  }
  const pathParts = groups.map(group =>
    getConnectedRowsPath(group, 4 / safeScale, 4 / safeScale)
  )

  const svg = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute(SUBTITLE_BACKGROUND_SHAPE_ATTRIBUTE, background)
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '100%')
  svg.setAttribute('height', '100%')
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '0',
  })
  const path = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathParts.join(' '))
  path.setAttribute('fill', SUBTITLE_BACKGROUND_COLORS[background])
  svg.append(path)
  root.prepend(svg)
}

const getPercentage = (value: string | undefined): number | null => {
  const match = value?.trim().match(/^(-?\d+(?:\.\d+)?)%$/)
  return match ? Number(match[1]) : null
}

const getSubtitleBottom = (controlsVisible: boolean, scale: number): string => {
  if (!controlsVisible) return DEFAULT_PIP_SUBTITLE_BOTTOM

  const sourcePixels = Number(
    (CONTROLS_VISIBLE_SUBTITLE_CLEARANCE_PX / Math.max(scale, 0.001)).toFixed(3)
  )
  return `calc(${DEFAULT_PIP_SUBTITLE_BOTTOM} + ${sourcePixels}px)`
}

const stabilizeSubtitlePosition = (
  source: HTMLElement,
  inner: HTMLElement,
  subtitleBottom: string
): void => {
  const sourceElements = source.querySelectorAll<HTMLElement>('*')
  const mirroredElements = inner.querySelectorAll<HTMLElement>('*')
  const sourceFrameRect = source.getBoundingClientRect()

  for (const [index, mirroredElement] of mirroredElements.entries()) {
    const sourceElement = sourceElements[index]
    if (!sourceElement) continue

    const sourceStyle = getSubtitleStyle(sourceElement)
    if (sourceStyle?.position !== 'absolute' && sourceStyle?.position !== 'fixed') continue

    Object.assign(mirroredElement.style, {
      left: '0',
      right: '0',
      width: '100%',
      marginLeft: '0',
      marginRight: '0',
      transform: 'none',
      textAlign: 'center',
    })

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
      bottom: subtitleBottom,
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
  private controlsVisible = false
  private subtitlesEnabled: boolean
  private subtitleSize: PipSubtitleSize
  private subtitleBackground: PipSubtitleBackground
  private started = false

  constructor(options: SubtitleMirrorOptions) {
    this.sourceDocument = options.sourceDocument
    this.searchRoot = options.searchRoot
    this.pipWindow = options.pipWindow
    this.video = options.video
    this.videoArea = options.videoArea
    this.subtitlesEnabled = options.settings?.subtitlesEnabled ?? true
    this.subtitleSize = options.settings?.subtitleSize ?? 'medium'
    this.subtitleBackground = options.settings?.subtitleBackground ?? 'translucent'
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

  setControlsVisible(visible: boolean): void {
    if (this.controlsVisible === visible) return
    this.controlsVisible = visible
    if (this.started) this.scheduleSync()
  }

  setSettings(settings: PipSettings): void {
    if (
      this.subtitlesEnabled === settings.subtitlesEnabled &&
      this.subtitleSize === settings.subtitleSize &&
      this.subtitleBackground === settings.subtitleBackground
    ) {
      return
    }
    this.subtitlesEnabled = settings.subtitlesEnabled
    this.subtitleSize = settings.subtitleSize
    this.subtitleBackground = settings.subtitleBackground
    if (this.started) this.scheduleSync()
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
    this.controlsVisible = false
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

    if (!this.subtitlesEnabled || !source || !source.isConnected) {
      inner.replaceChildren()
      mirror.style.visibility = 'hidden'
      return
    }

    copySubtitleAttributes(source, inner)
    copyComputedSubtitleStyles(source, inner)
    inner.replaceChildren(...Array.from(source.childNodes, node => node.cloneNode(true)))
    applyScaledSubtitleTypography(source, inner, SUBTITLE_SIZE_SCALE[this.subtitleSize])

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
    stabilizeSubtitlePosition(source, inner, getSubtitleBottom(this.controlsVisible, scale))
    applySubtitleBackground(inner, this.subtitleBackground)
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
    inner.style.isolation = 'isolate'
    renderSubtitleBackgroundShape(inner, this.subtitleBackground, scale)
    mirror.style.visibility = hasSubtitleText(source) ? 'visible' : 'hidden'
  }
}
