import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

type Position = { top: number; left: number }

export function useReorderAnimation(skipNextRef?: RefObject<boolean>) {
  const container = useRef<HTMLOListElement>(null)
  const previous = useRef<{ rows: HTMLElement[]; positions: Map<HTMLElement, Position> } | null>(null)
  const animations = useRef<Animation[]>([])
  useEffect(() => () => animations.current.forEach(animation => animation.cancel()), [])

  useLayoutEffect(() => {
    const rows = Array.from(container.current?.children ?? []).filter((row): row is HTMLElement => row instanceof HTMLElement)
    // Layout offsets remain stable while the page scrolls or a previous move animates.
    const positions = new Map(rows.map(row => [row, { top: row.offsetTop, left: row.offsetLeft }]))
    const before = previous.current
    previous.current = { rows, positions }
    if (!before || rows.every((row, index) => row === before.rows[index])) return

    animations.current.forEach(animation => animation.cancel())
    animations.current = []
    if (skipNextRef?.current) {
      skipNextRef.current = false
      return
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    for (const row of rows) {
      const from = before.positions.get(row)
      const to = positions.get(row)!
      if (!from || typeof row.animate !== 'function') continue
      const x = from.left - to.left
      const y = from.top - to.top
      if (!x && !y) continue
      animations.current.push(row.animate([
        { transform: `translate(${x}px, ${y}px)` },
        { transform: 'translate(0, 0)' },
      ], { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }))
    }
  })

  return container
}
