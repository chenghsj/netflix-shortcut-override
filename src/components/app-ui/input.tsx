import type * as React from 'react'

import * as Upstream from '@/components/ui/input'
import { cn } from '@/lib/utils'

function Input({ className, ...props }: React.ComponentProps<typeof Upstream.Input>) {
  return <Upstream.Input {...props} className={cn(
    "rounded-[8px] border-input bg-card px-3 py-1 text-base focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-muted dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    className
  )} />
}

export { Input }
