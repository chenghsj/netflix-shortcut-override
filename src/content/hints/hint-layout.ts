import { isVideoElement } from '@/content/dom-utils'
import {
  HINT_SCALE_CSS_VAR,
  SEEK_HINT_EDGE_INSET_PX,
  SEEK_HINT_OUTER_TRANSFORM,
} from './hint-constants'
import { PIP_DOCUMENT_MARKER } from './hint-definitions'

const PIP_HINT_BASE_WIDTH = 640
const PIP_HINT_BASE_HEIGHT = 360
const PIP_HINT_MIN_SCALE = 0.7
const PIP_HINT_MAX_SCALE = 1

export type StyleMap = Record<string, string>

export const setStyles = (element: HTMLElement, styles: StyleMap): void => {
  Object.assign(element.style, styles)
}

const getHintAnchor = (targetDoc: Document): HTMLElement | null => {
  const localVideo = targetDoc.querySelector('video')
  if (isVideoElement(localVideo)) return localVideo.parentElement ?? localVideo

  if (targetDoc !== document) {
    const rootVideo = document.querySelector('video')
    if (isVideoElement(rootVideo)) return rootVideo.parentElement ?? rootVideo
  }

  return null
}

export const getHintRenderDocument = (targetDoc: Document): Document =>
  getHintAnchor(targetDoc)?.ownerDocument ?? targetDoc

export const getHintRenderHost = (renderDoc: Document): HTMLElement => {
  const fullscreenElement = renderDoc.fullscreenElement
  if (fullscreenElement && fullscreenElement.nodeType === Node.ELEMENT_NODE) {
    return fullscreenElement as HTMLElement
  }

  return renderDoc.body
}

const getViewportSize = (targetDoc: Document): { width: number; height: number } => ({
  width: targetDoc.defaultView?.innerWidth ?? window.innerWidth,
  height: targetDoc.defaultView?.innerHeight ?? window.innerHeight,
})

export const isPipHintDocument = (targetDoc: Document): boolean =>
  targetDoc.documentElement?.dataset[PIP_DOCUMENT_MARKER] === 'true'

export const getPipHintScale = (targetDoc: Document): number => {
  const { width, height } = getViewportSize(targetDoc)
  if (width <= 0 || height <= 0) return 1

  const scale = Math.min(width / PIP_HINT_BASE_WIDTH, height / PIP_HINT_BASE_HEIGHT)
  return Math.min(PIP_HINT_MAX_SCALE, Math.max(PIP_HINT_MIN_SCALE, scale))
}

export const getHintTransform = (responsive: boolean, transform: string): string =>
  responsive ? `${transform} scale(var(${HINT_SCALE_CSS_VAR}, 1))` : transform

export const updateHintScale = (
  element: HTMLElement,
  renderDoc: Document,
  responsive: boolean
): void => {
  if (responsive) {
    element.style.setProperty(HINT_SCALE_CSS_VAR, getPipHintScale(renderDoc).toString())
  } else {
    element.style.removeProperty(HINT_SCALE_CSS_VAR)
  }
}

export const positionCenteredHint = (element: HTMLElement, renderDoc: Document): void => {
  const anchorRect = getHintAnchor(renderDoc)?.getBoundingClientRect()
  if (anchorRect && anchorRect.width > 0 && anchorRect.height > 0) {
    element.style.left = `${anchorRect.left + anchorRect.width / 2}px`
    element.style.top = `${anchorRect.top + anchorRect.height / 2}px`
    return
  }

  const viewport = getViewportSize(renderDoc)
  element.style.left = `${viewport.width / 2}px`
  element.style.top = `${viewport.height / 2}px`
}

export const positionLabeledHintLabel = (element: HTMLElement): void => {
  element.style.left = '50%'
  element.style.top = '10%'
}

export const positionSpaceHoldHint = (element: HTMLElement, renderDoc: Document): void => {
  const anchorRect = getHintAnchor(renderDoc)?.getBoundingClientRect()
  const video = renderDoc.querySelector('video')
  const videoRect = isVideoElement(video) ? video.getBoundingClientRect() : null
  const viewportHeight = getViewportSize(renderDoc).height
  const topOffset = Math.max(20, Math.min(40, viewportHeight * 0.04))
  const videoTop =
    videoRect && videoRect.width > 0 && videoRect.height > 0
      ? Math.max(0, videoRect.top) + 20
      : topOffset

  element.style.left =
    anchorRect && anchorRect.width > 0 && anchorRect.height > 0
      ? `${anchorRect.left + anchorRect.width / 2}px`
      : '50%'
  element.style.top = `${videoTop}px`
}

export const positionSeekHint = (
  element: HTMLElement,
  renderDoc: Document,
  responsive: boolean,
  direction: -1 | 1
): void => {
  const anchorRect = getHintAnchor(renderDoc)?.getBoundingClientRect()
  const viewportWidth = getViewportSize(renderDoc).width
  const scale = responsive ? getPipHintScale(renderDoc) : 1
  const edgeInset = Math.round(SEEK_HINT_EDGE_INSET_PX * scale * 100) / 100
  const hintWidth = element.getBoundingClientRect().width / scale
  const preferredLeft =
    anchorRect && anchorRect.width > 0 && anchorRect.height > 0
      ? direction > 0
        ? anchorRect.right - edgeInset - hintWidth
        : anchorRect.left + edgeInset
      : direction > 0
        ? viewportWidth - edgeInset - hintWidth
        : edgeInset

  element.style.top =
    anchorRect && anchorRect.width > 0 && anchorRect.height > 0
      ? `${anchorRect.top + anchorRect.height / 2}px`
      : '50%'
  element.style.transform = getHintTransform(responsive, SEEK_HINT_OUTER_TRANSFORM)

  if (viewportWidth <= 0 || hintWidth <= 0) {
    element.style.left = `${preferredLeft}px`
    return
  }

  const minLeft = edgeInset
  const maxLeft = Math.max(minLeft, viewportWidth - edgeInset - hintWidth)
  element.style.left = `${Math.min(Math.max(preferredLeft, minLeft), maxLeft)}px`
}
