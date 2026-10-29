import type * as React from 'react'

import * as Upstream from '@/components/ui/alert'
import { cn } from '@/lib/utils'

type AlertProps = Omit<React.ComponentProps<typeof Upstream.Alert>, 'status' | 'variant'> & {
  variant?: Extract<React.ComponentProps<typeof Upstream.Alert>['variant'], 'default' | 'destructive'>
}

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return <Upstream.Alert {...props} variant={variant} className={cn(
    'grid-cols-1 items-center gap-0.5 rounded-lg border-border bg-card px-2.5 py-2 shadow-sm has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 [&>svg]:row-span-1 [&>svg]:size-4 [&>svg]:translate-y-0',
    'has-data-[slot=alert-title]:has-data-[slot=alert-description]:items-start',
    'has-data-[slot=alert-title]:has-data-[slot=alert-description]:[&>svg]:row-span-2',
    'has-data-[slot=alert-title]:has-data-[slot=alert-description]:[&>svg]:translate-y-0.5',
    variant === 'default' && 'text-card-foreground',
    variant === 'destructive' && 'text-destructive *:data-[slot=alert-description]:text-destructive/90',
    className
  )} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<typeof Upstream.AlertTitle>) {
  return <Upstream.AlertTitle {...props} className={cn('col-start-auto min-h-0 text-sm leading-normal tracking-normal font-medium group-has-[>svg]/alert:col-start-2 [&_a]:hover:text-foreground', className)} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<typeof Upstream.AlertDescription>) {
  return <Upstream.AlertDescription {...props} className={cn('col-start-auto block text-balance text-muted-foreground md:text-pretty', className)} />
}

export { AlertAction } from '@/components/ui/alert'
export { Alert, AlertTitle, AlertDescription }
