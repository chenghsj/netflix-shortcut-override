import { useEffect, useRef, type DragEvent } from 'react'

const getBackground = (row: HTMLElement): string => {
  for (let element: HTMLElement | null = row; element; element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor
    if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') return color
  }
  return 'var(--card)'
}

export function useDragPreview() {
  const previewRef = useRef<HTMLElement | null>(null)
  const removeDragPreview = () => {
    previewRef.current?.remove()
    previewRef.current = null
  }
  useEffect(() => () => previewRef.current?.remove(), [])

  const setDragPreview = (event: DragEvent<HTMLElement>, row: HTMLElement) => {
    removeDragPreview()
    const { left, top, width } = row.getBoundingClientRect()
    const preview = row.cloneNode(true) as HTMLElement
    preview.setAttribute('aria-hidden', 'true')
    preview.inert = true
    Object.assign(preview.style, {
      position: 'fixed', left: `${left}px`, top: `${top}px`, width: `${width}px`,
      margin: '0', backgroundColor: getBackground(row), pointerEvents: 'none', zIndex: '50',
    })
    document.body.append(preview)
    previewRef.current = preview
    event.dataTransfer.setDragImage(preview, event.clientX - left, event.clientY - top)
    // Keep the styled preview until the browser has captured its drag image.
    requestAnimationFrame(() => {
      preview.remove()
      if (previewRef.current === preview) previewRef.current = null
    })
  }

  return { setDragPreview, removeDragPreview }
}
