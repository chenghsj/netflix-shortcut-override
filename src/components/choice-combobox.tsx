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

export type ChoiceComboboxOption<Value extends string> = {
  value: Value
  label: string
  title?: string
  keywords?: string[]
}

type ChoiceComboboxProps<Value extends string> = {
  value: Value
  onChange: (value: Value) => void
  label: string
  options: readonly ChoiceComboboxOption<Value>[]
  size?: 'sm' | 'default'
  className?: string
}

export function ChoiceCombobox<Value extends string>({
  value,
  onChange,
  label,
  options,
  size = 'sm',
  className,
}: ChoiceComboboxProps<Value>) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value) ?? options[0]

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
          <span className="min-w-0 flex-1 truncate text-left" title={selected?.title ?? selected?.label}>
            {selected?.label}
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
              {options.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label, option.title ?? option.label, ...(option.keywords ?? [])]}
                  data-checked={value === option.value}
                  onSelect={() => {
                    if (option.value !== value) onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="min-w-0 flex-1 truncate" title={option.title ?? option.label}>
                    {option.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
