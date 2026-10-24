import type * as React from 'react'

import * as Upstream from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function TooltipTrigger({ onFocus, ...props }: React.ComponentProps<typeof Upstream.TooltipTrigger>) {
  return <Upstream.TooltipTrigger {...props} onFocus={event => {
    onFocus?.(event)
    if (!event.currentTarget.matches(':focus-visible')) event.preventDefault()
  }} />
}

function TooltipContent({ className, sideOffset = 8, ...props }: React.ComponentProps<typeof Upstream.TooltipContent>) {
  return <Upstream.TooltipContent {...props} sideOffset={sideOffset} className={cn(
    "app-tooltip-content max-w-sm rounded-[8px] border-0 px-3 py-2 text-[13px] leading-5 font-medium shadow-none [&>span>svg]:hidden!",
    className
  )} />
}

export { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
export { TooltipContent, TooltipTrigger }
