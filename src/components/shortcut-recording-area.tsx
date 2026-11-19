import { useState, type ComponentProps } from 'react'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/app-ui/button'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { cn } from '@/lib/utils'
import type { KeyBinding } from '@/shared/shortcut-types'

type ShortcutRecordingAreaProps = ComponentProps<'div'> & {
  binding?: KeyBinding | null
  placeholder: string
  idlePlaceholder: string
  onClear?: () => void
  clearLabel?: string
}

export function ShortcutRecordingArea({ binding, placeholder, idlePlaceholder, onClear, clearLabel, className, tabIndex = -1, onFocus, onBlur, ...props }: ShortcutRecordingAreaProps) {
  const [focused, setFocused] = useState(false)
  return <div className="relative min-w-0"><div data-slot="shortcut-recording" role="group" tabIndex={tabIndex}
    className={cn('flex min-h-18 min-w-0 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-input bg-[var(--ui-recording-bg)] px-3 py-2 text-center outline-none transition-colors focus:outline-solid focus:outline-2 focus:outline-offset-2 focus:outline-ring aria-invalid:border-destructive aria-invalid:focus:outline-destructive motion-reduce:transition-none', onClear && 'px-12', className)}
    {...props}
    onFocus={event => { setFocused(true); onFocus?.(event) }}
    onBlur={event => { setFocused(false); onBlur?.(event) }}>
    {binding ? <KeyBindingKbd binding={binding} className="flex-wrap justify-center" /> : <span className="text-sm font-normal text-muted-foreground">{focused ? placeholder : idlePlaceholder}</span>}
  </div>{onClear && <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2"
    aria-label={clearLabel} title={clearLabel} disabled={!binding} onClick={onClear}><XIcon /></Button>}</div>
}
