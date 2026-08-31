import { useRef, type ComponentProps, type PointerEvent as ReactPointerEvent } from 'react'

import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type NumericSettingFieldProps = Omit<
  ComponentProps<typeof Input>,
  'className' | 'id' | 'onChange' | 'type' | 'value'
> & {
  id: string
  label: string
  tooltip: string
  value: string
  onValueChange: (value: string) => void
  orientation?: ComponentProps<typeof Field>['orientation']
  fieldClassName?: string
  labelClassName?: string
  inputClassName?: string
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

export function NumericSettingField({
  id,
  label,
  tooltip,
  value,
  onValueChange,
  orientation,
  fieldClassName,
  labelClassName,
  inputClassName,
  onDragCommit,
  onWheel,
  ...inputProps
}: NumericSettingFieldProps) {
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startValue: number
    startValueText: string
    changed: boolean
  } | null>(null)

  const handleLabelPointerDown = (event: ReactPointerEvent<HTMLLabelElement>) => {
    if (event.button !== 0 || inputProps.disabled) return

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

  const handleLabelPointerMove = (event: ReactPointerEvent<HTMLLabelElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const step = toFiniteNumber(inputProps.step) ?? 1
    const stepCount = Math.round((event.clientX - drag.startX) / DRAG_PIXELS_PER_STEP)
    const precision = Math.min(decimalPlaces(step), 10)
    const factor = 10 ** precision
    const unclampedValue = Math.round((drag.startValue + stepCount * step) * factor) / factor
    const min = toFiniteNumber(inputProps.min) ?? Number.NEGATIVE_INFINITY
    const max = toFiniteNumber(inputProps.max) ?? Number.POSITIVE_INFINITY
    const nextValue = Math.min(max, Math.max(min, unclampedValue))

    drag.changed = nextValue !== drag.startValue
    onValueChange(nextValue.toString())
    event.preventDefault()
  }

  const handleLabelPointerUp = (event: ReactPointerEvent<HTMLLabelElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (drag.changed) onDragCommit?.()
  }

  const handleLabelPointerCancel = (event: ReactPointerEvent<HTMLLabelElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null
    if (drag.changed) onValueChange(drag.startValueText)
  }

  return (
    <Field orientation={orientation} className={fieldClassName}>
      <SettingLabelWithTooltip
        htmlFor={id}
        label={label}
        tooltip={tooltip}
        labelClassName={`${labelClassName ?? ''} ${
          inputProps.disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'
        } touch-pan-y select-none`}
        labelProps={{
          'aria-disabled': inputProps.disabled,
          style: { cursor: inputProps.disabled ? 'not-allowed' : 'ew-resize' },
          onPointerDown: handleLabelPointerDown,
          onPointerMove: handleLabelPointerMove,
          onPointerUp: handleLabelPointerUp,
          onPointerCancel: handleLabelPointerCancel,
        }}
      />
      <Input
        {...inputProps}
        id={id}
        type="number"
        value={value}
        className={inputClassName}
        onChange={event => onValueChange(event.target.value)}
        onWheel={event => {
          onWheel?.(event)
          if (!event.defaultPrevented) event.currentTarget.blur()
        }}
      />
    </Field>
  )
}
