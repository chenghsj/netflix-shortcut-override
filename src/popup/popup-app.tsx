import { useState } from 'react'
import { AlertCircleIcon, KeyboardIcon, SettingsIcon, Settings2Icon, StarIcon } from 'lucide-react'
import { GitHubIcon } from '@/components/github-icon'
import { CompatibilityConnectionAlert } from '@/components/compatibility-connection-alert'
import { CompatibilityDiagnosticsDialog } from '@/components/compatibility-diagnostics-dialog'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { Button } from '@/components/app-ui/button'
import { Card, CardContent } from '@/components/app-ui/card'
import { Switch } from '@/components/app-ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/app-ui/tabs'
import { TooltipProvider } from '@/components/app-ui/tooltip'
import { useCompatibilitySession } from '@/popup/use-compatibility-session'
import { usePopupFocusRestoration } from '@/popup/use-popup-focus-restoration'
import { FEATURE_ANNOUNCEMENT_COPY } from '@/popup/feature-announcement-copy'
import { FeatureAnnouncementCard } from '@/popup/feature-announcement-card'
import { PopupSettingsPanel } from '@/popup/popup-settings-panel'
import { PopupShortcutsPanel } from '@/popup/popup-shortcuts-panel'
import { SUBTITLE_OPTIONS_HASH, subtitleNavigationAnnouncement } from '@/shared/feature-announcements'
import { EXTERNAL_LINKS, getShortcutOverrideRatingUrl } from '@/shared/external-links'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { getCopy } from '@/shared/i18n'
import { useSubtitleActivation } from '@/shared/use-subtitle-activation'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { useTheme } from '@/shared/use-theme'
import { useUiStyle } from '@/shared/use-ui-style'

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
  const [generalSettingsOpen, setGeneralSettingsOpen] = useState(false)
  const form = useShortcutSettingsForm()
  const { settings, loaded, saveError, updateSettings } = form
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
  const locale = resolveLocalePreference(settings.locale)
  const copy = getCopy(locale)
  const announcementCopy = FEATURE_ANNOUNCEMENT_COPY[locale]
  const openSubtitleOptions = () => {
    suppressFocusRestoration()
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      void chrome.tabs.create({ url: chrome.runtime.getURL(`options.html${SUBTITLE_OPTIONS_HASH}`) })
      if (getBrowserCapabilities().closesPopupAfterOpeningOptions) window.close()
      return
    }
    window.location.href = `/options.html${SUBTITLE_OPTIONS_HASH}`
  }
  const subtitleActivation = useSubtitleActivation({ settings, updateSettings })
  const browserCapabilities = getBrowserCapabilities()
  useTheme(settings.theme)
  useUiStyle(settings.uiStyle)

  const statusText =
    pageStatus === 'netflix'
      ? copy.popupNetflixPage
      : pageStatus === 'external'
        ? copy.popupNetflixOnly
        : null

  if (!loaded) {
    return <main className="h-40 w-full bg-background" aria-label="Loading" />
  }

  return (
    <TooltipProvider>
      <main className="w-full bg-background text-sm text-foreground">
        <div className="flex flex-col gap-3 p-3">
          <header className="flex items-center gap-2 border-b-2 border-border pb-2">
            <img src="/icons/icon48.png" alt="" className="app-brand-icon ml-1 size-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-heading text-base font-black leading-tight">Shortcut Override</h1>
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
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 bg-clip-border"
              aria-label={copy.openOptions}
              title={copy.openOptions}
              onClick={() => openOptionsPage(suppressFocusRestoration)}
            >
              <Settings2Icon aria-hidden="true" />
            </Button>
          </header>

          <Card size="sm" className="relative">
            <CardContent className="flex min-h-6 items-center justify-between gap-3">
              <SettingLabelWithTooltip
                htmlFor="popup-enable-shortcut-override"
                label={copy.enabled}
                tooltip={copy.enabledDesc}
                className="[&_button]:relative [&_button]:z-10"
                labelClassName="text-sm after:absolute after:inset-0 after:cursor-pointer"
              />
              <Switch
                id="popup-enable-shortcut-override"
                className="z-10"
                checked={settings.enabled}
                onCheckedChange={subtitleActivation.setGlobalEnabled}
                aria-label={copy.enabled}
              />
            </CardContent>
          </Card>

          <FeatureAnnouncementCard announcement={subtitleNavigationAnnouncement} copy={announcementCopy} onEnable={openSubtitleOptions} />

          {diagnosticsTriggerState === 'reload-required' && (
            <CompatibilityConnectionAlert copy={copy} onReloadPage={reloadNetflixPage} />
          )}

          {isPageLoadingLong && (
            <section
              className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md"
              role="status"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground dark:text-card-foreground" />
                <p className="text-sm leading-relaxed text-muted-foreground dark:text-card-foreground">
                  {copy.diagnosticsPageLoadingLong}
                </p>
              </div>
            </section>
          )}

          <Tabs defaultValue="shortcuts" className="gap-3">
            <TabsList aria-label={copy.appTitle}>
              <TabsTrigger value="shortcuts">
                <KeyboardIcon aria-hidden="true" />
                {copy.shortcuts}
              </TabsTrigger>
              <TabsTrigger value="settings">
                <SettingsIcon aria-hidden="true" />
                {copy.popupSettings}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="shortcuts" className="gap-3">
              <PopupShortcutsPanel
                settings={settings}
                locale={locale}
                supportsSubtitlePreservingPip={browserCapabilities.supportsSubtitlePreservingPip}
                activation={subtitleActivation}
                statusText={statusText}
              />
            </TabsContent>
            <TabsContent value="settings" className="gap-3">
              <PopupSettingsPanel
                form={form}
                locale={locale}
                generalSettingsOpen={generalSettingsOpen}
                onGeneralSettingsOpenChange={setGeneralSettingsOpen}
              />
            </TabsContent>
          </Tabs>

          <footer className="grid grid-cols-2 gap-2 border-t-2 border-border pt-2">
            <Button variant="outline" asChild className="min-w-0">
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
              size="default"
              className="min-w-0 has-data-[icon=inline-start]:pl-2"
              labelClassName="text-center"
              onNavigate={suppressFocusRestoration}
            />
            <Button variant="outline" asChild className="col-span-2 min-w-0">
              <a
                href={getShortcutOverrideRatingUrl()}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.rateExtensionAriaLabel}
                onClick={suppressFocusRestoration}
                onAuxClick={suppressFocusRestoration}
              >
                <StarIcon data-icon="inline-start" aria-hidden="true" />
                <span className="min-w-0 truncate">{copy.rateExtension}</span>
              </a>
            </Button>
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
