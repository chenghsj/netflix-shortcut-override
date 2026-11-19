import type * as React from 'react'

import * as Upstream from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const dialogWidths = {
  compact: 'max-w-[22rem] sm:max-w-[22rem]',
  standard: 'max-w-md sm:max-w-md',
  wide: 'max-w-lg sm:max-w-lg',
} as const

type DialogContentProps = React.ComponentProps<typeof Upstream.DialogContent> & {
  size?: keyof typeof dialogWidths
}

function DialogContent({ size = 'standard', className, ...props }: DialogContentProps) {
  return <Upstream.DialogContent {...props} data-size={size} className={cn(
    'app-dialog-content max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[var(--ui-dialog-radius)] border-border shadow-lg',
    dialogWidths[size],
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
    "rounded-b-[max(0px,calc(var(--ui-dialog-radius)-var(--ui-border-width)))] bg-[var(--ui-dialog-footer-bg)]",
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
