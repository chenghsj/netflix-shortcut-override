import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useRef, useState, type KeyboardEvent } from 'react'

import { Button } from '@/components/app-ui/button'
import { Input } from '@/components/app-ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
import type { ChoiceComboboxOption } from '@/components/choice-combobox'
import { cn } from '@/lib/utils'
import { matchesSearchText } from '@/shared/search'

export type MultiChoiceComboboxOption = ChoiceComboboxOption<string> & { checked?: boolean }

type MultiChoiceComboboxProps<Option extends MultiChoiceComboboxOption> = {
  value: readonly string[]
  onChange: (value: string[], option: Option) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  options: readonly Option[]
  label: string
  placeholder: string
  selectionLabel: string
  search: { placeholder: string; empty: string }
  createOptions?: (query: string) => readonly Option[]
  disabled?: boolean
  className?: string
}

export function MultiChoiceCombobox<Option extends MultiChoiceComboboxOption>({
  value, onChange, open, onOpenChange, options, label, placeholder, selectionLabel,
  search, createOptions, disabled, className,
}: MultiChoiceComboboxProps<Option>) {
  const [query, setQuery] = useState('')
  const choices = useRef<HTMLDivElement>(null)
  const matches = (option: MultiChoiceComboboxOption) =>
    matchesSearchText([option.value, option.label, option.title ?? '', ...(option.keywords ?? [])], query)
  const matchesInCatalog = options.filter(matches)
  const customOptions = query.trim() && !matchesInCatalog.length ? createOptions?.(query) ?? [] : []
  const visibleOptions = customOptions.length ? customOptions : matchesInCatalog

  const moveFocus = (event: KeyboardEvent, fromSearch = false) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const inputs = Array.from(choices.current?.querySelectorAll<HTMLInputElement>('input:not(:disabled)') ?? [])
    if (!inputs.length) return
    event.preventDefault()
    const current = inputs.indexOf(event.target as HTMLInputElement)
    const next = fromSearch || current < 0
      ? event.key === 'ArrowDown' ? 0 : inputs.length - 1
      : (current + (event.key === 'ArrowDown' ? 1 : -1) + inputs.length) % inputs.length
    inputs[next].focus()
  }

  return (
    <Popover open={open} onOpenChange={next => { setQuery(''); onOpenChange(next) }}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-haspopup="dialog"
          aria-label={label} aria-expanded={open} disabled={disabled}
          className={cn('min-w-28 justify-between pl-3', className)}>
          <span className="min-w-0 flex-1 truncate text-left">{value.length ? selectionLabel : placeholder}</span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={8} aria-label={label}
        className="w-max min-w-[max(10rem,var(--radix-popover-trigger-width))] max-w-(--radix-popover-content-available-width) gap-0 p-0">
        <div className="p-2">
          <Input aria-label={search.placeholder} placeholder={search.placeholder} value={query}
            onChange={event => setQuery(event.target.value)} onKeyDown={event => moveFocus(event, true)} />
        </div>
        <div ref={choices} role="group" aria-label={label} className="max-h-56 overflow-y-auto p-1"
          onKeyDown={event => moveFocus(event)}>
          {!visibleOptions.length && <p role="status" className="px-2 py-4 text-center text-sm text-muted-foreground">{search.empty}</p>}
          {visibleOptions.map(option => {
            const checked = option.checked || value.includes(option.value)
            return <label key={option.value} className={cn(
              'flex min-h-9 items-center gap-2 rounded-[var(--ui-option-radius)] px-2 py-1.5 text-sm',
              option.disabled ? 'cursor-default opacity-50' : 'cursor-pointer hover:bg-[var(--ui-option-active-bg)] hover:text-[color:var(--ui-option-active-fg)] has-focus-visible:bg-[var(--ui-option-active-bg)] has-focus-visible:text-[color:var(--ui-option-active-fg)]',
            )}>
              <span className="relative flex size-4 shrink-0">
                <input type="checkbox" checked={checked} disabled={option.disabled}
                  onChange={() => onChange(value.includes(option.value)
                    ? value.filter(selected => selected !== option.value)
                    : [...value, option.value], option)}
                  className="peer size-4 appearance-none rounded-xs border border-current checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none" />
                <CheckIcon aria-hidden="true" className="pointer-events-none absolute inset-0 size-4 text-primary-foreground opacity-0 peer-checked:opacity-100" />
              </span>
              <span className="min-w-0 flex-1 whitespace-normal break-words" title={option.title}>{option.label}</span>
            </label>
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
