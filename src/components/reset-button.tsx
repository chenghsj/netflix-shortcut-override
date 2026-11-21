import { RotateCcwIcon } from 'lucide-react'
import { useRef, useState, type ComponentProps } from 'react'
import { Button } from '@/components/app-ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
import { getCopy } from '@/shared/i18n'
import { RESET_CONFIRMATION_COPY } from '@/shared/reset-scopes'
import type { Locale } from '@/shared/shortcut-types'

type ResetButtonProps = Omit<ComponentProps<typeof Button>, 'aria-label' | 'size' | 'onClick'> & {
  label: string
  description: string
  locale: Locale
  iconOnly?: boolean
  onClick: () => void
}

export function ResetButton({ locale, label, description, children = label, iconOnly = false, variant = 'outline', disabled, onClick, ...props }: ResetButtonProps) {
  const copy = getCopy(locale)
  const [open, setOpen] = useState(false)
  const cancelButton = useRef<HTMLButtonElement>(null)
  const confirmed = useRef(false)
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button {...props} type="button" aria-label={label} aria-description={description} disabled={disabled} variant={variant} size={iconOnly ? 'icon' : 'default'}>
        <RotateCcwIcon data-icon={iconOnly ? undefined : 'inline-start'} />
        {!iconOnly && children}
      </Button>
    </PopoverTrigger>
    <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={8}
      className="w-48 max-w-[calc(100vw-2rem)]" aria-label={label}
      onOpenAutoFocus={event => {
        event.preventDefault()
        cancelButton.current?.focus()
      }}
      onCloseAutoFocus={() => {
        if (!confirmed.current) return
        confirmed.current = false
        // Return focus before a reset can open a shortcut conflict popover.
        queueMicrotask(onClick)
      }}>
      <p className="text-sm font-medium">{RESET_CONFIRMATION_COPY[locale]}</p>
      <div className="flex justify-end gap-2">
        <Button ref={cancelButton} type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>{copy.cancel}</Button>
        <Button type="button" size="sm" disabled={disabled} onClick={() => {
          confirmed.current = true
          setOpen(false)
        }}>{copy.reset}</Button>
      </div>
    </PopoverContent>
  </Popover>
}
