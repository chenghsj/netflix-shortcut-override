import { ChevronsUpDownIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/app-ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
  disabled?: boolean
}

type ChoiceComboboxProps<Value extends string> = {
  value: Value
  onChange: (value: Value) => void
  label: string
  options: readonly ChoiceComboboxOption<Value>[]
  size?: 'sm' | 'default'
  className?: string
  triggerIcon?: ReactNode
  placeholder?: string
  search?: { placeholder: string; empty: string }
  createOption?: (query: string) => ChoiceComboboxOption<Value> | undefined
  disabled?: boolean
}

export function ChoiceCombobox<Value extends string>({
  value,
  onChange,
  label,
  options,
  size = 'sm',
  className,
  triggerIcon,
  placeholder,
  search,
  disabled,
  createOption,
}: ChoiceComboboxProps<Value>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const matches = (option: ChoiceComboboxOption<Value>) =>
    [option.value, option.label, option.title ?? '', ...(option.keywords ?? [])].join(' ').toLowerCase().includes(query.toLowerCase())
  const customOption = query.trim() && !options.some(matches) ? createOption?.(query) : undefined
  const menuOptions = customOption ? [...options, customOption] : options
  const selectedDescriptionId = useId()
  const selected = options.find(option => option.value === value) ?? (placeholder === undefined ? options[0] : undefined)
  const selectedTitle = selected?.title ?? selected?.label
  const iconOnly = triggerIcon !== undefined
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size={iconOnly ? 'icon' : size}
        role="combobox"
        disabled={disabled}
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
            {selected?.label ?? (createOption && value ? value : placeholder)}
          </span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </>}
      </Button>
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={nextOpen => { setOpen(nextOpen); setQuery('') }}>
      {trigger}
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-max min-w-[max(10rem,var(--radix-popover-trigger-width))] max-w-(--radix-popover-content-available-width) p-0"
      >
        <Command
          label={search?.placeholder}
          filter={(itemValue, search, keywords) => {
            const haystack = `${itemValue} ${(keywords ?? []).join(' ')}`.toLowerCase()
            return itemValue === customOption?.value || haystack.includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          {search && <CommandInput placeholder={search.placeholder} value={query} onValueChange={setQuery} />}
          <CommandList className="max-h-56">
            {search && <CommandEmpty>{search.empty}</CommandEmpty>}
            <CommandGroup>
              {menuOptions.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  keywords={[option.label, option.title ?? option.label, ...(option.keywords ?? [])]}
                  data-checked={value === option.value}
                  onSelect={() => {
                    if (option.value !== value) onChange(option.value)
                    setOpen(false)
                  }}
                >
                  <span className="min-w-0 flex-1 whitespace-normal break-words" title={option.title ?? option.label}>
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
