import type * as React from 'react'

import * as Upstream from '@/components/ui/kbd'
import { cn } from '@/lib/utils'

function Kbd({ className, ...props }: React.ComponentProps<typeof Upstream.Kbd>) {
  return <Upstream.Kbd {...props} className={cn(
    "border-border bg-background px-1.5 font-semibold text-foreground shadow-xs",
    className
  )} />
}

export { KbdGroup } from '@/components/ui/kbd'
export { Kbd }
