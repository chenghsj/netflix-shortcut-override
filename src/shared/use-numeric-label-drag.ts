import { useRef, type PointerEvent as ReactPointerEvent } from 'react'

type NumericLabelDragOptions = {
  value: string
  onValueChange: (value: string) => void
  min?: string | number
  max?: string | number
  step?: string | number
  disabled?: boolean
  onDragCommit?: () => void
}

const DRAG_PIXELS_PER_STEP = 8

const toFiniteNumber = (value: string | number | undefined): number | undefined => {
  if (value === undefined || value === 'any') return undefined
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const decimalPlaces = (value: number): number => {
  const [, fraction = '', exponent = '0'] =
    value.toString().match(/^\d+(?:\.(\d+))?(?:e-(\d+))?$/i) ?? []
  return fraction.length + Number.parseInt(exponent, 10)
}

export function useNumericLabelDrag({ value, onValueChange, min, max, step, disabled, onDragCommit }: NumericLabelDragOptions) {
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
    startValueText: string
    changed: boolean
  } | null>(null)

  const handleLabelPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0 || disabled) return

    const startValue = Number.parseFloat(value)
    if (!Number.isFinite(startValue)) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startValue,
      startValueText: value,
      changed: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleLabelPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const numericStep = toFiniteNumber(step) ?? 1
    const stepCount = Math.round((event.clientX - drag.startX) / DRAG_PIXELS_PER_STEP)
    const precision = Math.min(decimalPlaces(numericStep), 10)
    const factor = 10 ** precision
    const unclampedValue = Math.round((drag.startValue + stepCount * numericStep) * factor) / factor
    const minimum = toFiniteNumber(min) ?? Number.NEGATIVE_INFINITY
    const maximum = toFiniteNumber(max) ?? Number.POSITIVE_INFINITY
    const nextValue = Math.min(maximum, Math.max(minimum, unclampedValue))

    drag.changed = nextValue !== drag.startValue
    onValueChange(nextValue.toString())
    event.preventDefault()
  }

  const handleLabelPointerUp = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (drag.changed) onDragCommit?.()
  }

  const handleLabelPointerCancel = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    if (drag.changed) onValueChange(drag.startValueText)
  }

  return {
    onPointerDown: handleLabelPointerDown,
    onPointerMove: handleLabelPointerMove,
    onPointerUp: handleLabelPointerUp,
    onPointerCancel: handleLabelPointerCancel,
  }
}
