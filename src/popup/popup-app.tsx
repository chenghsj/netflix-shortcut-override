import {
  ChevronsLeftRightIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  GaugeIcon,
  KeyboardIcon,
  SettingsIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { GitHubIcon } from '@/components/github-icon'
import { HoldSpeedIcon } from '@/components/hold-speed-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { CompatibilityConnectionAlert } from '@/components/compatibility-connection-alert'
import type { CompatibilityDiagnosticsState } from '@/components/compatibility-diagnostics-card'
import {
  CompatibilityDiagnosticsDialog,
  type CompatibilityDiagnosticsTriggerState,
} from '@/components/compatibility-diagnostics-dialog'
import { LanguageCombobox } from '@/components/language-combobox'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import {
  COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE,
  isCompatibilityCoreReady,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'
import { getCopy } from '@/shared/i18n'
import {
  SEEK_LIMITS,
  SPACE_HOLD_LIMITS,
  SPEED_LIMITS,
  type ShortcutAction,
} from '@/shared/shortcuts'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type PageStatus = 'watch' | 'netflix' | 'external' | 'unknown'
type ActivePageContext = {
  status: PageStatus
  tabId?: number
}

const POPUP_SHORTCUT_ACTIONS: ShortcutAction[] = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'speedUp',
  'speedDown',
  'speedReset',
]

const popupSpeedInputClassName = 'h-6 w-20 px-2 py-0 text-xs'
const DIAGNOSTICS_REFRESH_INTERVAL_MS = 2_000
const MISSING_RECEIVER_RETRY_INTERVAL_MS = 200
const MISSING_RECEIVER_MAX_ATTEMPTS = 3
const MISSING_MESSAGE_RECEIVER_PATTERN =
  /could not establish connection|receiving end does not exist/i

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

const getActivePageContext = async (): Promise<ActivePageContext> => {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return { status: 'unknown' }

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unknown' })
        return
      }

      resolve({
        status: resolvePageStatus(tabs[0]?.url),
        tabId: tabs[0]?.id,
      })
    })
  })
}

const getCompatibilityDiagnostics = async (
  tabId: number
): Promise<CompatibilityDiagnosticsState> =>
  new Promise(resolve => {
    chrome.tabs.sendMessage(
      tabId,
      { type: COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE },
      response => {
        const errorMessage = chrome.runtime.lastError?.message
        if (errorMessage && MISSING_MESSAGE_RECEIVER_PATTERN.test(errorMessage)) {
          resolve({ status: 'reload-required', diagnostics: null })
          return
        }
        if (errorMessage || !response) {
          resolve({ status: 'unavailable', diagnostics: null })
          return
        }
        resolve({
          status: 'ready',
          diagnostics: response as CompatibilityDiagnostics,
        })
      }
    )
  })

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
    spaceHoldDraft,
    loaded,
    saveError,
    updateSettings,
    setSpeedDraftField,
    setSeekDraftSeconds,
    setSpaceHoldDraftSpeed,
    commitSpeedField,
    commitSeekSeconds,
    commitSpaceHoldSpeed,
    handleSpeedKeyDown,
    handleSeekKeyDown,
    handleSpaceHoldKeyDown,
  } = useShortcutSettingsForm()
  const [pageContext, setPageContext] = useState<ActivePageContext>({ status: 'unknown' })
  const [diagnosticsState, setDiagnosticsState] = useState<CompatibilityDiagnosticsState>({
    status: 'loading',
    diagnostics: null,
  })
  const [diagnosticsTriggerState, setDiagnosticsTriggerState] =
    useState<CompatibilityDiagnosticsTriggerState>('checking')
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const copy = getCopy(settings.locale)

  useEffect(() => {
    let active = true

    void getActivePageContext().then(nextContext => {
      if (!active) return
      setPageContext(nextContext)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (pageContext.status !== 'watch' || typeof pageContext.tabId !== 'number') return

    let active = true
    let retryTimer: number | undefined
    let attempt = 0
    const tabId = pageContext.tabId

    const checkDiagnosticsConnection = async () => {
      attempt += 1
      const nextState = await getCompatibilityDiagnostics(tabId)
      if (!active) return

      if (
        nextState.status === 'reload-required' &&
        attempt < MISSING_RECEIVER_MAX_ATTEMPTS
      ) {
        retryTimer = window.setTimeout(
          () => void checkDiagnosticsConnection(),
          MISSING_RECEIVER_RETRY_INTERVAL_MS
        )
        return
      }

      setDiagnosticsState(nextState)
      setDiagnosticsTriggerState(
        nextState.status === 'reload-required' ? 'reload-required' : 'default'
      )
    }

    void checkDiagnosticsConnection()

    return () => {
      active = false
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [pageContext.status, pageContext.tabId])

  useEffect(() => {
    if (
      !diagnosticsOpen ||
      pageContext.status !== 'watch' ||
      typeof pageContext.tabId !== 'number'
    ) {
      return
    }

    let active = true
    let refreshTimer: number | undefined
    let hasDiagnosticsResult = false
    const tabId = pageContext.tabId

    const refreshDiagnostics = async () => {
      if (!hasDiagnosticsResult) {
        setDiagnosticsState({ status: 'loading', diagnostics: null })
      }
      const nextState = await getCompatibilityDiagnostics(tabId)
      if (!active) return
      hasDiagnosticsResult = true
      setDiagnosticsState(nextState)
      setDiagnosticsTriggerState(
        nextState.status === 'reload-required' ? 'reload-required' : 'default'
      )
      if (
        nextState.status !== 'reload-required' &&
        !isCompatibilityCoreReady(nextState.diagnostics)
      ) {
        refreshTimer = window.setTimeout(refreshDiagnostics, DIAGNOSTICS_REFRESH_INTERVAL_MS)
      }
    }

    void refreshDiagnostics()

    return () => {
      active = false
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
    }
  }, [diagnosticsOpen, pageContext.status, pageContext.tabId])

  const statusText = useMemo(() => {
    if (pageContext.status === 'netflix') return copy.popupNetflixPage
    if (pageContext.status === 'external') return copy.popupNetflixOnly
    return null
  }, [copy, pageContext.status])
  const shouldShowPageStatus = Boolean(statusText)
  const reloadNetflixPage = () => {
    if (typeof pageContext.tabId === 'number' && chrome.tabs?.reload) {
      void chrome.tabs.reload(pageContext.tabId)
      window.close()
    }
    setDiagnosticsTriggerState('checking')
    setDiagnosticsOpen(false)
  }

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
            {pageContext.status === 'watch' &&
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
            <Button variant="outline" size="sm" className="shrink-0" onClick={openOptionsPage}>
              <ExternalLinkIcon data-icon="inline-start" />
              {copy.openOptions}
            </Button>
          </header>

          {diagnosticsTriggerState === 'reload-required' && (
            <CompatibilityConnectionAlert copy={copy} onReloadPage={reloadNetflixPage} />
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
                  value={speedDraft.min}
                  data-speed-field="min"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => setSpeedDraftField('min', value)}
                  onBlur={() => commitSpeedField('min')}
                  onKeyDown={handleSpeedKeyDown}
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
                  value={speedDraft.max}
                  data-speed-field="max"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => setSpeedDraftField('max', value)}
                  onBlur={() => commitSpeedField('max')}
                  onKeyDown={handleSpeedKeyDown}
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
                  value={speedDraft.step}
                  data-speed-field="step"
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={value => setSpeedDraftField('step', value)}
                  onBlur={() => commitSpeedField('step')}
                  onKeyDown={handleSpeedKeyDown}
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
                value={seekDraft.seconds}
                inputClassName={popupSpeedInputClassName}
                onValueChange={setSeekDraftSeconds}
                onBlur={commitSeekSeconds}
                onKeyDown={handleSeekKeyDown}
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
                  value={spaceHoldDraft.speed}
                  disabled={!settings.spaceHold.enabled}
                  inputClassName={popupSpeedInputClassName}
                  onValueChange={setSpaceHoldDraftSpeed}
                  onBlur={commitSpaceHoldSpeed}
                  onKeyDown={handleSpaceHoldKeyDown}
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
