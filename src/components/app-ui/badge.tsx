import type * as React from 'react'
import { cva } from 'class-variance-authority'

import { Badge as UpstreamBadge, badgeVariants as upstreamBadgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const appBadgeVariants = cva(
  'rounded-full border-border font-(weight:--ui-strong-weight) focus-visible:outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
  {
    variants: {
      variant: {
        default: 'border-[color:var(--ui-solid-button-border)] [a]:hover:bg-primary-hover',
        secondary: 'border-[color:var(--ui-solid-button-border)]',
        destructive: 'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline: 'border-border',
        ghost: 'border-border shadow-sm',
        link: 'text-foreground underline decoration-2 shadow-sm hover:bg-accent',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function badgeVariants(props?: Parameters<typeof appBadgeVariants>[0]) {
  return cn(upstreamBadgeVariants(props), appBadgeVariants(props))
}

function Badge({ className, variant = 'default', ...props }: React.ComponentProps<typeof UpstreamBadge>) {
  return <UpstreamBadge {...props} variant={variant} className={cn(appBadgeVariants({ variant }), className)} />
}

export { Badge, badgeVariants }
