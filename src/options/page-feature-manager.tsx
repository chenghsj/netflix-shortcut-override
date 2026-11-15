import { ChevronDownIcon, SlidersHorizontalIcon } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Button } from '@/components/app-ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/app-ui/collapsible'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
import { cn } from '@/lib/utils'
import type { Locale } from '@/shared/shortcut-types'
import { FEATURE_MANAGEMENT_COPY } from '@/shared/feature-management-copy'
import { getCopy } from '@/shared/i18n'

export type ManagedFeatureEntry = {
  id: string
  label: string
  control: ReactNode
  children?: ManagedFeatureEntry[]
}

function FeatureEntry({ entry }: { entry: ManagedFeatureEntry }) {
  const [open, setOpen] = useState(true)
  return <Collapsible open={open} onOpenChange={setOpen} asChild>
    <div role={entry.children ? 'group' : undefined} aria-label={entry.children ? entry.label : undefined}
      data-managed-feature-group={entry.children ? entry.id : undefined}>
      <div data-managed-feature={entry.id} className="flex min-h-11 items-center rounded-sm pr-2 hover:bg-accent">
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 px-2 py-1">
          {entry.control}<span className="min-w-0 text-sm leading-relaxed">{entry.label}</span>
        </label>
        {Boolean(entry.children?.length) && <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={entry.label} className="app-feature-disclosure shrink-0">
            <ChevronDownIcon aria-hidden="true"
              className={cn('size-4 transition-transform motion-reduce:transition-none', !open && '-rotate-90')} />
          </Button>
        </CollapsibleTrigger>}
      </div>
      {entry.children && <CollapsibleContent forceMount className="data-[state=open]:animate-none data-[state=closed]:animate-none">
        <div hidden={!open} className="ml-4 border-l border-border/40 pl-3"><FeatureEntries entries={entry.children} /></div>
      </CollapsibleContent>}
    </div>
  </Collapsible>
}

function FeatureEntries({ entries }: { entries: ManagedFeatureEntry[] }) {
  return entries.map(entry => <FeatureEntry key={entry.id} entry={entry} />)
}

export function PageFeatureManager({ locale, entries, open, onOpenChange, onApply, stale }: {
  locale: Locale
  entries: ManagedFeatureEntry[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: () => void
  stale: boolean
}) {
  const copy = FEATURE_MANAGEMENT_COPY[locale]
  const id = useId()
  return <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger asChild><Button data-feature-manager-trigger variant="ghost" size="icon"
      className="relative after:absolute after:-inset-1.5" aria-label={copy.manage} title={copy.manage}>
      <SlidersHorizontalIcon aria-hidden="true" />
    </Button></PopoverTrigger>
    <PopoverContent align="end" sideOffset={8} collisionPadding={16}
      className="flex max-h-[min(28rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-2rem)] flex-col p-3"
      aria-labelledby={id}
      onFocusOutside={event => {
        // Keep the preview while a key-conflict editor is open above the checklist.
        if (event.target instanceof Element && event.target.closest('[role="dialog"]')) event.preventDefault()
      }}>
      <h3 id={id} className="sr-only">{copy.manage}</h3>
      <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">{copy.description}</p>
      <div role="group" aria-label={copy.manage} className="min-h-0 overflow-y-auto">
        <FeatureEntries entries={entries} />
      </div>
      {stale && <p role="alert" className="text-xs text-destructive">{copy.changed}</p>}
      <div className="flex shrink-0 justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>{getCopy(locale).cancel}</Button>
        <Button onClick={onApply} disabled={stale}>{copy.apply}</Button>
      </div>
    </PopoverContent>
  </Popover>
}
