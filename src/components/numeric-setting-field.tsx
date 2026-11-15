import type { ComponentProps } from 'react'
import { useNumericLabelDrag } from '@/shared/use-numeric-label-drag'

import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { Field } from '@/components/app-ui/field'
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
  onDragCommit,
  onWheel,
  ...inputProps
}: NumericSettingFieldProps) {
  const dragLabelProps = useNumericLabelDrag({
    value, onValueChange, min: inputProps.min, max: inputProps.max, step: inputProps.step,
    disabled: inputProps.disabled, onDragCommit,
  })

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
          ...dragLabelProps,
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
