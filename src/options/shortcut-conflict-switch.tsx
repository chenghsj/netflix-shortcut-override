import { useId, useRef } from 'react'
import { Button } from '@/components/app-ui/button'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/app-ui/popover'
import { Switch } from '@/components/app-ui/switch'
import type { Locale } from '@/shared/shortcut-types'
import type { SHORTCUT_CONFLICT_COPY } from './shortcut-conflict-copy'

type ConflictOwner = { id: string; label: string; href: string; navigate: () => void }

type ShortcutConflictSwitchProps = {
  checked: boolean
  disabled: boolean
  label: string
  locale: Locale
  conflict?: { keys: string; owners: ConflictOwner[]; consequence: string }
  transferDisabled?: boolean
  copy: (typeof SHORTCUT_CONFLICT_COPY)['en']
  onOpenChange: (open: boolean) => void
  onCheckedChange: (checked: boolean) => void
  onChangeKey: (returnFocus: HTMLButtonElement | null) => void
  onTransfer: () => void
}

export function ShortcutConflictSwitch({ checked, disabled, label, locale, conflict, transferDisabled, copy, onOpenChange, onCheckedChange, onChangeKey, onTransfer }: ShortcutConflictSwitchProps) {
  const id = useId()
  const switchRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(true)
  const [titleBefore, titleAfter] = copy.title.replace('{key}', () => conflict?.keys ?? '').split('{actions}')
  const owners = conflict?.owners ?? []
  const ownerNames = conflict ? new Intl.ListFormat(locale, { style: 'short', type: 'conjunction' })
    .formatToParts(owners.map(owner => owner.label)) : []
  let ownerIndex = 0
  return (
    <Popover open={Boolean(conflict)} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <Switch ref={switchRef} checked={checked} disabled={disabled} aria-label={label}
          aria-haspopup="dialog" aria-controls={conflict ? id : undefined}
          onCheckedChange={onCheckedChange} />
      </PopoverAnchor>
      <PopoverContent id={id} side="bottom" align="start" className="max-w-[calc(100vw-2rem)]"
        aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
        onOpenAutoFocus={() => { restoreFocus.current = true }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          if (restoreFocus.current && !switchRef.current?.disabled) switchRef.current?.focus()
        }}>
        <p id={`${id}-title`} className="text-sm font-medium">{titleBefore}{ownerNames.map(part => {
          if (part.type === 'literal') return part.value
          const owner = owners[ownerIndex++]
          return <a key={owner.id} href={owner.href}
            className="rounded-sm underline underline-offset-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
            onClick={event => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              restoreFocus.current = false
              onOpenChange(false)
              owner.navigate()
            }}>{owner.label}</a>
        })}{titleAfter}</p>
        <p id={`${id}-description`} className="text-xs text-muted-foreground">{conflict?.consequence}</p>
        <div className="flex flex-col gap-1.5">
          <Button variant="outline" className="h-auto min-h-8 justify-start whitespace-normal px-3 py-1.5 text-left"
            onClick={() => { restoreFocus.current = false; onChangeKey(switchRef.current) }}>{copy.changeKey}</Button>
          <Button className="h-auto min-h-8 justify-start whitespace-normal px-3 py-1.5 text-left" disabled={transferDisabled} onClick={onTransfer}>
            {copy.transfer}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
