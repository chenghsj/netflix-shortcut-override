import type * as React from 'react'

import * as Upstream from '@/components/ui/field'
import { cn } from '@/lib/utils'

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Upstream.FieldLabel>) {
  return <Upstream.FieldLabel {...props} className={cn(
    "has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border",
    className
  )} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<typeof Upstream.FieldDescription>) {
  return <Upstream.FieldDescription {...props} className={cn(
    "[&>a:hover]:bg-accent [&>a:hover]:text-accent-foreground",
    className
  )} />
}

export { Field, FieldSet, FieldLegend, FieldGroup, FieldContent, FieldTitle, FieldSeparator, FieldError } from '@/components/ui/field'
export { FieldLabel, FieldDescription }
