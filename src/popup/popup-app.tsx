import {
  AlertCircleIcon,
  CircleHelpIcon,
  ExternalLinkIcon,
  GaugeIcon,
  KeyboardIcon,
  SettingsIcon,
  TimerIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { GitHubIcon } from '@/components/github-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { LanguageCombobox } from '@/components/language-combobox'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { getCopy } from '@/shared/i18n'
import {
  SEEK_LIMITS,
  SPEED_LIMITS,
  type ShortcutAction,
} from '@/shared/shortcuts'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type PageStatus = 'watch' | 'netflix' | 'external' | 'unknown'

const POPUP_SHORTCUT_ACTIONS: ShortcutAction[] = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'fullscreen',
  'skipIntro',
  'speedUp',
  'speedDown',
  'speedReset',
]

const popupSpeedInputClassName = 'h-6 w-20 px-2 py-0 text-xs'

const PopupLabelWithTooltip = ({
  htmlFor,
  label,
  tooltip,
  labelClassName,
}: {
  htmlFor: string
  label: string
  tooltip: string
  labelClassName?: string
}) => (
  <div className="flex min-w-0 items-center gap-1.5">
    <label
      htmlFor={htmlFor}
      className={cn('min-w-0 truncate text-xs font-medium', labelClassName)}
    >
      {label}
    </label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`${label} info`}
        >
          <CircleHelpIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-56 whitespace-pre-line leading-relaxed"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </div>
)

const resolvePageStatus = (url: string | undefined): PageStatus => {
  if (!url) return 'unknown'

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isNetflix = host === 'netflix.com' || host.endsWith('.netflix.com')

    if (!isNetflix) return 'external'
    return parsed.pathname.startsWith('/watch') ? 'watch' : 'netflix'
  } catch {
    return 'unknown'
  }
}

const getActivePageStatus = async (): Promise<PageStatus> => {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return 'unknown'

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        resolve('unknown')
        return
      }

      resolve(resolvePageStatus(tabs[0]?.url))
    })
  })
}

const openOptionsPage = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
    return
  }

  window.location.href = '/options.html'
}

export function PopupApp() {
  const {
    settings,
    speedDraft,
    seekDraft,
    loaded,
    saveError,
    updateSettings,
    setSpeedDraftField,
    setSeekDraftSeconds,
    commitSpeedField,
    commitSeekSeconds,
    handleSpeedKeyDown,
    handleSeekKeyDown,
  } = useShortcutSettingsForm()
  const [pageStatus, setPageStatus] = useState<PageStatus>('unknown')
  const copy = getCopy(settings.locale)

  useEffect(() => {
    let active = true

    void getActivePageStatus().then(nextStatus => {
      if (!active) return
      setPageStatus(nextStatus)
    })

    return () => {
      active = false
    }
  }, [])

  const statusText = useMemo(() => {
    if (pageStatus === 'netflix') return copy.popupNetflixPage
    if (pageStatus === 'external') return copy.popupNetflixOnly
    return null
  }, [copy, pageStatus])
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
            <Button variant="outline" size="sm" className="shrink-0" onClick={openOptionsPage}>
              <ExternalLinkIcon data-icon="inline-start" />
              {copy.openOptions}
            </Button>
          </header>

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
                <PopupLabelWithTooltip
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
              <div className="flex items-center justify-between gap-3">
                <PopupLabelWithTooltip
                  htmlFor="popup-show-hints"
                  label={copy.showHints}
                  tooltip={copy.showHintsDesc}
                  labelClassName="text-sm"
                />
                <Switch
                  id="popup-show-hints"
                  checked={settings.showHints}
                  onCheckedChange={showHints =>
                    updateSettings(current => ({ ...current, showHints }))
                  }
                  aria-label={copy.showHints}
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
              return (
                <div
                  key={action}
                  className="flex min-h-7 items-center justify-between gap-3 rounded-md px-1.5"
                >
                  <span
                    className={cn(
                      'min-w-0 truncate text-xs leading-tight',
                      !binding.enabled && 'text-muted-foreground'
                    )}
                    title={copy.actions[action]}
                  >
                    {copy.actions[action]}
                  </span>
                  {binding.enabled ? (
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
              <div className="flex items-center justify-between gap-3">
                <PopupLabelWithTooltip
                  htmlFor="popup-min-speed"
                  label={copy.minSpeed}
                  tooltip={copy.minSpeedTooltip}
                />
                <Input
                  id="popup-min-speed"
                  type="number"
                  min={SPEED_LIMITS.min.min}
                  max={SPEED_LIMITS.min.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedDraft.min}
                  data-speed-field="min"
                  className={popupSpeedInputClassName}
                  onChange={event => setSpeedDraftField('min', event.target.value)}
                  onBlur={() => commitSpeedField('min')}
                  onKeyDown={handleSpeedKeyDown}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <PopupLabelWithTooltip
                  htmlFor="popup-max-speed"
                  label={copy.maxSpeed}
                  tooltip={copy.maxSpeedTooltip}
                />
                <Input
                  id="popup-max-speed"
                  type="number"
                  min={SPEED_LIMITS.max.min}
                  max={SPEED_LIMITS.max.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedDraft.max}
                  data-speed-field="max"
                  className={popupSpeedInputClassName}
                  onChange={event => setSpeedDraftField('max', event.target.value)}
                  onBlur={() => commitSpeedField('max')}
                  onKeyDown={handleSpeedKeyDown}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <PopupLabelWithTooltip
                  htmlFor="popup-speed-step"
                  label={copy.step}
                  tooltip={copy.stepTooltip}
                />
                <Input
                  id="popup-speed-step"
                  type="number"
                  min={SPEED_LIMITS.step.min}
                  max={SPEED_LIMITS.step.max}
                  step={SPEED_LIMITS.step.inputStep}
                  value={speedDraft.step}
                  data-speed-field="step"
                  className={popupSpeedInputClassName}
                  onChange={event => setSpeedDraftField('step', event.target.value)}
                  onBlur={() => commitSpeedField('step')}
                  onKeyDown={handleSpeedKeyDown}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <PopupLabelWithTooltip
                  htmlFor="popup-hold-speed"
                  label={copy.holdSpeed}
                  tooltip={copy.holdSpeedTooltip}
                />
                <Input
                  id="popup-hold-speed"
                  type="number"
                  min={SPEED_LIMITS.hold.min}
                  max={SPEED_LIMITS.hold.max}
                  step={SPEED_LIMITS.hold.inputStep}
                  value={speedDraft.hold}
                  data-speed-field="hold"
                  className={popupSpeedInputClassName}
                  onChange={event => setSpeedDraftField('hold', event.target.value)}
                  onBlur={() => commitSpeedField('hold')}
                  onKeyDown={handleSpeedKeyDown}
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-card p-3 shadow-xs">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <TimerIcon className="size-3.5" />
              {copy.seek}
            </h2>
            <div className="flex items-center justify-between gap-3">
              <PopupLabelWithTooltip
                htmlFor="popup-seek-seconds"
                label={copy.seekSeconds}
                tooltip={copy.seekSecondsTooltip}
              />
              <Input
                id="popup-seek-seconds"
                type="number"
                min={SEEK_LIMITS.seconds.min}
                max={SEEK_LIMITS.seconds.max}
                step={SEEK_LIMITS.seconds.inputStep}
                value={seekDraft.seconds}
                className={popupSpeedInputClassName}
                onChange={event => setSeekDraftSeconds(event.target.value)}
                onBlur={commitSeekSeconds}
                onKeyDown={handleSeekKeyDown}
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
