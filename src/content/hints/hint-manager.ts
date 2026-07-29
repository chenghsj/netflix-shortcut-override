import {
  HINT_IDS,
  SPEED_HINT_LABEL_ID,
  VOLUME_HINT_LABEL_ID,
} from './hint-constants'
import {
  createHintIcon,
  mediaHintIcons,
  type HintIcon,
  type HintManager,
  type HintRequest,
} from './hint-definitions'
import {
  getHintRenderDocument,
  getHintRenderHost,
  positionCenteredHint,
  positionLabeledHintLabel,
  positionSeekHint,
  positionSpaceHoldHint,
  updateHintScale,
  type StyleMap,
} from './hint-layout'
import { isPipDocument } from '@/content/pip/pip-document'
import {
  renderMediaHint,
  renderPlaybackHint,
  renderSeekHint,
  renderSpaceHoldHint,
  renderSpeedHint,
  renderVolumeHint,
  type HintRendererContext,
  type SeekSeries,
} from './hint-renderers'

export {
  createHintIcon,
  mediaHintIcons,
  type HintIcon,
  type HintManager,
  type HintRequest,
}

class DocumentHintManager implements HintManager {
  private root: HTMLElement | null = null
  private timer: number | null = null
  private generation = 0
  private activeRequest: HintRequest | null = null
  private seekSeries: SeekSeries | null = null
  private readonly responsive: boolean
  private readonly renderDoc: Document
  private resizeHandler: (() => void) | null = null

  constructor(renderDoc: Document) {
    this.renderDoc = renderDoc
    this.responsive = isPipDocument(renderDoc)
    this.attachResizeListener()
  }

  show(request: HintRequest): void {
    this.clearTimer()
    if (request.type !== 'seek') this.seekSeries = null
    this.activeRequest = request
    this.attachResizeListener()

    switch (request.type) {
      case 'media':
        renderMediaHint(this.rendererContext, request)
        return
      case 'playback':
        renderPlaybackHint(this.rendererContext, request)
        return
      case 'volume':
        renderVolumeHint(this.rendererContext, request)
        return
      case 'speed':
        renderSpeedHint(this.rendererContext, request)
        return
      case 'seek':
        this.seekSeries = renderSeekHint(this.rendererContext, request, this.seekSeries)
        return
      case 'spaceHold':
        renderSpaceHoldHint(this.rendererContext, request)
        return
    }
  }

  hide(): void {
    this.clearTimer()
    this.activeRequest = null
    this.seekSeries = null
    this.root?.style.setProperty('opacity', '0')
    this.root?.style.setProperty('visibility', 'hidden')
    this.root = null
    this.removeAllHintNodes()
  }

  destroy(): void {
    this.hide()
    const renderWindow = this.renderDoc.defaultView
    if (renderWindow && this.resizeHandler) {
      renderWindow.removeEventListener('resize', this.resizeHandler)
    }
    this.resizeHandler = null
  }

  private get rendererContext(): HintRendererContext {
    return {
      renderDoc: this.renderDoc,
      responsive: this.responsive,
      getRoot: () => this.root,
      createRoot: (id, styles) => this.createRoot(id, styles),
      scheduleExit: (delay, callback) => this.scheduleExit(delay, callback),
    }
  }

  private attachResizeListener(): void {
    if (!this.responsive || this.resizeHandler) return

    const renderWindow = this.renderDoc.defaultView
    if (!renderWindow) return

    this.resizeHandler = () => {
      this.updateScale()
      this.repositionActiveHint()
    }
    renderWindow.addEventListener('resize', this.resizeHandler)
  }

  private updateScale(): void {
    if (!this.responsive || !this.root) return
    updateHintScale(this.root, this.renderDoc, true)
  }

  private repositionActiveHint(): void {
    const root = this.root
    const request = this.activeRequest
    if (!root || !request) return

    switch (request.type) {
      case 'media':
      case 'playback':
        positionCenteredHint(root, this.renderDoc)
        return
      case 'volume':
      case 'speed': {
        const circle = root.firstElementChild as HTMLElement | null
        const labelId =
          request.type === 'volume'
            ? VOLUME_HINT_LABEL_ID
            : SPEED_HINT_LABEL_ID
        const label = root.querySelector<HTMLElement>(`#${labelId}`)
        if (circle) positionCenteredHint(circle, this.renderDoc)
        if (label) positionLabeledHintLabel(label)
        return
      }
      case 'seek':
        positionSeekHint(root, this.renderDoc, this.responsive, request.direction)
        return
      case 'spaceHold':
        positionSpaceHoldHint(root, this.renderDoc)
        return
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      const timerWindow = this.renderDoc.defaultView ?? window
      timerWindow.clearTimeout(this.timer)
    }
    this.timer = null
    this.generation += 1
  }

  private scheduleExit(delay: number, callback: () => void): void {
    const timerWindow = this.renderDoc.defaultView ?? window
    const generation = this.generation
    this.timer = timerWindow.setTimeout(() => {
      if (generation !== this.generation) return
      this.timer = null
      callback()
    }, delay)
  }

  private removeAllHintNodes(): void {
    for (const id of HINT_IDS) {
      this.renderDoc.querySelectorAll<HTMLElement>(`[id="${id}"]`).forEach(node => {
        node.style.opacity = '0'
        node.style.visibility = 'hidden'
        node.style.pointerEvents = 'none'
        node.remove()
      })
    }
    this.root = null
  }

  private createRoot(id: string, styles: StyleMap): HTMLElement {
    const host = getHintRenderHost(this.renderDoc)
    let root: HTMLElement | null = null

    for (const hintId of HINT_IDS) {
      for (const node of this.renderDoc.querySelectorAll<HTMLElement>(`[id="${hintId}"]`)) {
        if (hintId === id && root === null) {
          root = node
          continue
        }

        node.style.opacity = '0'
        node.style.visibility = 'hidden'
        node.style.pointerEvents = 'none'
        node.remove()
      }
    }

    if (root === null) root = this.renderDoc.createElement('div')
    root.id = id
    Object.assign(root.style, styles)
    updateHintScale(root, this.renderDoc, this.responsive)
    if (root.parentElement !== host) host.appendChild(root)
    this.root = root
    return root
  }
}

const managersByDocument = new WeakMap<Document, DocumentHintManager>()

export const getHintManager = (targetDoc: Document): HintManager => {
  const renderDoc = getHintRenderDocument(targetDoc)
  const existing = managersByDocument.get(renderDoc)
  if (existing) return existing

  const manager = new DocumentHintManager(renderDoc)
  managersByDocument.set(renderDoc, manager)
  return manager
}
