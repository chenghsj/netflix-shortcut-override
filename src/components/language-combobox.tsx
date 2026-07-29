import { ChoiceCombobox } from '@/components/choice-combobox'
import { LOCALE_LABELS, LOCALE_SHORT_LABELS } from '@/shared/i18n'
import {
  LOCALE_PREFERENCES,
  type LocalePreference,
} from '@/shared/shortcut-types'

type LanguageComboboxProps = {
  value: LocalePreference
  onChange: (value: LocalePreference) => void
  label: string
  autoLabel: string
  size?: 'sm' | 'default'
  className?: string
}

export function LanguageCombobox({
  value,
  onChange,
  label,
  autoLabel,
  size = 'sm',
  className,
}: LanguageComboboxProps) {
  return (
    <ChoiceCombobox
      value={value}
      onChange={onChange}
      label={label}
      options={LOCALE_PREFERENCES.map(locale => ({
        value: locale,
        label: locale === 'auto' ? autoLabel : LOCALE_SHORT_LABELS[locale],
        title: locale === 'auto' ? autoLabel : LOCALE_LABELS[locale],
      }))}
      size={size}
      className={className}
    />
  )
}
