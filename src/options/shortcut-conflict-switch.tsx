import { useId, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import type { SHORTCUT_CONFLICT_COPY } from './shortcut-conflict-copy'

type ShortcutConflictSwitchProps = {
  checked: boolean
  disabled: boolean
  label: string
  open: boolean
  title: string
  consequence: string
  transferLabel: string
  copy: (typeof SHORTCUT_CONFLICT_COPY)['en']
  onOpenChange: (open: boolean) => void
  onCheckedChange: (checked: boolean) => void
  onChangeKey: (returnFocus: HTMLButtonElement | null) => void
  onTransfer: () => void
}

export function ShortcutConflictSwitch({ checked, disabled, label, open, title, consequence, transferLabel, copy, onOpenChange, onCheckedChange, onChangeKey, onTransfer }: ShortcutConflictSwitchProps) {
  const id = useId()
  const switchRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(true)
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <Switch ref={switchRef} checked={checked} disabled={disabled} aria-label={label}
          aria-haspopup="dialog" aria-controls={open ? id : undefined}
          onCheckedChange={onCheckedChange} />
      </PopoverAnchor>
      <PopoverContent id={id} side="bottom" align="start" className="w-80 max-w-[calc(100vw-2rem)]"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        onOpenAutoFocus={() => { restoreFocus.current = true }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          if (restoreFocus.current && !switchRef.current?.disabled) switchRef.current?.focus()
        }}>
        <p id={`${id}-title`} className="text-sm font-medium">{title}</p>
        <p id={`${id}-description`} className="text-xs text-muted-foreground">{consequence}</p>
        <div className="flex flex-col gap-1.5">
          <Button variant="outline" className="h-auto min-h-8 justify-start whitespace-normal text-left"
            onClick={() => { restoreFocus.current = false; onChangeKey(switchRef.current) }}>{copy.changeKey}</Button>
          <Button className="h-auto min-h-8 justify-start whitespace-normal text-left" onClick={onTransfer}>{transferLabel}</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
