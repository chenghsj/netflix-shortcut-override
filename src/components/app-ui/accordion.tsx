import type * as React from 'react'
import * as Upstream from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

function AccordionItem({ className, ...props }: React.ComponentProps<typeof Upstream.AccordionItem>) {
  return <Upstream.AccordionItem className={cn('border-border', className)} {...props} />
}

function AccordionTrigger({ className, ...props }: React.ComponentProps<typeof Upstream.AccordionTrigger>) {
  return <Upstream.AccordionTrigger className={cn('rounded-[var(--ui-control-radius)] border-0 px-3 py-4 text-base focus-visible:bg-accent', className)} {...props} />
}

function AccordionContent({ className, children, ...props }: React.ComponentProps<typeof Upstream.AccordionContent>) {
  return <Upstream.AccordionContent {...props}
    className="group/accordion-content data-[state=open]:animate-none data-[state=closed]:animate-none">
    {/* Radix pauses transitions while measuring its content node. Animate a child with intrinsic height. */}
    <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-data-[state=open]/accordion-content:grid-rows-[1fr] motion-reduce:transition-none">
      <div className="min-h-0 overflow-hidden">
        <div className={cn('pb-6', className)}>{children}</div>
      </div>
    </div>
  </Upstream.AccordionContent>
}

export { Accordion } from '@/components/ui/accordion'
export { AccordionItem, AccordionTrigger, AccordionContent }
