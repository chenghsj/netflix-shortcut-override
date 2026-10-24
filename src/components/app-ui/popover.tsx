import type * as React from 'react'
import { Popover as PopoverPrimitive } from 'radix-ui'

import * as Upstream from '@/components/ui/popover'
import { cn } from '@/lib/utils'

function PopoverContent({ className, ...props }: React.ComponentProps<typeof Upstream.PopoverContent>) {
  return <Upstream.PopoverContent {...props} className={cn(
    "rounded-[12px] border-border",
    className
  )} />
}

export { Popover, PopoverAnchor, PopoverTrigger, PopoverHeader, PopoverTitle, PopoverDescription } from '@/components/ui/popover'
export { PopoverContent }

export function PopoverArrow({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Arrow>) {
  return <PopoverPrimitive.Arrow {...props} className={cn('fill-popover', className)} />
}
