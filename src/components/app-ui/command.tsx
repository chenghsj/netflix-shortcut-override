import type * as React from 'react'

import * as Upstream from '@/components/ui/command'
import { cn } from '@/lib/utils'

function Command({ className, ...props }: React.ComponentProps<typeof Upstream.Command>) {
  return <Upstream.Command {...props} className={cn(
    "rounded-[10px] border-0",
    className
  )} />
}

function CommandDialog({ className, ...props }: React.ComponentProps<typeof Upstream.CommandDialog>) {
  return <Upstream.CommandDialog {...props} className={cn(
    "app-dialog-content rounded-lg border-border shadow-lg [&_[data-slot=command]]:rounded-[14px] [&_[data-slot=command]]:border-0",
    className
  )} />
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof Upstream.CommandInput>) {
  return <Upstream.CommandInput {...props} className={cn(
    "app-command-input",
    className
  )} />
}

function CommandItem({ className, ...props }: React.ComponentProps<typeof Upstream.CommandItem>) {
  return <Upstream.CommandItem {...props} className={cn(
    "cursor-pointer outline-hidden data-selected:bg-primary data-selected:text-primary-foreground data-selected:*:[svg]:text-primary-foreground",
    className
  )} />
}

function CommandShortcut({ className, ...props }: React.ComponentProps<typeof Upstream.CommandShortcut>) {
  return <Upstream.CommandShortcut {...props} className={cn(
    "group-data-selected/command-item:text-foreground",
    className
  )} />
}

export { CommandEmpty, CommandGroup, CommandList, CommandSeparator } from '@/components/ui/command'
export { Command, CommandDialog, CommandInput, CommandItem, CommandShortcut }
