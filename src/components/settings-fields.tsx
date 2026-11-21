import { useId } from 'react'
import { Field, FieldGroup, FieldLabel } from '@/components/app-ui/field'
import { Switch } from '@/components/app-ui/switch'
import { ChoiceCombobox } from '@/components/choice-combobox'
import { LanguageCombobox } from '@/components/language-combobox'
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import type { EditableSettingField } from '@/shared/editable-settings-search'
import { getCopy } from '@/shared/i18n'
import type { Locale } from '@/shared/shortcut-types'
import { getUiStyleOptions } from '@/shared/ui-styles'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type SettingsFieldsProps = Pick<ReturnType<typeof useShortcutSettingsForm>, 'settings' | 'updateSettings'> & {
  locale: Locale
  visibleFields?: ReadonlySet<EditableSettingField>
}

export function GeneralSettingsFields({ settings, locale, updateSettings, visibleFields }: SettingsFieldsProps) {
  const copy = getCopy(locale)
  return <FieldGroup>
    {(visibleFields?.has('locale') ?? true) && <Field orientation="horizontal" className="items-center justify-between">
      <FieldLabel className="leading-5">{copy.locale}</FieldLabel>
      <LanguageCombobox autoLabel={copy.localeAuto} className="w-36" size="default" label={copy.locale}
        value={settings.locale} onChange={locale => updateSettings(current => ({ ...current, locale }))} />
    </Field>}
    {(visibleFields?.has('uiStyle') ?? true) && <Field orientation="horizontal" className="items-center justify-between">
      <FieldLabel className="leading-5">{copy.uiStyle}</FieldLabel>
      <ChoiceCombobox className="w-36" size="default" label={copy.uiStyle}
        value={settings.uiStyle} options={getUiStyleOptions(locale, settings.uiStyle)}
        onChange={uiStyle => updateSettings(current => ({ ...current, uiStyle }))} />
    </Field>}
    {(visibleFields?.has('theme') ?? true) && <Field orientation="horizontal" className="items-center justify-between">
      <FieldLabel className="leading-5">{copy.theme}</FieldLabel>
      <ChoiceCombobox className="w-36" size="default" label={copy.theme} value={settings.theme}
        options={[
          { value: 'auto', label: copy.themeAuto },
          { value: 'light', label: copy.themeLight },
          { value: 'dark', label: copy.themeDark },
        ]}
        onChange={theme => updateSettings(current => ({ ...current, theme }))} />
    </Field>}
  </FieldGroup>
}

export function PlaybackPreferenceFields({ settings, locale, updateSettings, visibleFields, showAutomation = true, showPauseScreen = true }: SettingsFieldsProps & {
  showAutomation?: boolean
  showPauseScreen?: boolean
}) {
  const copy = getCopy(locale)
  const id = useId()
  const pauseOverlayId = `${id}-pause-overlay`
  const skipFields = ([['intro', copy.autoSkipIntro], ['recap', copy.autoSkipRecap]] as const)
    .filter(([kind]) => visibleFields?.has(kind) ?? true)
  const showNextEpisode = visibleFields?.has('autoNextEpisode') ?? true

  return <FieldGroup>
    {showAutomation && skipFields.map(([kind, label]) => (
      <Field key={kind} orientation="horizontal" className="items-center justify-between">
        <FieldLabel htmlFor={`${id}-skip-${kind}`} aria-disabled={!settings.enabled}>{label}</FieldLabel>
        <Switch id={`${id}-skip-${kind}`} checked={settings.autoSkip[kind]} disabled={!settings.enabled}
          onCheckedChange={checked => updateSettings(current => ({
            ...current, autoSkip: { ...current.autoSkip, [kind]: checked },
          }))} />
      </Field>
    ))}
    {showAutomation && showNextEpisode && <Field orientation="horizontal" className="items-center justify-between">
      <FieldLabel htmlFor={`${id}-next-episode`} aria-disabled={!settings.enabled}>{copy.autoNextEpisode}</FieldLabel>
      <Switch id={`${id}-next-episode`} checked={settings.autoNextEpisode} disabled={!settings.enabled}
        onCheckedChange={autoNextEpisode => updateSettings(current => ({ ...current, autoNextEpisode }))} />
    </Field>}
    {showPauseScreen && (visibleFields?.has('hidePauseOverlay') ?? true) && <Field orientation="horizontal" className="items-center justify-between">
      <SettingLabelWithTooltip htmlFor={pauseOverlayId} label={copy.hidePauseOverlay}
        tooltip={copy.hidePauseOverlayDescription} infoLabel={copy.infoLabel} />
      <Switch id={pauseOverlayId} checked={settings.hidePauseOverlay} disabled={!settings.enabled}
        onCheckedChange={hidePauseOverlay => updateSettings(current => ({ ...current, hidePauseOverlay }))} />
    </Field>}
  </FieldGroup>
}
