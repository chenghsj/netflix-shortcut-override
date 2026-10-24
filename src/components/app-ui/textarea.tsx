import type * as React from 'react'

import * as Upstream from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<typeof Upstream.Textarea>) {
  return <Upstream.Textarea {...props} className={cn(
    "border-input bg-card px-3 py-2 text-base focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:bg-muted aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-muted dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
    className
  )} />
}

export { Textarea }
