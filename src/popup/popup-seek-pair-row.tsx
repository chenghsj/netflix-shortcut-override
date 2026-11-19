import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { Badge } from '@/components/app-ui/badge'
import { cn } from '@/lib/utils'
import { getCopy } from '@/shared/i18n'
import { SEEK_PAIR_COPY } from '@/shared/seek-shortcuts'
import type { Locale } from '@/shared/shortcut-types'
import type { PopupShortcutRow } from './shortcut-catalog'

export function PopupSeekPairRow({ seconds, locale, enabled, backward, forward }: {
  seconds: number
  locale: Locale
  enabled: boolean
  backward?: PopupShortcutRow
  forward?: PopupShortcutRow
}) {
  const copy = getCopy(locale)
  const pairCopy = SEEK_PAIR_COPY[locale]
  const inactive = !enabled || ![backward, forward].some(row => row?.enabled)
  return <div role="group" aria-label={pairCopy.group.replace('{value}', String(seconds))}
    className="flex min-h-10 items-center justify-between gap-3 border-b border-border/50 py-2 ps-8 pe-2 transition-colors last:border-b-0 hover:bg-accent">
    <span className={cn('shrink-0 text-sm leading-relaxed', inactive && 'text-muted-foreground')}>{seconds} {pairCopy.unit}</span>
    <div className="grid min-w-0 flex-1 auto-cols-fr grid-flow-col items-center gap-3">
      {[{ row: forward, label: pairCopy.forwardKey }, { row: backward, label: pairCopy.backwardKey }].map(({ row, label }) => row &&
        <div key={row.id} role="group" aria-label={row.label} className="flex min-w-0 flex-wrap items-center justify-end gap-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {!row.enabled ? <Badge variant="secondary" className="rounded-[var(--ui-key-radius)]">{copy.disabledStatus}</Badge>
            : <KeyBindingKbd binding={row.key} additionalKeys={row.additionalKeys} emptyLabel={copy.unassignedShortcut} className="flex-wrap justify-end" />}
        </div>)}
    </div>
  </div>
}
