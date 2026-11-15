import { ResetButton } from '@/components/reset-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/app-ui/button'
import { TableCell, TableHead, TableHeader, TableRow } from '@/components/app-ui/table'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { getCopy } from '@/shared/i18n'
import type { ShortcutTarget } from '@/shared/shortcut-routing'
import type { Locale, PreferredSpeedShortcutAction, ShortcutAction, ShortcutSettings } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { SPEED_SHORTCUT_COPY } from './speed-shortcut-copy'
import type { useShortcutEditor } from './use-shortcut-editor'
import { ShortcutTableGroup } from './shortcut-table-group'

export function PreferredSpeedShortcutSettings({ settings, locale, editor, updateSettings, conflictSwitch, isVisible, open, onOpenChange, collapsible }: {
  settings: ShortcutSettings
  locale: Locale
  editor: ReturnType<typeof useShortcutEditor>
  updateSettings: ReturnType<typeof useShortcutSettingsForm>['updateSettings']
  conflictSwitch: (target: ShortcutTarget, disabled: boolean) => ReactNode
  isVisible: (action: ShortcutAction) => boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  collapsible: boolean
}) {
  const copy = getCopy(locale)
  const speedCopy = SPEED_SHORTCUT_COPY[locale]
  const rows = [{ id: 'setPreferredSpeed' as const, speed: settings.speed.preferred }, ...settings.preferredSpeedShortcuts]
  const visible = rows.filter(shortcut => isVisible(shortcut.id))
  if (!visible.length) return null
  return <ShortcutTableGroup label={copy.preferredSpeed} open={open} onOpenChange={onOpenChange} collapsible={collapsible}
    columns={[30, 35, 15, 20]} controls={expand => <Button variant="outline" aria-label={speedCopy.add} onClick={event => {
      expand()
      editor.addPreferredSpeed(event.currentTarget)
    }}><PlusIcon data-icon="inline-start" />{speedCopy.addButton}</Button>}
    tableHeader={<TableHeader><TableRow className="hover:bg-transparent">
      <TableHead>{speedCopy.rate}</TableHead><TableHead>{copy.key}</TableHead>
      <TableHead>{copy.status}</TableHead><TableHead className="text-right">{copy.columnActions}</TableHead>
    </TableRow></TableHeader>}>
    {visible.map(shortcut => {
    const builtin = shortcut.id === 'setPreferredSpeed'
    const label = `${copy.actions.setPreferredSpeed}${builtin ? '' : ` · ${shortcut.speed}×`}`
    const target = { group: 'general' as const, action: shortcut.id }
    const binding = settings.bindings[shortcut.id]
    return <TableRow key={shortcut.id} aria-label={`${copy.actions.setPreferredSpeed} · ${shortcut.speed}×`}>
      <TableCell className="tabular-nums">{shortcut.speed}×</TableCell>
      <TableCell><KeyBindingKbd binding={binding.key} emptyLabel={copy.unassignedShortcut} className="flex-wrap" /></TableCell>
      <TableCell>{conflictSwitch(target, false)}</TableCell>
      <TableCell><div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={`${copy.edit} ${label}`} onClick={event => editor.edit(target, event.currentTarget)}><PencilIcon /></Button>
        {builtin ? <ResetButton locale={locale} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground" label={`${copy.reset} ${label}`} description={RESET_SCOPE_COPY[locale].preferredSpeed} onClick={() => editor.resetBinding(target)} />
          : <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={SPEED_SHORTCUT_COPY[locale].remove.replace('{speed}', `${shortcut.speed}×`)} onClick={() => updateSettings(current => {
            const bindings = { ...current.bindings }
            delete bindings[shortcut.id as PreferredSpeedShortcutAction]
            return { ...current, bindings, preferredSpeedShortcuts: current.preferredSpeedShortcuts.filter(item => item.id !== shortcut.id) }
          })}><Trash2Icon /></Button>}
      </div></TableCell>
    </TableRow>
    })}
  </ShortcutTableGroup>
}
