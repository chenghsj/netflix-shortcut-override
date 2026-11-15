import { CheckIcon, MinusIcon } from 'lucide-react'
import { Checkbox } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function FeatureCheckbox({ className, ...props }: ComponentProps<typeof Checkbox.Root>) {
  const Icon = props.checked === 'indeterminate' ? MinusIcon : CheckIcon
  return <Checkbox.Root {...props} className={cn('relative inline-flex size-5 shrink-0 items-center justify-center rounded border-2 border-border bg-background text-primary-foreground after:absolute after:-inset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary disabled:cursor-not-allowed disabled:opacity-50', className)}>
    <Checkbox.Indicator><Icon aria-hidden="true" className="size-4" /></Checkbox.Indicator>
  </Checkbox.Root>
}
