import { useEffect, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { useReorderAnimation } from './use-reorder-animation'

type Key = string | number
type Layout<K> = { key: K; top: number; height: number }
type Session<K> = {
  key: K
  from: number
  to: number
  keys: readonly K[]
  scope: unknown
  layouts: Layout<K>[]
  gap: number
  grabOffset: number
  hideSource: boolean
}

export function useDragReorder<K extends Key>({ keys, scope, onReorder, onFinish }: {
  keys: readonly K[]
  scope?: unknown
  onReorder: (key: K, from: number, to: number) => void
  onFinish: () => void
}) {
  const skipNext = useRef(false)
  const ref = useReorderAnimation(skipNext)
  const session = useRef<Session<K> | null>(null)
  const frame = useRef<number | null>(null)
  const [preview, setPreview] = useState<Session<K> | null>(null)
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }, [])

  const isCurrent = (drag: Session<K> | null): drag is Session<K> => Boolean(drag && drag.scope === scope &&
    drag.keys.length === keys.length && keys.every((key, index) => key === drag.keys[index]))
  const active = isCurrent(preview) ? preview : null
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  const end = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    session.current = null
    setPreview(null)
    onFinish()
  }

  const start = (event: DragEvent<HTMLElement>, key: K) => {
    const list = ref.current
    const from = keys.indexOf(key)
    if (!list || from < 0) return
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    const rows = Array.from(list.children) as HTMLElement[]
    rows.forEach(row => row.getAnimations?.().forEach(animation => animation.cancel()))
    const listTop = list.getBoundingClientRect().top
    const layouts = rows.map((row, index) => {
      const rect = row.getBoundingClientRect()
      return { key: keys[index], top: rect.top - listTop, height: rect.height }
    })
    if (layouts.length !== keys.length) return
    const drag: Session<K> = {
      key, from, to: from, keys: [...keys], scope, layouts,
      gap: layouts.length > 1 ? layouts[1].top - layouts[0].top - layouts[0].height : 0,
      grabOffset: Number.isFinite(event.clientY) ? event.clientY - listTop - layouts[from].top : layouts[from].height / 2,
      hideSource: false,
    }
    session.current = drag
    setPreview(drag)
    // Hide the source only after the browser has captured the native drag image.
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (!session.current || session.current.key !== key) return
      session.current = { ...session.current, hideSource: true }
      setPreview(session.current)
    })
  }

  const destination = (event: DragEvent<HTMLOListElement>, drag: Session<K>) => {
    // Hit testing uses the original slots, so animated rows cannot oscillate under the pointer.
    const center = event.clientY - event.currentTarget.getBoundingClientRect().top -
      drag.grabOffset + drag.layouts[drag.from].height / 2
    return drag.layouts.filter(row => row.key !== drag.key && center > row.top + row.height / 2).length
  }

  const shifts = new Map<K, number>()
  if (active) {
    const ordered = active.keys.filter(key => key !== active.key)
    ordered.splice(active.to, 0, active.key)
    const layouts = new Map(active.layouts.map(row => [row.key, row]))
    let top = active.layouts[0].top
    for (const key of ordered) {
      const row = layouts.get(key)!
      shifts.set(key, top - row.top)
      top += row.height + active.gap
    }
  }

  const getRowStyle = (key: K): CSSProperties | undefined => active ? {
    transform: `translateY(${shifts.get(key) ?? 0}px)`,
    transition: reducedMotion ? 'none' : 'transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1)',
    visibility: active.hideSource && key === active.key ? 'hidden' : undefined,
  } : undefined

  return {
    start, getRowStyle,
    listProps: {
      ref,
      onDragOver: (event: DragEvent<HTMLOListElement>) => {
        const drag = session.current
        if (!isCurrent(drag)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        const to = destination(event, drag)
        if (to === drag.to) return
        session.current = { ...drag, to }
        setPreview(session.current)
      },
      onDragLeave: (event: DragEvent<HTMLOListElement>) => {
        const drag = session.current
        if (!isCurrent(drag) || drag.to === drag.from) return
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return
        session.current = { ...drag, to: drag.from }
        setPreview(session.current)
      },
      onDrop: (event: DragEvent<HTMLOListElement>) => {
        const drag = session.current
        if (!isCurrent(drag)) return
        event.preventDefault()
        const to = destination(event, drag)
        end()
        if (to === drag.from) return
        // The peers already moved during dragover; committing must not animate them a second time.
        skipNext.current = true
        onReorder(drag.key, drag.from, to)
      },
      onDragEnd: end,
    },
  }
}
