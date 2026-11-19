import { useState } from 'react'
import { AlertCircleIcon, BookOpenIcon, CircleDotIcon, Settings2Icon, StarIcon } from 'lucide-react'
import { HELP_UI_COPY } from '@/help/help-copy'
import { GitHubIcon } from '@/components/github-icon'
import { CompatibilityConnectionAlert } from '@/components/compatibility-connection-alert'
import { CompatibilityDiagnosticsDialog } from '@/components/compatibility-diagnostics-dialog'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { Alert, AlertDescription } from '@/components/app-ui/alert'
import { Button } from '@/components/app-ui/button'
import { Switch } from '@/components/app-ui/switch'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/app-ui/tooltip'
import { useCompatibilitySession } from '@/popup/use-compatibility-session'
import { usePopupFocusRestoration } from '@/popup/use-popup-focus-restoration'
import { FEATURE_ANNOUNCEMENT_COPY } from '@/popup/feature-announcement-copy'
import { FeatureAnnouncementCard } from '@/popup/feature-announcement-card'
import { PopupShortcutsPanel } from '@/popup/popup-shortcuts-panel'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'
import { EXTERNAL_LINKS, getShortcutOverrideRatingUrl } from '@/shared/external-links'
import { OPTIONS_PAGE_HASHES, type OptionsLink, type ShortcutCategory } from '@/shared/options-navigation'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { isCompatibilityCoreReady } from '@/shared/diagnostics'
import { getCopy } from '@/shared/i18n'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { useTheme } from '@/shared/use-theme'
import { useUiStyle } from '@/shared/use-ui-style'

const openOptionsPage = (beforeNavigate: () => void, page?: OptionsLink) => {
  beforeNavigate()
  const hash = page ? OPTIONS_PAGE_HASHES[page] : ''
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL && page) {
    void chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${hash}`) })
  } else if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    chrome.runtime.openOptionsPage()
  } else {
    window.location.href = `/options.html${hash}`
    return
  }
  if (getBrowserCapabilities().closesPopupAfterOpeningOptions) window.close()
}

export function PopupApp() {
  const [shortcutCategory, setShortcutCategory] = useState<ShortcutCategory>('playback')
  const [shortcutQuery, setShortcutQuery] = useState('')
  const { settings, loaded, saveError, updateSettings } = useShortcutSettingsForm()
  const {
    pageStatus, isPageLoadingLong, resolvePlaybackFocusTarget, diagnosticsState, diagnosticsTriggerState,
    diagnosticsOpen, setDiagnosticsOpen, reloadNetflixPage,
  } = useCompatibilitySession()
  const { suppressFocusRestoration } = usePopupFocusRestoration(resolvePlaybackFocusTarget)
  const locale = resolveLocalePreference(settings.locale)
  const copy = getCopy(locale)
  const browserCapabilities = getBrowserCapabilities()
  useTheme(settings.theme, loaded)
  useUiStyle(settings.uiStyle, loaded)

  let statusText = pageStatus === 'netflix' ? copy.popupNetflixPage
    : pageStatus === 'external' ? copy.popupNetflixOnly : null
  if (pageStatus === 'watch') {
    if (diagnosticsState.status === 'loading' && !isPageLoadingLong) statusText = copy.diagnosticsChecking
    else if (diagnosticsState.status === 'unavailable') statusText = copy.diagnosticsRetrying
    else if (diagnosticsState.status === 'ready') {
      const coreReady = isCompatibilityCoreReady(diagnosticsState.diagnostics, { requirePageBridge: browserCapabilities.requiresNetflixPageBridge })
      if (!coreReady) statusText = copy.diagnosticsPending
      else if (!diagnosticsState.diagnostics.pipSupported) statusText = copy.diagnosticsWarning
    }
  }

  if (!loaded) return <main className="h-40 w-full bg-background" aria-label="Loading" />

  return <TooltipProvider>
    <main className="popup-shell flex w-full flex-col bg-background text-sm text-foreground">
      <header className="flex shrink-0 flex-col gap-1 border-b border-border px-3 py-3">
        <div className="flex min-h-8 items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img src="/icons/icon48.png" alt="" className="app-brand-icon size-6 shrink-0" />
            <h1 className="min-w-0 flex-1 truncate font-heading text-base font-black leading-tight">Shortcut Override</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Switch id="popup-enable-shortcut-override" checked={settings.enabled}
              onCheckedChange={enabled => updateSettings(current => ({ ...current, enabled }))} aria-label={copy.enabled}
              title={copy.enabledDesc} aria-describedby="popup-enabled-description" />
            <span id="popup-enabled-description" className="sr-only">{copy.enabledDesc}</span>
            {pageStatus === 'watch' && diagnosticsTriggerState !== 'reload-required' && <CompatibilityDiagnosticsDialog
              copy={copy} open={diagnosticsOpen} state={diagnosticsState} triggerState={diagnosticsTriggerState}
              warning={diagnosticsState.status !== 'loading' && Boolean(statusText)}
              onOpenChange={setDiagnosticsOpen} onReloadPage={reloadNetflixPage} />}
            <Button type="button" variant="ghost" size="icon" aria-label={copy.openOptions} title={copy.openOptions}
              onClick={() => openOptionsPage(suppressFocusRestoration)}>
              <Settings2Icon aria-hidden="true" />
            </Button>
          </div>
        </div>
        {statusText && <div className="ml-8">
          <p role="status" className="min-w-0 text-xs leading-relaxed text-muted-foreground">{statusText}</p>
        </div>}
        {diagnosticsTriggerState === 'reload-required' && <CompatibilityConnectionAlert copy={copy} onReloadPage={reloadNetflixPage} />}
        {isPageLoadingLong && <Alert role="status" className="p-3">
          <AlertCircleIcon aria-hidden="true" /><AlertDescription>{copy.diagnosticsPageLoadingLong}</AlertDescription>
        </Alert>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <div className="flex flex-col gap-3">
          <FeatureAnnouncementCard announcement={subtitleNavigationAnnouncement} copy={FEATURE_ANNOUNCEMENT_COPY[locale]}
            onEnable={() => openOptionsPage(suppressFocusRestoration, 'subtitleNavigation')} />
          <PopupShortcutsPanel settings={settings} locale={locale} supportsSubtitlePreservingPip={browserCapabilities.supportsSubtitlePreservingPip}
            category={shortcutCategory} onCategoryChange={setShortcutCategory} query={shortcutQuery} onQueryChange={setShortcutQuery}
            onOpenCategorySettings={category => openOptionsPage(suppressFocusRestoration, category)} />
        </div>
      </div>
      <footer className="flex shrink-0 flex-col gap-2 border-t border-border px-3 py-2">
        <div className="flex items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild><Button variant="outline" size="icon" aria-label={HELP_UI_COPY[locale].title}
              onClick={() => openOptionsPage(suppressFocusRestoration, 'help')}>
              <BookOpenIcon aria-hidden="true" />
            </Button></TooltipTrigger>
            <TooltipContent side="top">{HELP_UI_COPY[locale].title}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="outline" size="icon" asChild>
              <a href={EXTERNAL_LINKS.githubRepository} target="_blank" rel="noreferrer" aria-label={copy.githubRepositoryAriaLabel}
                onClick={suppressFocusRestoration} onAuxClick={suppressFocusRestoration}>
                <GitHubIcon />
              </a>
            </Button></TooltipTrigger>
            <TooltipContent side="top">{copy.githubRepository}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="outline" size="icon" asChild>
              <a href={EXTERNAL_LINKS.githubNewIssue} target="_blank" rel="noreferrer" aria-label={copy.reportIssueAriaLabel}
                onClick={suppressFocusRestoration} onAuxClick={suppressFocusRestoration}>
                <CircleDotIcon aria-hidden="true" />
              </a>
            </Button></TooltipTrigger>
            <TooltipContent side="top">{copy.reportIssue}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild><Button variant="outline" size="icon" asChild>
              <a href={getShortcutOverrideRatingUrl()} target="_blank" rel="noreferrer" aria-label={copy.rateExtensionAriaLabel}
                onClick={suppressFocusRestoration} onAuxClick={suppressFocusRestoration}>
                <StarIcon aria-hidden="true" />
              </a>
            </Button></TooltipTrigger>
            <TooltipContent side="top">{copy.rateExtension}</TooltipContent>
          </Tooltip>
          <OtherProjectsSelect iconOnly label={copy.otherProjects} ariaLabel={copy.otherProjectsAriaLabel}
            streamDanmakuLabel={copy.streamDanmakuStore} streamDanmakuTitle={copy.streamDanmakuStoreAriaLabel}
            className="rounded-[var(--ui-control-radius)]" tooltipSide="top"
            onNavigate={suppressFocusRestoration} />
        </div>
        <SettingsSaveStatus error={saveError} errorLabel={copy.settingsSaveError} />
      </footer>
    </main>
  </TooltipProvider>
}
