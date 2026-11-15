import { Slot } from 'radix-ui'
import type { ReactElement } from 'react'

export function DragHandle({ children }: { children: ReactElement }) {
  return <Slot.Root data-slot="drag-handle"
    className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded bg-transparent text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing">
    {children}
  </Slot.Root>
}
