import { ChevronDownIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/app-ui/collapsible'
import { cn } from '@/lib/utils'

export function PopupShortcutGroup({ label, open, onOpenChange, disabled = false, labelClassName, value, children }: {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled?: boolean
  labelClassName?: string
  value?: ReactNode
  children: ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} asChild>
      <section role="group" aria-label={label}
        className="border-b border-border/50 last:border-b-0">
        <h3 className={cn('app-popup-section-title text-sm', open && 'border-b border-border/50')}>
          <CollapsibleTrigger asChild>
            <button type="button" aria-label={label} disabled={disabled}
              className="flex min-h-10 w-full items-center justify-between gap-3 px-2 py-2 text-left font-normal transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={cn('min-w-0 leading-relaxed', labelClassName)}>{label}</span>
                <ChevronDownIcon aria-hidden="true" className={cn('size-3.5 shrink-0 text-muted-foreground', !open && '-rotate-90')} />
              </span>
              {value}
            </button>
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent forceMount className="data-[state=open]:animate-none data-[state=closed]:animate-none">
          <div hidden={!open}>{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
