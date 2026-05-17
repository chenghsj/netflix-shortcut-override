import type { ComponentProps } from 'react'

import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { cn } from '@/lib/utils'
import {
  formatKeyBinding,
  getKeyBindingLabels,
  type KeyBinding,
} from '@/shared/shortcuts'

type KeyBindingKbdProps = ComponentProps<typeof KbdGroup> & {
  binding: KeyBinding
  kbdClassName?: string
}

export function KeyBindingKbd({
  binding,
  className,
  kbdClassName,
  ...props
}: KeyBindingKbdProps) {
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
