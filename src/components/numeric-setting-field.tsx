import type { ComponentProps } from 'react'
import { useNumericLabelDrag } from '@/shared/use-numeric-label-drag'
import { cn } from '@/lib/utils'

import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { Field, FieldLabel } from '@/components/app-ui/field'
import { Input } from '@/components/app-ui/input'

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
  layout?: 'default' | 'inline-range'
  unit?: string
  onDragCommit?: () => void
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
  layout = 'default',
  unit,
  onDragCommit,
  onWheel,
  ...inputProps
}: NumericSettingFieldProps) {
  const dragLabelProps = useNumericLabelDrag({
    value, onValueChange, min: inputProps.min, max: inputProps.max, step: inputProps.step,
    disabled: inputProps.disabled, onDragCommit,
  })
  const inlineRange = layout === 'inline-range'
  const rangeId = `${id}-range`
  const numericLabelClassName = cn(labelClassName,
    inputProps.disabled ? 'cursor-not-allowed' : 'cursor-ew-resize', 'touch-pan-y select-none')
  const numericLabelProps = {
    'aria-disabled': inputProps.disabled,
    style: { cursor: inputProps.disabled ? 'not-allowed' : 'ew-resize' },
    ...dragLabelProps,
  }
  const input = (
    <Input
      {...inputProps}
      id={id}
      type="number"
      value={value}
      className={cn(inlineRange && 'w-28', inputClassName)}
      aria-describedby={inlineRange ? [inputProps['aria-describedby'], rangeId].filter(Boolean).join(' ') : inputProps['aria-describedby']}
      onChange={event => onValueChange(event.target.value)}
      onWheel={event => {
        onWheel?.(event)
        if (!event.defaultPrevented) event.currentTarget.blur()
      }}
    />
  )

  return (
    <Field orientation={inlineRange ? 'horizontal' : orientation} className={cn(inlineRange && 'items-center justify-between', fieldClassName)}>
      {inlineRange ? <div className="min-w-0 space-y-1.5">
        <FieldLabel {...numericLabelProps} htmlFor={id} className={numericLabelClassName}>{label}</FieldLabel>
        <p id={rangeId} className="text-xs text-muted-foreground">{inputProps.min}–{inputProps.max}{unit && ` ${unit}`}</p>
      </div> : <SettingLabelWithTooltip
        htmlFor={id}
        label={label}
        tooltip={tooltip}
        labelClassName={numericLabelClassName}
        labelProps={numericLabelProps}
      />}
      {inlineRange ? <div className="flex shrink-0 items-center gap-2">
        {input}
        {unit && <span aria-hidden="true" className="text-muted-foreground">{unit}</span>}
      </div> : input}
    </Field>
  )
}
