import type * as React from 'react'

import * as Upstream from '@/components/ui/switch'
import { cn } from '@/lib/utils'

function Switch({ className, ...props }: React.ComponentProps<typeof Upstream.Switch>) {
  return <Upstream.Switch {...props} className={cn(
    "app-switch rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-unchecked:bg-muted",
    className
  )} />
}

export { Switch }
