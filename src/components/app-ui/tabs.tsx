import type * as React from 'react'
import * as Upstream from '@/components/ui/tabs'

import { cn } from '@/lib/utils'

function Tabs({ className, ...props }: React.ComponentProps<typeof Upstream.Tabs>) {
  return <Upstream.Tabs {...props} className={cn('flex flex-col gap-4', className)} />
}

function TabsList({ className, ...props }: React.ComponentProps<typeof Upstream.TabsList>) {
  return <Upstream.TabsList {...props} className={cn(
    'grid w-full grid-cols-2 gap-1 group-data-horizontal/tabs:h-auto rounded-[var(--ui-tabs-radius)] border-2 border-border bg-card p-1 shadow-sm',
    className
  )} />
}

function TabsTrigger({ className, onMouseDown, ...props }: React.ComponentProps<typeof Upstream.TabsTrigger>) {
  return <Upstream.TabsTrigger {...props} onMouseDown={event => {
    onMouseDown?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey) return
    const focusedInput = document.activeElement
    // Radix unmounts the panel on mousedown, before native blur can save an input.
    if (focusedInput instanceof HTMLInputElement && focusedInput.closest('[role="tabpanel"]')) {
      focusedInput.blur()
    }
  }} className={cn(
    'inline-flex h-8 items-center justify-center gap-2 rounded-[max(0px,calc(var(--ui-tabs-radius)-var(--ui-border-width)-4px))] border-2 border-transparent px-3 py-0 text-sm font-(weight:--ui-control-weight) text-muted-foreground transition-colors data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-active:border-border data-active:bg-[var(--ui-option-active-bg)] data-active:text-[color:var(--ui-option-active-fg)] data-active:hover:bg-[var(--ui-option-active-bg)] data-active:hover:text-[color:var(--ui-option-active-fg)] group-data-[variant=default]/tabs-list:data-active:shadow-none [&_svg]:size-4 [&_svg]:shrink-0',
    className
  )} />
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof Upstream.TabsContent>) {
  return <Upstream.TabsContent {...props} className={cn(
    'flex flex-col gap-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=inactive]:hidden',
    className
  )} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
