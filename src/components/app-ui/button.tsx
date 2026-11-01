import type * as React from 'react'
import { cva } from 'class-variance-authority'

import { Button as UpstreamButton, buttonVariants as upstreamButtonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const raisedButtonInteraction = cn(
  'hover:shadow-sm focus-visible:shadow-sm',
  'hover:translate-x-0 hover:translate-y-0 focus-visible:translate-x-0 focus-visible:translate-y-0 active:translate-x-0 active:translate-y-0',
  'motion-safe:active:translate-x-[var(--ui-press-x)] motion-safe:active:translate-y-[var(--ui-press-y)] active:shadow-none'
)

const appButtonVariants = cva(
  'shrink-0 border-2 border-transparent bg-clip-padding text-sm font-(weight:--ui-control-weight) transition-[background-color,color,box-shadow,translate] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
  {
    variants: {
      variant: {
        default: ['border-[color:var(--ui-solid-button-border)] shadow-sm hover:bg-primary-hover focus-visible:bg-primary-hover', raisedButtonInteraction],
        outline: ['border-border bg-card text-card-foreground shadow-sm hover:bg-accent focus-visible:bg-accent', raisedButtonInteraction],
        secondary: ['border-[color:var(--ui-solid-button-border)] shadow-sm hover:bg-secondary/80 focus-visible:bg-secondary/80', raisedButtonInteraction],
        destructive: ['border-destructive bg-destructive/10 text-destructive shadow-sm hover:bg-destructive/20 focus-visible:bg-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/40', raisedButtonInteraction],
        ghost: 'focus-visible:bg-accent',
        link: 'text-foreground underline decoration-2 underline-offset-4 hover:bg-accent focus-visible:bg-accent',
      },
      size: {
        default: 'h-8 gap-1.5 px-2.5 py-0 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 px-2 py-0 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 px-2.5 py-0 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 py-0 text-sm has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-8 p-0',
        'icon-xs': "size-6 p-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-7 p-0',
        'icon-lg': 'size-9 p-0',
      },
    },
    compoundVariants: [
      {
        variant: ['default', 'outline', 'secondary', 'destructive'],
        size: ['icon', 'icon-xs', 'icon-sm', 'icon-lg'],
        className: 'shadow-xs hover:shadow-xs focus-visible:shadow-xs motion-safe:active:translate-x-[min(var(--ui-press-x),1px)] motion-safe:active:translate-y-[min(var(--ui-press-y),1px)]',
      },
      { size: ['default', 'lg', 'icon', 'icon-lg'], className: 'rounded-[var(--ui-control-radius)]' },
      { size: ['sm', 'icon-sm'], className: 'rounded-[var(--ui-control-sm-radius)]' },
      { size: ['xs', 'icon-xs'], className: 'rounded-[var(--ui-control-xs-radius)]' },
    ],
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

function buttonVariants(props?: Parameters<typeof appButtonVariants>[0]) {
  return cn(upstreamButtonVariants(props), appButtonVariants(props))
}

function Button({ className, variant = 'default', size = 'default', ...props }: React.ComponentProps<typeof UpstreamButton>) {
  return <UpstreamButton {...props} variant={variant} size={size} className={cn(appButtonVariants({ variant, size }), className)} />
}

export { Button, buttonVariants }
