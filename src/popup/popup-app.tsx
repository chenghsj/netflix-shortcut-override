import {
  ChevronsLeftRightIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  GaugeIcon,
  KeyboardIcon,
  SettingsIcon,
} from 'lucide-react'
import { GitHubIcon } from '@/components/github-icon'
import { HoldSpeedIcon } from '@/components/hold-speed-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { CompatibilityConnectionAlert } from '@/components/compatibility-connection-alert'
import { CompatibilityDiagnosticsDialog } from '@/components/compatibility-diagnostics-dialog'
import { LanguageCombobox } from '@/components/language-combobox'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { ThemeCombobox } from '@/components/theme-combobox'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useCompatibilitySession } from '@/popup/use-compatibility-session'
import { usePopupFocusRestoration } from '@/popup/use-popup-focus-restoration'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { getCopy } from '@/shared/i18n'
import { SEEK_LIMITS, SPACE_HOLD_LIMITS, SPEED_LIMITS } from '@/shared/shortcut-settings'
import type { ShortcutAction } from '@/shared/shortcut-types'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { useTheme } from '@/shared/use-theme'

const POPUP_SHORTCUT_ACTIONS: ShortcutAction[] = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'toggleSubtitles',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'speedUp',
  'speedDown',
  'speedReset',
]

const popupSpeedInputClassName = 'h-6 w-20 px-2 py-0 text-xs'

const openOptionsPage = (beforeNavigate: () => void) => {
  beforeNavigate()
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
    if (getBrowserCapabilities().closesPopupAfterOpeningOptions) window.close()
    return
  }

  window.location.href = '/options.html'
}

export function PopupApp() {
  const {
    settings,
    loaded,
    saveError,
    updateSettings,
    speed: speedForm,
    seek: seekForm,
    spaceHold: spaceHoldForm,
  } = useShortcutSettingsForm()
  const {
    pageStatus,
    isPageLoadingLong,
    resolvePlaybackFocusTarget,
    diagnosticsState,
    diagnosticsTriggerState,
    diagnosticsOpen,
    setDiagnosticsOpen,
    reloadNetflixPage,
  } = useCompatibilitySession()
  const { suppressFocusRestoration } =
    usePopupFocusRestoration(resolvePlaybackFocusTarget)
  const copy = getCopy(resolveLocalePreference(settings.locale))
  const browserCapabilities = getBrowserCapabilities()
  useTheme(settings.theme)

  const statusText =
    pageStatus === 'netflix'
      ? copy.popupNetflixPage
      : pageStatus === 'external'
        ? copy.popupNetflixOnly
        : null
  const shouldShowPageStatus = Boolean(statusText)

  if (!loaded) {
    return <main className="h-40 w-[22rem] bg-background" aria-label="Loading" />
  }

  return (
    <TooltipProvider>
      <main className="w-[22rem] bg-background text-foreground">
        <div className="flex flex-col gap-3 p-3">
          <header className="flex items-center gap-2 px-0.5 py-0.5">
            <img src="/icons/icon48.png" alt="" className="size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold leading-tight">Shortcut Override</h1>
            </div>
            {pageStatus === 'watch' &&
              diagnosticsTriggerState !== 'reload-required' && (
              <CompatibilityDiagnosticsDialog
                copy={copy}
                open={diagnosticsOpen}
                state={diagnosticsState}
                triggerState={diagnosticsTriggerState}
                onOpenChange={setDiagnosticsOpen}
                onReloadPage={reloadNetflixPage}
              />
              )}
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => openOptionsPage(suppressFocusRestoration)}
            >
              <ExternalLinkIcon data-icon="inline-start" />
              {copy.openOptions}
            </Button>
          </header>

          {diagnosticsTriggerState === 'reload-required' && (
            <CompatibilityConnectionAlert copy={copy} onReloadPage={reloadNetflixPage} />
          )}

          {isPageLoadingLong && (
            <section
              className="rounded-lg border bg-card p-3 shadow-xs"
              role="status"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {copy.diagnosticsPageLoadingLong}
                </p>
              </div>
            </section>
          )}

          {shouldShowPageStatus && (
            <section className="rounded-lg border bg-card p-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <p className="text-xs leading-relaxed text-muted-foreground">{statusText}</p>
              </div>
            </section>
          )}

          <section className="rounded-lg border bg-card p-3 shadow-xs">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <SettingsIcon className="size-3.5" />
              {copy.quickSettings}
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{copy.locale}</span>
                <LanguageCombobox
                  autoLabel={copy.localeAuto}
                  className="w-28"
                  label={copy.locale}
                  value={settings.locale}
                  onChange={locale =>
                    updateSettings(current => ({
                      ...current,
                      locale,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 text-sm font-medium">{copy.theme}</span>
                <ThemeCombobox
                  className="w-28"
                  label={copy.theme}
                  labels={{
                    auto: copy.themeAuto,
                    light: copy.themeLight,
                    dark: copy.themeDark,
                  }}
                  value={settings.theme}
                  onChange={theme => updateSettings(current => ({ ...current, theme }))}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <SettingLabelWithTooltip
                  htmlFor="popup-enable-shortcut-override"
                  label={copy.enabled}
                  tooltip={copy.enabledDesc}
                  labelClassName="text-sm"
                />
                <Switch
                  id="popup-enable-shortcut-override"
                  checked={settings.enabled}
                  onCheckedChange={enabled =>
                    updateSettings(current => ({ ...current, enabled }))
                  }
                  aria-label={copy.enabled}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-2.5 shadow-xs">
          <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <KeyboardIcon className="size-3.5" />
            {copy.shortcuts}
          </h2>
          <div className="flex flex-col gap-1">
            {POPUP_SHORTCUT_ACTIONS.map(action => {
              const binding = settings.bindings[action]
              const actionSupported =
                action !== 'pictureInPicture' ||
                browserCapabilities.supportsSubtitlePreservingPip
              return (
                <div
                  key={action}
                  className="flex min-h-7 items-center justify-between gap-3 rounded-md px-1.5"
                >
                  <span
                    className={cn(
                      'min-w-0 truncate text-xs leading-tight',
                      (!binding.enabled || !actionSupported) && 'text-muted-foreground'
                    )}
                    title={actionSupported ? copy.actions[action] : copy.pictureInPictureUnsupported}
                  >
                    {copy.actions[action]}
                  </span>
                  {!actionSupported ? (
                    <Badge
                      variant="secondary"
                      className="max-w-24 justify-start truncate px-1.5 text-xs"
                      title={copy.pictureInPictureUnsupported}
                    >
                      {copy.diagnosticsUnsupportedValue}
                    </Badge>
                  ) : binding.enabled ? (
                    <KeyBindingKbd
                      binding={binding.key}
                      className="max-w-32 shrink-0 justify-end overflow-hidden"
                    />
                  ) : (
                    <Badge
                      variant="secondary"
                      className="max-w-24 justify-start truncate px-1.5 text-xs"
                      title={copy.disabledStatus}
                    >
                      {copy.disabledStatus}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-xs">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <GaugeIcon className="size-3.5" />
              {copy.speed}
            </h2>
            <div className="flex flex-col gap-2">
              <NumericSettingField
                  id="popup-min-speed"
                  label={copy.minSpeed}
                  tooltip={copy.minSpeedTooltip}
                  orientation="horizontal"
                  fieldClassName="items-center justify-between gap-3"
                  labelClassName="min-w-0 truncate text-xs"
                  min={SPEED_LIMITS.min.min}
                  max={SPEED_LIMITS.min.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedForm.draft.min}
                  data-speed-field="min"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => speedForm.setField('min', value)}
                  onBlur={() => speedForm.commitField('min')}
                  onKeyDown={speedForm.handleKeyDown}
              />
              <NumericSettingField
                  id="popup-max-speed"
                  label={copy.maxSpeed}
                  tooltip={copy.maxSpeedTooltip}
                  orientation="horizontal"
                  fieldClassName="items-center justify-between gap-3"
                  labelClassName="min-w-0 truncate text-xs"
                  min={SPEED_LIMITS.max.min}
                  max={SPEED_LIMITS.max.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedForm.draft.max}
                  data-speed-field="max"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => speedForm.setField('max', value)}
                  onBlur={() => speedForm.commitField('max')}
                  onKeyDown={speedForm.handleKeyDown}
              />
              <NumericSettingField
                  id="popup-speed-step"
                  label={copy.step}
                  tooltip={copy.stepTooltip}
                  orientation="horizontal"
                  fieldClassName="items-center justify-between gap-3"
                  labelClassName="min-w-0 truncate text-xs"
                  min={SPEED_LIMITS.step.min}
                  max={SPEED_LIMITS.step.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedForm.draft.step}
                  data-speed-field="step"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => speedForm.setField('step', value)}
                  onBlur={() => speedForm.commitField('step')}
                  onKeyDown={speedForm.handleKeyDown}
              />
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-xs">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <ChevronsLeftRightIcon className="size-3.5" />
              {copy.seek}
            </h2>
            <div className="flex flex-col gap-2">
              <NumericSettingField
                id="popup-seek-seconds"
                label={copy.seekSeconds}
                tooltip={copy.seekSecondsTooltip}
                orientation="horizontal"
                fieldClassName="items-center justify-between gap-3"
                labelClassName="min-w-0 truncate text-xs"
                min={SEEK_LIMITS.seconds.min}
                max={SEEK_LIMITS.seconds.max}
                step={SEEK_LIMITS.seconds.inputStep}
                value={seekForm.draft.seconds}
                inputClassName={popupSpeedInputClassName}
                onValueChange={seekForm.setSeconds}
                onBlur={seekForm.commit}
                onKeyDown={seekForm.handleKeyDown}
              />
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-xs">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <HoldSpeedIcon className="size-3.5" />
              {copy.holdSpeed}
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="popup-enable-space-hold" className="min-w-0 text-xs font-medium">
                  {copy.holdSpeedEnabled}
                </label>
                <Switch
                  id="popup-enable-space-hold"
                  checked={settings.spaceHold.enabled}
                  onCheckedChange={enabled =>
                    updateSettings(current => ({
                      ...current,
                      spaceHold: { ...current.spaceHold, enabled },
                    }))
                  }
                  aria-label={`${copy.holdSpeed}: ${copy.holdSpeedEnabled}`}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label
                  htmlFor="popup-show-space-hold-hint"
                  className="min-w-0 text-xs font-medium"
                >
                  {copy.holdSpeedHint}
                </label>
                <Switch
                  id="popup-show-space-hold-hint"
                  checked={settings.spaceHold.showHint}
                  onCheckedChange={showHint =>
                    updateSettings(current => ({
                      ...current,
                      spaceHold: { ...current.spaceHold, showHint },
                    }))
                  }
                  aria-label={`${copy.holdSpeed}: ${copy.holdSpeedHint}`}
                />
              </div>
              <NumericSettingField
                  id="popup-hold-speed"
                  label={copy.holdSpeedRate}
                  tooltip={copy.holdSpeedTooltip}
                  orientation="horizontal"
                  fieldClassName="items-center justify-between gap-3"
                  labelClassName="min-w-0 truncate text-xs"
                  min={SPACE_HOLD_LIMITS.speed.min}
                  max={SPACE_HOLD_LIMITS.speed.max}
                  step={SPACE_HOLD_LIMITS.speed.inputStep}
                  value={spaceHoldForm.draft.speed}
                  disabled={!settings.spaceHold.enabled}
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={spaceHoldForm.setSpeed}
                  onBlur={spaceHoldForm.commit}
                  onKeyDown={spaceHoldForm.handleKeyDown}
              />
            </div>
          </section>

          <footer className="grid grid-cols-2 gap-2 border-t pt-3">
            <Button variant="outline" size="xs" asChild className="min-w-0">
              <a
                href={EXTERNAL_LINKS.githubRepository}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.githubRepositoryAriaLabel}
                onClick={suppressFocusRestoration}
                onAuxClick={suppressFocusRestoration}
              >
                <GitHubIcon data-icon="inline-start" />
                <span className="min-w-0 truncate">{copy.githubRepository}</span>
              </a>
            </Button>
            <OtherProjectsSelect
              label={copy.otherProjects}
              ariaLabel={copy.otherProjectsAriaLabel}
              streamDanmakuLabel={copy.streamDanmakuStore}
              streamDanmakuTitle={copy.streamDanmakuStoreAriaLabel}
              className="h-6 min-w-0 text-xs has-data-[icon=inline-start]:pl-2"
              labelClassName="text-center"
              onNavigate={suppressFocusRestoration}
            />
            <SettingsSaveStatus
              error={saveError}
              errorLabel={copy.settingsSaveError}
              className="col-span-2"
            />
          </footer>
        </div>
      </main>
    </TooltipProvider>
  )
}
