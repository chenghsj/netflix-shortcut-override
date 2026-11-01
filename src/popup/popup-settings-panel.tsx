import {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsLeftRightIcon,
  GaugeIcon,
  SettingsIcon,
} from 'lucide-react'
import { HoldSpeedIcon } from '@/components/hold-speed-icon'
import { LanguageCombobox } from '@/components/language-combobox'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { ChoiceCombobox } from '@/components/choice-combobox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/app-ui/collapsible'
import { Button } from '@/components/app-ui/button'
import { Switch } from '@/components/app-ui/switch'
import { getCopy } from '@/shared/i18n'
import { HOLD_SPEED_LIMITS, SEEK_LIMITS, SPEED_LIMITS } from '@/shared/shortcut-settings'
import type { Locale } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { getUiStyleOptions } from '@/shared/ui-styles'

const popupSpeedInputClassName = 'w-24 shrink-0 text-sm'

type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

type PopupSettingsPanelProps = {
  form: Pick<SettingsForm, 'settings' | 'updateSettings' | 'speed' | 'seek' | 'holdSpeed'>
  locale: Locale
  generalSettingsOpen: boolean
  onGeneralSettingsOpenChange: (open: boolean) => void
}

export function PopupSettingsPanel({
  form,
  locale,
  generalSettingsOpen,
  onGeneralSettingsOpenChange,
}: PopupSettingsPanelProps) {
  const { settings, updateSettings, speed: speedForm, seek: seekForm, holdSpeed: holdSpeedForm } = form
  const copy = getCopy(locale)

  return (
    <>
      <Collapsible open={generalSettingsOpen} onOpenChange={onGeneralSettingsOpenChange} asChild>
        <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card shadow-md">
          <h2 className="p-1">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="group/general-settings h-auto w-full justify-between gap-3 rounded-[max(0px,calc(var(--ui-card-radius)-var(--ui-border-width)-0.25rem))] border-0 bg-clip-border p-2 text-left font-heading text-sm font-semibold text-foreground"
              >
                <span className="flex items-center gap-2">
                  <SettingsIcon className="size-5 shrink-0" aria-hidden="true" />
                  {copy.quickSettings}
                </span>
                {generalSettingsOpen
                  ? <ChevronUpIcon className="size-4 text-muted-foreground transition-colors group-hover/general-settings:text-foreground group-focus-visible/general-settings:text-foreground" aria-hidden="true" />
                  : <ChevronDownIcon className="size-4 text-muted-foreground transition-colors group-hover/general-settings:text-foreground group-focus-visible/general-settings:text-foreground" aria-hidden="true" />}
              </Button>
            </CollapsibleTrigger>
          </h2>
          <CollapsibleContent>
            <div className="flex flex-col gap-2 px-3 pb-3">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{copy.locale}</span>
                <LanguageCombobox
                  autoLabel={copy.localeAuto}
                  className="w-36"
                  size="default"
                  label={copy.locale}
                  value={settings.locale}
                  onChange={locale => updateSettings(current => ({ ...current, locale }))}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{copy.uiStyle}</span>
                <ChoiceCombobox
                  className="w-36"
                  size="default"
                  label={copy.uiStyle}
                  value={settings.uiStyle}
                  options={getUiStyleOptions(locale)}
                  onChange={uiStyle => updateSettings(current => ({ ...current, uiStyle }))}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{copy.theme}</span>
                <ChoiceCombobox
                  className="w-36"
                  size="default"
                  label={copy.theme}
                  value={settings.theme}
                  options={[
                    { value: 'auto', label: copy.themeAuto },
                    { value: 'light', label: copy.themeLight },
                    { value: 'dark', label: copy.themeDark },
                  ]}
                  onChange={theme => updateSettings(current => ({ ...current, theme }))}
                />
              </div>
            </div>
          </CollapsibleContent>
        </section>
      </Collapsible>

      <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md">
        <h2 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
          <GaugeIcon className="size-5 shrink-0" />
          {copy.speed}
        </h2>
        <div className="flex flex-col gap-2">
          <NumericSettingField
            id="popup-preferred-speed"
            label={copy.preferredSpeed}
            tooltip={copy.preferredSpeedTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={SPEED_LIMITS.preferred.min}
            max={SPEED_LIMITS.preferred.max}
            step={SPEED_LIMITS.preferred.inputStep}
            value={speedForm.draft.preferred}
            data-speed-field="preferred"
            inputClassName={popupSpeedInputClassName}
            onValueChange={value => speedForm.setField('preferred', value)}
            onBlur={() => speedForm.commitField('preferred')}
            onDragCommit={() => speedForm.commitField('preferred')}
            onKeyDown={speedForm.handleKeyDown}
          />
          <NumericSettingField
            id="popup-min-speed"
            label={copy.minSpeed}
            tooltip={copy.minSpeedTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={SPEED_LIMITS.min.min}
            max={SPEED_LIMITS.min.max}
            step={SPEED_LIMITS.step.inputStep}
            value={speedForm.draft.min}
            data-speed-field="min"
            inputClassName={popupSpeedInputClassName}
            onValueChange={value => speedForm.setField('min', value)}
            onBlur={() => speedForm.commitField('min')}
            onDragCommit={() => speedForm.commitField('min')}
            onKeyDown={speedForm.handleKeyDown}
          />
          <NumericSettingField
            id="popup-max-speed"
            label={copy.maxSpeed}
            tooltip={copy.maxSpeedTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={SPEED_LIMITS.max.min}
            max={SPEED_LIMITS.max.max}
            step={SPEED_LIMITS.step.inputStep}
            value={speedForm.draft.max}
            data-speed-field="max"
            inputClassName={popupSpeedInputClassName}
            onValueChange={value => speedForm.setField('max', value)}
            onBlur={() => speedForm.commitField('max')}
            onDragCommit={() => speedForm.commitField('max')}
            onKeyDown={speedForm.handleKeyDown}
          />
          <NumericSettingField
            id="popup-speed-step"
            label={copy.step}
            tooltip={copy.stepTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={SPEED_LIMITS.step.min}
            max={SPEED_LIMITS.step.max}
            step={SPEED_LIMITS.step.inputStep}
            value={speedForm.draft.step}
            data-speed-field="step"
            inputClassName={popupSpeedInputClassName}
            onValueChange={value => speedForm.setField('step', value)}
            onBlur={() => speedForm.commitField('step')}
            onDragCommit={() => speedForm.commitField('step')}
            onKeyDown={speedForm.handleKeyDown}
          />
        </div>
      </section>

      <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md">
        <h2 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
          <ChevronsLeftRightIcon className="size-5 shrink-0" />
          {copy.seek}
        </h2>
        <div className="flex flex-col gap-2">
          <NumericSettingField
            id="popup-seek-seconds"
            label={copy.seekSeconds}
            tooltip={copy.seekSecondsTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={SEEK_LIMITS.seconds.min}
            max={SEEK_LIMITS.seconds.max}
            step={SEEK_LIMITS.seconds.inputStep}
            value={seekForm.draft.seconds}
            inputClassName={popupSpeedInputClassName}
            onValueChange={seekForm.setSeconds}
            onBlur={seekForm.commit}
            onDragCommit={seekForm.commit}
            onKeyDown={seekForm.handleKeyDown}
          />
        </div>
      </section>

      <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md">
        <h2 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
          <HoldSpeedIcon className="size-5 shrink-0" />
          {copy.holdSpeed}
        </h2>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="popup-enable-hold-speed"
              aria-disabled={holdSpeedForm.enableControlDisabled}
              className="min-w-0 text-sm font-medium"
            >
              {copy.holdSpeedEnabled}
            </label>
            <Switch
              id="popup-enable-hold-speed"
              checked={holdSpeedForm.enabled}
              disabled={holdSpeedForm.enableControlDisabled}
              onCheckedChange={holdSpeedForm.setEnabled}
              aria-label={`${copy.holdSpeed}: ${copy.holdSpeedEnabled}`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="popup-show-hold-speed-hint"
              aria-disabled={holdSpeedForm.detailsDisabled}
              className="min-w-0 text-sm font-medium"
            >
              {copy.holdSpeedHint}
            </label>
            <Switch
              id="popup-show-hold-speed-hint"
              checked={holdSpeedForm.showHint}
              disabled={holdSpeedForm.detailsDisabled}
              onCheckedChange={holdSpeedForm.setShowHint}
              aria-label={`${copy.holdSpeed}: ${copy.holdSpeedHint}`}
            />
          </div>
          <NumericSettingField
            id="popup-hold-speed"
            label={copy.holdSpeedRate}
            tooltip={copy.holdSpeedTooltip}
            orientation="horizontal"
            fieldClassName="items-center justify-between gap-3"
            labelClassName="min-w-0 truncate text-sm"
            min={HOLD_SPEED_LIMITS.speed.min}
            max={HOLD_SPEED_LIMITS.speed.max}
            step={HOLD_SPEED_LIMITS.speed.inputStep}
            value={holdSpeedForm.draft.speed}
            disabled={holdSpeedForm.detailsDisabled}
            inputClassName={popupSpeedInputClassName}
            onValueChange={holdSpeedForm.setSpeed}
            onBlur={holdSpeedForm.commit}
            onDragCommit={holdSpeedForm.commit}
            onKeyDown={holdSpeedForm.handleKeyDown}
          />
        </div>
      </section>
    </>
  )
}
