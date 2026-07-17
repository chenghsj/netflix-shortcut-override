import type { ComponentProps } from 'react'

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
  ...inputProps
}: NumericSettingFieldProps) {
  return (
    <Field orientation={orientation} className={fieldClassName}>
      <SettingLabelWithTooltip
        htmlFor={id}
        label={label}
        tooltip={tooltip}
        labelClassName={labelClassName}
      />
      <Input
        {...inputProps}
        id={id}
        type="number"
        value={value}
        className={inputClassName}
        onChange={event => onValueChange(event.target.value)}
      />
    </Field>
  )
}
