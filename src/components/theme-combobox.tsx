import { ChoiceCombobox } from '@/components/choice-combobox'
import { THEME_MODES, type ThemeMode } from '@/shared/shortcut-types'

type ThemeComboboxProps = {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
  label: string
  labels: Record<ThemeMode, string>
  size?: 'sm' | 'default'
  className?: string
}

export function ThemeCombobox({
  value,
  onChange,
  label,
  labels,
  size = 'sm',
  className,
}: ThemeComboboxProps) {
  return (
    <ChoiceCombobox
      value={value}
      onChange={onChange}
      label={label}
      options={THEME_MODES.map(themeMode => ({
        value: themeMode,
        label: labels[themeMode],
      }))}
      size={size}
      className={className}
    />
  )
}
