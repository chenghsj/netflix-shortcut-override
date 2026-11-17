import type * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDownIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function Accordion({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" className={cn('flex w-full flex-col', className)} {...props} />
}

function AccordionItem({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={cn('not-last:border-b', className)} {...props} />
}

function AccordionTrigger({ className, children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger data-slot="accordion-trigger"
      className={cn('group/accordion-trigger relative flex min-h-11 flex-1 items-center justify-between gap-3 rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-colors outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50', className)} {...props}>
      {children}
      <ChevronDownIcon aria-hidden="true" data-slot="accordion-trigger-icon"
        className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-aria-expanded/accordion-trigger:rotate-180 motion-reduce:transition-none" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
}

function AccordionContent({ className, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content data-slot="accordion-content"
    className={cn('overflow-hidden text-sm data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up', className)} {...props} />
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
