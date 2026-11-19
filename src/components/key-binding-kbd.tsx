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
  additionalKeys?: readonly KeyBinding[]
  emptyLabel?: string
  kbdClassName?: string
}

export function KeyBindingKbd({
  binding,
  additionalKeys = [],
  emptyLabel = '—',
  className,
  kbdClassName,
  ...props
}: KeyBindingKbdProps) {
  if (additionalKeys.length) return <span className={cn('inline-flex min-w-0 flex-col items-start gap-1', className)} {...props}>
    {[binding, ...additionalKeys].filter((key): key is KeyBinding => Boolean(key)).map((key, index) =>
      <KeyBindingKbd key={index} binding={key} emptyLabel={emptyLabel} kbdClassName={kbdClassName} className={className} />)}
  </span>
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
