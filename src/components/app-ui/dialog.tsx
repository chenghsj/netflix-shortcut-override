import type * as React from 'react'

import * as Upstream from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

function DialogContent({ className, ...props }: React.ComponentProps<typeof Upstream.DialogContent>) {
  return <Upstream.DialogContent {...props} className={cn(
    "app-dialog-content rounded-lg border-border shadow-lg",
    className
  )} />
}

function DialogOverlay({ className, ...props }: React.ComponentProps<typeof Upstream.DialogOverlay>) {
  return <Upstream.DialogOverlay {...props} className={cn(
    "bg-black/40 supports-backdrop-filter:backdrop-blur-none",
    className
  )} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<typeof Upstream.DialogFooter>) {
  return <Upstream.DialogFooter {...props} className={cn(
    "rounded-b-[max(0px,calc(var(--radius-lg)-2px))] bg-muted",
    className
  )} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof Upstream.DialogTitle>) {
  return <Upstream.DialogTitle {...props} className={cn(
    "font-heading font-extrabold",
    className
  )} />
}

export { Dialog, DialogClose, DialogDescription, DialogHeader, DialogPortal, DialogTrigger } from '@/components/ui/dialog'
export { DialogContent, DialogOverlay, DialogFooter, DialogTitle }
