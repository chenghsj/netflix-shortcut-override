import type * as React from 'react'

import * as Upstream from '@/components/ui/table'
import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<typeof Upstream.Table>) {
  return <Upstream.Table {...props} className={cn(
    "app-table",
    className
  )} />
}

function TableHeader({ className, ...props }: React.ComponentProps<typeof Upstream.TableHeader>) {
  return <Upstream.TableHeader {...props} className={cn(
    "bg-primary text-primary-foreground",
    className
  )} />
}

function TableFooter({ className, ...props }: React.ComponentProps<typeof Upstream.TableFooter>) {
  return <Upstream.TableFooter {...props} className={cn(
    "border-t",
    className
  )} />
}

function TableRow({ className, ...props }: React.ComponentProps<typeof Upstream.TableRow>) {
  return <Upstream.TableRow {...props} className={cn(
    "border-b border-border/20",
    className
  )} />
}

function TableHead({ className, ...props }: React.ComponentProps<typeof Upstream.TableHead>) {
  return <Upstream.TableHead {...props} className={cn(
    "bg-transparent font-bold text-inherit",
    className
  )} />
}

export { TableBody, TableCell, TableCaption } from '@/components/ui/table'
export { Table, TableHeader, TableFooter, TableRow, TableHead }
