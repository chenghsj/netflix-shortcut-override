import { ResetButton } from '@/components/reset-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { PencilIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { Button } from '@/components/app-ui/button'
import { Alert, AlertTitle } from '@/components/app-ui/alert'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/app-ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/app-ui/dialog'
import { FieldGroup } from '@/components/app-ui/field'
import { Switch } from '@/components/app-ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/app-ui/table'
import { getCopy } from '@/shared/i18n'
import { DEFAULT_SETTINGS, HOLD_SPEED_LIMITS, normalizeHoldSpeedSettings, SPEED_LIMITS } from '@/shared/shortcut-settings'
import type { Locale, ShortcutSettings } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { SPEED_SHORTCUT_COPY } from './speed-shortcut-copy'

type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

export function SpeedRangeSettings({ locale, form, updateSettings }: {
  locale: Locale
  form: SettingsForm['speed']
  updateSettings: SettingsForm['updateSettings']
}) {
  const copy = getCopy(locale)
  const speedCopy = SPEED_SHORTCUT_COPY[locale]
  const reset = () => {
    for (const field of ['min', 'max', 'step'] as const) form.setField(field, String(DEFAULT_SETTINGS.speed[field]))
    updateSettings(current => ({ ...current, speed: { ...DEFAULT_SETTINGS.speed, preferred: current.speed.preferred } }))
  }
  return <Card role="group" aria-labelledby="speed-range-heading" aria-describedby="speed-range-description" size="sm" className="min-w-0">
    <CardHeader>
      <CardTitle id="speed-range-heading">{speedCopy.range}</CardTitle>
      <CardDescription id="speed-range-description">{speedCopy.rangeDescription}</CardDescription>
      <CardAction>
        <ResetButton locale={locale} onClick={reset} label={copy.resetSpeedSettings} description={RESET_SCOPE_COPY[locale].speedRange}>{copy.reset}</ResetButton>
      </CardAction>
    </CardHeader>
    <CardContent>
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        {(['min', 'max', 'step'] as const).map(field => <NumericSettingField key={field}
          id={`${field}-speed`} label={field === 'min' ? copy.minSpeed : field === 'max' ? copy.maxSpeed : copy.step}
          tooltip={field === 'min' ? copy.minSpeedTooltip : field === 'max' ? copy.maxSpeedTooltip : copy.stepTooltip}
          infoLabel={copy.infoLabel}
          min={SPEED_LIMITS[field].min} max={SPEED_LIMITS[field].max} step={SPEED_LIMITS.step.inputStep}
          value={form.draft[field]} data-speed-field={field}
          onValueChange={value => form.setField(field, value)} onBlur={() => form.commitField(field)}
          onDragCommit={() => form.commitField(field)} onKeyDown={form.handleKeyDown} />)}
      </FieldGroup>
    </CardContent>
  </Card>
}

export function HoldSpeedShortcutSettings({ locale, settings, form, updateSettings, id, open }: {
  locale: Locale
  settings: ShortcutSettings
  form: SettingsForm['holdSpeed']
  updateSettings: SettingsForm['updateSettings']
  id: string
  open: boolean
}) {
  const copy = getCopy(locale)
  const speedCopy = SPEED_SHORTCUT_COPY[locale]
  const firstInput = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState<{
    speed: string
    savedSpeed: number
  } | null>(null)
  const stale = Boolean(draft && draft.savedSpeed !== settings.holdSpeed.speed)
  const valid = Boolean(draft?.speed.trim() && Number.isFinite(Number(draft.speed)))
  const normalizeDraft = () => setDraft(current => {
    if (!current) return current
    const value = current.speed.trim() && Number.isFinite(Number(current.speed)) ? Number(current.speed) : current.savedSpeed
    return { ...current, speed: String(normalizeHoldSpeedSettings({ ...settings.holdSpeed, speed: value }).speed) }
  })
  const save = () => {
    if (!draft || !valid || stale || form.detailsDisabled) return
    updateSettings(current => {
      if (!current.bindings.playPause.enabled || !current.holdSpeed.enabled ||
        current.holdSpeed.speed !== draft.savedSpeed) return current
      return { ...current, holdSpeed: normalizeHoldSpeedSettings({ ...current.holdSpeed, speed: Number(draft.speed) }) }
    })
    setDraft(null)
  }
  return <Dialog open={Boolean(draft)} onOpenChange={next => setDraft(next
    ? { speed: String(settings.holdSpeed.speed), savedSpeed: settings.holdSpeed.speed }
    : null)}>
    <TableRow id={id} hidden={!open} role="presentation" className="hover:bg-transparent has-aria-expanded:bg-transparent">
      <TableCell colSpan={4} className="p-0 whitespace-normal">
        <Table aria-label={copy.holdSpeed} className="table-fixed" data-nested="true">
          <colgroup><col className="w-[40%]" /><col className="w-[30%]" /><col className="w-[15%]" /><col className="w-[15%]" /></colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead scope="col" className="ps-8">{copy.holdSpeedRate}</TableHead>
              <TableHead scope="col">{speedCopy.hint}</TableHead>
              <TableHead scope="col">{copy.status}</TableHead>
              <TableHead scope="col" className="text-right">{copy.columnActions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow aria-label={copy.holdSpeed}>
              <TableCell className="ps-8 tabular-nums">{settings.holdSpeed.speed}×</TableCell>
              <TableCell>
                <Switch id="show-hold-speed-hint" checked={form.showHint} disabled={form.detailsDisabled}
                  onCheckedChange={form.setShowHint} aria-label={`${copy.holdSpeed}: ${copy.holdSpeedHint}`} />
              </TableCell>
              <TableCell>
                <Switch id="enable-hold-speed" checked={form.enabled} disabled={form.enableControlDisabled}
                  onCheckedChange={form.setEnabled} aria-label={`${copy.holdSpeed}: ${copy.holdSpeedEnabled}`} />
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-2">
                  <DialogTrigger asChild><Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" disabled={form.detailsDisabled} aria-label={`${copy.edit} ${copy.holdSpeed}`}><PencilIcon /></Button></DialogTrigger>
                  <ResetButton locale={locale} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground" onClick={form.reset} label={`${copy.reset} ${copy.holdSpeed}`} description={RESET_SCOPE_COPY[locale].holdSpeed} />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableCell>
    </TableRow>
    <DialogContent size="compact" onOpenAutoFocus={event => { event.preventDefault(); firstInput.current?.focus() }}>
      <DialogHeader><DialogTitle>{copy.holdSpeed}</DialogTitle><DialogDescription>{copy.holdSpeedDesc}</DialogDescription></DialogHeader>
      <FieldGroup>
        <NumericSettingField ref={firstInput} id="hold-speed" label={copy.holdSpeedRate} tooltip={copy.holdSpeedTooltip}
          infoLabel={copy.infoLabel}
          min={HOLD_SPEED_LIMITS.speed.min} max={HOLD_SPEED_LIMITS.speed.max} step={HOLD_SPEED_LIMITS.speed.inputStep}
          value={draft?.speed ?? ''} disabled={form.detailsDisabled} onValueChange={speed => setDraft(current => current && { ...current, speed })}
          onBlur={normalizeDraft} onDragCommit={normalizeDraft} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
      </FieldGroup>
      {stale && <Alert variant="destructive"><AlertTitle>{speedCopy.holdChanged}</AlertTitle></Alert>}
      <DialogFooter>
        <DialogClose asChild><Button variant="outline">{copy.cancel}</Button></DialogClose>
        <Button onClick={save} disabled={!valid || stale || form.detailsDisabled}>{copy.save}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
