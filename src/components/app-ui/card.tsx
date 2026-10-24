import type * as React from 'react'

import * as Upstream from '@/components/ui/card'
import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<typeof Upstream.Card>) {
  return <Upstream.Card {...props} className={cn(
    "rounded-lg border-border",
    className
  )} />
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof Upstream.CardHeader>) {
  return <Upstream.CardHeader {...props} className={cn(
    "rounded-t-[max(0px,calc(var(--radius-lg)-2px))]",
    className
  )} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Upstream.CardTitle>) {
  return <Upstream.CardTitle {...props} className={cn(
    "font-heading font-extrabold",
    className
  )} />
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof Upstream.CardFooter>) {
  return <Upstream.CardFooter {...props} className={cn(
    "rounded-b-[max(0px,calc(var(--radius-lg)-2px))] bg-muted",
    className
  )} />
}

export { CardAction, CardDescription, CardContent } from '@/components/ui/card'
export { Card, CardHeader, CardTitle, CardFooter }
