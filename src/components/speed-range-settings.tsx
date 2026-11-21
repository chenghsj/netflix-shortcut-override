import { useId } from 'react'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/app-ui/card'
import { FieldGroup } from '@/components/app-ui/field'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { ResetButton } from '@/components/reset-button'
import { EDITABLE_SETTINGS_FIELDS } from '@/shared/editable-settings-search'
import { getCopy } from '@/shared/i18n'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { DEFAULT_SETTINGS, SPEED_LIMITS } from '@/shared/shortcut-settings'
import type { Locale } from '@/shared/shortcut-types'
import { SPEED_SHORTCUT_COPY } from '@/shared/speed-shortcut-copy'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

export function SpeedRangeSettings({ locale, form, updateSettings }: {
  locale: Locale
  form: SettingsForm['speed']
  updateSettings: SettingsForm['updateSettings']
}) {
  const copy = getCopy(locale)
  const speedCopy = SPEED_SHORTCUT_COPY[locale]
  const id = useId()
  const fields = EDITABLE_SETTINGS_FIELDS.speedRange
  const labels = { min: copy.minSpeed, max: copy.maxSpeed, step: copy.step }
  const tooltips = { min: copy.minSpeedTooltip, max: copy.maxSpeedTooltip, step: copy.stepTooltip }
  const reset = () => {
    for (const field of fields) form.setField(field, String(DEFAULT_SETTINGS.speed[field]))
    updateSettings(current => ({ ...current, speed: { ...DEFAULT_SETTINGS.speed, preferred: current.speed.preferred } }))
  }

  return <Card role="group" aria-labelledby={`${id}-heading`} aria-describedby={`${id}-description`} size="sm" className="min-w-0">
    <CardHeader>
      <CardTitle id={`${id}-heading`}>{speedCopy.range}</CardTitle>
      <CardDescription id={`${id}-description`}>{speedCopy.rangeDescription}</CardDescription>
      <CardAction>
        <ResetButton locale={locale} onClick={reset} label={copy.resetSpeedSettings} description={RESET_SCOPE_COPY[locale].speedRange}>{copy.reset}</ResetButton>
      </CardAction>
    </CardHeader>
    <CardContent>
      <FieldGroup className="grid gap-4 sm:grid-cols-3">
        {fields.map(field => <NumericSettingField key={field}
          id={`${id}-${field}`} label={labels[field]} tooltip={tooltips[field]} infoLabel={copy.infoLabel}
          min={SPEED_LIMITS[field].min} max={SPEED_LIMITS[field].max} step={SPEED_LIMITS.step.inputStep}
          value={form.draft[field]} data-speed-field={field}
          onValueChange={value => form.setField(field, value)} onBlur={() => form.commitField(field)}
          onDragCommit={() => form.commitField(field)} onKeyDown={form.handleKeyDown} />)}
      </FieldGroup>
    </CardContent>
  </Card>
}
