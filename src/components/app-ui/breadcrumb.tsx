import type * as React from 'react'
import * as Upstream from '@/components/ui/breadcrumb'
import { cn } from '@/lib/utils'

function BreadcrumbList({ className, ...props }: React.ComponentProps<typeof Upstream.BreadcrumbList>) {
  return <Upstream.BreadcrumbList {...props} className={cn('text-sm', className)} />
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<typeof Upstream.BreadcrumbPage>) {
  return <Upstream.BreadcrumbPage {...props} className={cn('font-(weight:--ui-card-title-weight)', className)} />
}

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbEllipsis } from '@/components/ui/breadcrumb'
export { BreadcrumbList, BreadcrumbPage }
