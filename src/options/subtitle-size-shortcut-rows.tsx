import { ResetButton } from '@/components/reset-button'
import { DeleteButton } from '@/components/delete-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { PencilIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { Button } from '@/components/app-ui/button'
import { TableCell } from '@/components/app-ui/table'
import { getCopy } from '@/shared/i18n'
import { type ShortcutTarget } from '@/shared/shortcut-routing'
import { DEFAULT_SUBTITLE_SIZE_CYCLE, formatSubtitleSizes, getSubtitleSizeShortcutLabel, SUBTITLE_SIZE_COPY } from '@/shared/subtitle-size-shortcuts'
import type { Locale, ShortcutAction, ShortcutSettings, SubtitleSizeShortcutAction } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { ShortcutRow } from './shortcut-table-group'
import type { useSubtitleSizeEditor } from './use-subtitle-size-editor'

export function SubtitleSizeShortcutRows({ settings, locale, editor, updateSettings, conflictSwitch, isVisible = () => true }: {
  settings: ShortcutSettings; locale: Locale
  editor: ReturnType<typeof useSubtitleSizeEditor>
  updateSettings: ReturnType<typeof useShortcutSettingsForm>['updateSettings']
  conflictSwitch: (target: ShortcutTarget, disabled: boolean) => ReactNode
  isVisible?: (action: ShortcutAction) => boolean
}) {
  const copy = getCopy(locale), sizeCopy = SUBTITLE_SIZE_COPY[locale]
  const rows = [{ id: 'cycleSubtitleSize' as const, kind: 'cycle' as const, sizes: settings.subtitleSizeCycle }, ...settings.subtitleSizeShortcuts]
  return <>
    {rows.filter(shortcut => isVisible(shortcut.id)).map(shortcut => {
      const builtin = shortcut.id === 'cycleSubtitleSize'
      const label = builtin ? copy.actions.cycleSubtitleSize : getSubtitleSizeShortcutLabel(shortcut, locale)
      const binding = settings.bindings[shortcut.id]
      const target = { group: 'general' as const, action: shortcut.id }
      return <ShortcutRow key={shortcut.id} target={target} aria-label={label}>
        <TableCell className="whitespace-normal"><span className="font-medium">{label}</span>
          {builtin && <span className="mt-1 block text-xs text-muted-foreground">{formatSubtitleSizes(shortcut.sizes)}</span>}
        </TableCell>
        <TableCell><KeyBindingKbd binding={binding.key} additionalKeys={binding.additionalKeys} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
        </TableCell>
        <TableCell>{conflictSwitch(target, false)}</TableCell>
        <TableCell><div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={`${copy.edit} ${label}`} onClick={event => editor.open(shortcut.id, event.currentTarget)}><PencilIcon /></Button>
          {builtin ? <ResetButton locale={locale} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground" label={RESET_SCOPE_COPY[locale].subtitleSizeCycleLabel} description={RESET_SCOPE_COPY[locale].subtitleSizeCycle} onClick={() => updateSettings(current => ({ ...current, subtitleSizeCycle: [...DEFAULT_SUBTITLE_SIZE_CYCLE] }))} />
            : <DeleteButton locale={locale} className="text-muted-foreground focus-visible:text-foreground" label={sizeCopy.remove.replace('{action}', label)} onClick={() => updateSettings(current => {
              const bindings = { ...current.bindings }
              delete bindings[shortcut.id as SubtitleSizeShortcutAction]
              return { ...current, bindings, subtitleSizeShortcuts: current.subtitleSizeShortcuts.filter(item => item.id !== shortcut.id) }
            })} />}
        </div></TableCell>
      </ShortcutRow>
    })}
  </>
}
