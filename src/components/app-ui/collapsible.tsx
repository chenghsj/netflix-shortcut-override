import type * as React from 'react'

import * as Upstream from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof Upstream.CollapsibleContent>) {
  return <Upstream.CollapsibleContent {...props} className={cn(
    'motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',
    className
  )} />
}

export { Collapsible, CollapsibleTrigger } from '@/components/ui/collapsible'
export { CollapsibleContent }
