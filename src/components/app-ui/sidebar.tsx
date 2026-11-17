import type * as React from 'react'
import * as Upstream from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

function SidebarMenuButton({ className, ...props }: React.ComponentProps<typeof Upstream.SidebarMenuButton>) {
  return <Upstream.SidebarMenuButton {...props} className={cn(
    'h-auto min-h-8 rounded-[var(--ui-control-radius)] border-0 px-3 py-1.5 font-normal hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:hover:bg-sidebar-accent data-[active=true]:hover:text-sidebar-accent-foreground [&>span:last-child]:whitespace-normal [&>span:last-child]:text-clip',
    className,
  )} />
}

export { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
export { SidebarMenuButton }
