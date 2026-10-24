import { ChevronsUpDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/app-ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/app-ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
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
  triggerIcon?: ReactNode
}

export function ChoiceCombobox<Value extends string>({
  value,
  onChange,
  label,
  options,
  size = 'sm',
  className,
  triggerIcon,
}: ChoiceComboboxProps<Value>) {
  const [open, setOpen] = useState(false)
  const selectedDescriptionId = useId()
  const selected = options.find(option => option.value === value) ?? options[0]
  const selectedTitle = selected?.title ?? selected?.label
  const iconOnly = triggerIcon !== undefined
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size={iconOnly ? 'icon' : size}
        role="combobox"
        aria-label={label}
        aria-describedby={iconOnly ? selectedDescriptionId : undefined}
        aria-expanded={open}
        className={cn(iconOnly ? 'rounded-full' : 'min-w-28 justify-between pl-3', className)}
      >
        {iconOnly ? <>
          {triggerIcon}
          <span id={selectedDescriptionId} className="sr-only">{selected?.label}</span>
        </> : <>
          <span className="min-w-0 flex-1 truncate text-left" title={selectedTitle}>
            {selected?.label}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </>}
      </Button>
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger}
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
