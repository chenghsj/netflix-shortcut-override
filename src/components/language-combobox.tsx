import { ChevronsUpDownIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { LOCALE_LABELS, LOCALE_SHORT_LABELS } from '@/shared/i18n'
import { LOCALES, type Locale } from '@/shared/shortcuts'

type LanguageComboboxProps = {
  value: Locale
  onChange: (value: Locale) => void
  label: string
  size?: 'sm' | 'default'
  className?: string
}

export function LanguageCombobox({
  value,
  onChange,
  label,
  size = 'sm',
  className,
}: LanguageComboboxProps) {
  const [open, setOpen] = useState(false)
  const selectedLabel = LOCALE_SHORT_LABELS[value]
  const selectedTitle = LOCALE_LABELS[value]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          className={cn('min-w-28 justify-between rounded-lg pl-3', className)}
        >
          <span className="min-w-0 flex-1 truncate text-left" title={selectedTitle}>
            {selectedLabel}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-(--radix-popover-trigger-width) min-w-36 p-0">
        <Command
          filter={(itemValue, search, keywords) => {
            const haystack = `${itemValue} ${(keywords ?? []).join(' ')}`.toLowerCase()
            return haystack.includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          <CommandList className="max-h-56">
            <CommandGroup>
              {LOCALES.map(locale => {
                const optionLabel = LOCALE_SHORT_LABELS[locale]
                const optionTitle = LOCALE_LABELS[locale]

                return (
                  <CommandItem
                    key={locale}
                    value={locale}
                    keywords={[optionLabel, optionTitle]}
                    data-checked={value === locale}
                    onSelect={() => {
                      if (locale !== value) onChange(locale)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1 truncate" title={optionTitle}>
                      {optionLabel}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
