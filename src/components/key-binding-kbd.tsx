import type { ComponentProps } from 'react'

import { Kbd, KbdGroup } from '@/components/app-ui/kbd'
import { cn } from '@/lib/utils'
import {
  formatKeyBinding,
  getKeyBindingLabels,
} from '@/shared/shortcut-bindings'
import type { KeyBinding } from '@/shared/shortcut-types'

type KeyBindingKbdProps = ComponentProps<typeof KbdGroup> & {
  binding: KeyBinding | null
  emptyLabel?: string
  kbdClassName?: string
}

export function KeyBindingKbd({
  binding,
  emptyLabel = '—',
  className,
  kbdClassName,
  ...props
}: KeyBindingKbdProps) {
  if (!binding) return <span className={cn('text-sm text-muted-foreground', className)} {...props}>{emptyLabel}</span>
  const label = formatKeyBinding(binding)

  return (
    <KbdGroup aria-label={label} title={label} className={cn('max-w-full', className)} {...props}>
      {getKeyBindingLabels(binding).map((part, index) => (
        <Kbd key={`${part}-${index}`} className={kbdClassName}>
          {part}
        </Kbd>
      ))}
    </KbdGroup>
  )
}
