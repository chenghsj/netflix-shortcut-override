import type * as React from 'react'

import * as Upstream from '@/components/ui/input-group'
import { cn } from '@/lib/utils'

function InputGroup({ className, ...props }: React.ComponentProps<typeof Upstream.InputGroup>) {
  return <Upstream.InputGroup {...props} className={cn(
    "border-input bg-card shadow-none has-disabled:bg-muted has-[[data-slot=input-group-control]:focus-visible]:outline-none has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:bg-card dark:has-disabled:bg-muted dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40",
    className
  )} />
}

function InputGroupInput({ className, ...props }: React.ComponentProps<typeof Upstream.InputGroupInput>) {
  return <Upstream.InputGroupInput {...props} className={cn(
    "px-3 py-1 text-base ring-0 focus-visible:ring-0 aria-invalid:ring-0 md:text-sm",
    className
  )} />
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<typeof Upstream.InputGroupTextarea>) {
  return <Upstream.InputGroupTextarea {...props} className={cn(
    "px-3 text-base ring-0 focus-visible:ring-0 aria-invalid:ring-0 md:text-sm",
    className
  )} />
}

export { InputGroupAddon, InputGroupButton, InputGroupText } from '@/components/ui/input-group'
export { InputGroup, InputGroupInput, InputGroupTextarea }
