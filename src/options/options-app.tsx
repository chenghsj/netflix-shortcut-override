import { DEFAULT_PRACTICE_BINDINGS, SUBTITLE_PERMISSION_COPY, SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'
import {
  CaptionsIcon,
  ChevronsLeftRightIcon,
  CircleHelpIcon,
  GaugeIcon,
  KeyboardIcon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  SettingsIcon,
  StarIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps } from 'react'

import { GitHubIcon } from '@/components/github-icon'
import { HoldSpeedIcon } from '@/components/hold-speed-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { LanguageCombobox } from '@/components/language-combobox'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingsTransferCard } from '@/options/settings-transfer-card'
import { SHORTCUT_CONFLICT_COPY } from '@/options/shortcut-conflict-copy'
import { ShortcutConflictSwitch } from '@/options/shortcut-conflict-switch'
import { SUBTITLE_ACTIVATION_COPY } from '@/options/subtitle-activation-copy'
import { SUBTITLE_NAVIGATION_POPUP_COPY } from '@/popup/subtitle-navigation-copy'
import { useSubtitleActivation } from '@/options/use-subtitle-activation'
import { useShortcutEditor, type ShortcutTarget } from '@/options/use-shortcut-editor'
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { Label } from '@/components/app-ui/label'
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from '@/components/app-ui/popover'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { ChoiceCombobox } from '@/components/choice-combobox'
import { Alert, AlertTitle } from '@/components/app-ui/alert'
import { Badge } from '@/components/app-ui/badge'
import { Button } from '@/components/app-ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/app-ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/app-ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/app-ui/field'
import { Separator } from '@/components/app-ui/separator'
import { Switch } from '@/components/app-ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/app-ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/app-ui/table'
import { cn } from '@/lib/utils'
import { getCopy } from '@/shared/i18n'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import {
  formatKeyBinding,
  getReplacedNetflixNativeKeyBindings,
  keyBindingFromEvent,
  keyBindingsEqual,
} from '@/shared/shortcut-bindings'
import {
  HOLD_SPEED_LIMITS,
  SEEK_LIMITS,
  SPEED_LIMITS,
} from '@/shared/shortcut-settings'
import {
  SUBTITLE_PRACTICE_ACTIONS,
  SHORTCUT_ACTIONS,
  type KeyBinding,
  type ShortcutAction,
} from '@/shared/shortcut-types'
import { subscribeSettings } from '@/shared/storage'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { EXTERNAL_LINKS, getShortcutOverrideRatingUrl } from '@/shared/external-links'
import { useTheme } from '@/shared/use-theme'
import { SUBTITLE_OPTIONS_HASH } from '@/shared/feature-announcements'

function ShortcutTableHeader({ labels }: {
  labels: { action: string; key: string; status: string; columnActions: string }
}) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-[45%]">{labels.action}</TableHead>
        <TableHead className="w-[20%]">{labels.key}</TableHead>
        <TableHead className="w-[15%]">{labels.status}</TableHead>
        <TableHead className="w-[20%] text-right">{labels.columnActions}</TableHead>
      </TableRow>
    </TableHeader>
  )
}

const ignoredRecordKeys = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

type NetflixNativeKeyReplacementProps = ComponentProps<'p'> & {
  bindings: readonly KeyBinding[]
  template: string
}

function NetflixNativeKeyReplacement({
  bindings,
  template,
  className,
  ...props
}: NetflixNativeKeyReplacementProps) {
  if (bindings.length === 0) return null

  return (
    <p className={cn('text-xs whitespace-normal text-muted-foreground', className)} {...props}>
      {template.replace(
        '{keys}',
        bindings.map(binding => formatKeyBinding(binding)).join(' · ')
      )}
    </p>
  )
}

export function OptionsApp() {
  const {
    settings,
    loaded,
    saveError,
    updateSettings,
    replaceSettings,
    resetShortcutBindings,
    speed: speedForm,
    seek: seekForm,
    holdSpeed: holdSpeedForm,
  } = useShortcutSettingsForm()
  const subtitleSection = useRef<HTMLDivElement>(null)
  const globalEnableSwitch = useRef<HTMLButtonElement>(null)
  const subtitleActivationAnchor = useRef<HTMLDivElement>(null)
  const [subtitleGuideRequested, setSubtitleGuideRequested] = useState(() => window.location.hash === SUBTITLE_OPTIONS_HASH)
  useEffect(() => {
    const updateGuide = () => setSubtitleGuideRequested(window.location.hash === SUBTITLE_OPTIONS_HASH)
    window.addEventListener('hashchange', updateGuide)
    return () => window.removeEventListener('hashchange', updateGuide)
  }, [])
  useEffect(() => {
    if (!loaded) return
    const navigate = () => {
      if (window.location.hash !== SUBTITLE_OPTIONS_HASH) return
      subtitleSection.current?.focus({ preventScroll: true })
      subtitleSection.current?.scrollIntoView({ block: 'start' })
    }
    navigate()
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [loaded])
  const subtitleActivation = useSubtitleActivation({ settings, updateSettings })
  const { pending: subtitlePermissionPending, error: subtitlePermissionError } = subtitleActivation
  useEffect(() => subscribeSettings(next => {
    if (next.subtitlePractice.enabled) setSubtitleGuideRequested(false)
  }), [])
  const resolvedLocale = resolveLocalePreference(settings.locale)
  const practiceCopy = SUBTITLE_PRACTICE_COPY[resolvedLocale]
  const subtitlePopupCopy = SUBTITLE_NAVIGATION_POPUP_COPY[resolvedLocale]
  const subtitleNavigationEnabled = settings.enabled && settings.subtitlePractice.enabled
  const activationCopy = SUBTITLE_ACTIVATION_COPY[resolvedLocale]
  const showSubtitleGuide = subtitleGuideRequested && !settings.subtitlePractice.enabled
  const copy = getCopy(resolvedLocale)
  const browserCapabilities = getBrowserCapabilities()
  const conflictCopy = SHORTCUT_CONFLICT_COPY[resolvedLocale]
  const ignoredGeneralActions: readonly ShortcutAction[] = browserCapabilities.supportsSubtitlePreservingPip ? [] : ['pictureInPicture']
  useTheme(settings.theme)

  const editor = useShortcutEditor({ settings, updateSettings, ignoredGeneralActions })
  const { recorder, conflict } = editor
  const actionLabels = { ...copy.actions, ...practiceCopy }
  const conflictNames = new Intl.ListFormat(resolvedLocale, { style: 'short', type: 'conjunction' }).format(conflict?.actions.map(action => actionLabels[action]) ?? [])
  const conflictSwitch = (target: ShortcutTarget, disabled: boolean) => {
    const binding = target.group === 'practice' ? settings.subtitlePractice.bindings[target.action] : settings.bindings[target.action]
    const open = Boolean(conflict?.group === target.group && conflict.action === target.action && conflict.actions.length)
    return <ShortcutConflictSwitch checked={binding.enabled && (target.group === 'practice' || !disabled)} disabled={disabled}
      label={`${actionLabels[target.action]} ${copy.status}`} open={open} copy={conflictCopy}
      title={conflictCopy.title.replace('{key}', formatKeyBinding(conflict?.key ?? binding.key)).replace('{actions}', conflictNames)}
      consequence={conflictCopy.consequence.replace('{actions}', conflictNames)}
      transferLabel={conflictCopy.transfer.replace('{action}', actionLabels[target.action])}
      onOpenChange={next => { if (!next) editor.dismissConflict() }}
      onCheckedChange={enabled => editor.setBindingEnabled(target, enabled)}
      onChangeKey={editor.changeConflictKey}
      onTransfer={editor.confirmTransfer} />
  }

  if (!loaded) return null

  const subtitleEnableGuidance = <>
    {practiceCopy.requiresEnabled}{' '}
    <a href="#enable-shortcut-override"
      className="inline-block rounded-sm text-foreground underline underline-offset-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      onClick={event => {
        event.preventDefault()
        setSubtitleGuideRequested(false)
        globalEnableSwitch.current?.scrollIntoView({ block: 'center' })
        globalEnableSwitch.current?.focus({ preventScroll: true })
      }}>
      {practiceCopy.goToGeneralSettings}
    </a>
  </>

  return (
    <TooltipProvider>
      <main className="min-h-svh bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-2 py-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4 pl-2">
                <img src="/icons/icon48.png" alt="" className="size-12 shrink-0 dark:hidden" />
                <img src="/icons/icon-dark48.png" alt="" className="hidden size-12 shrink-0 dark:block" />
                <h1 className="font-heading text-2xl font-black leading-tight tracking-tight">
                  {copy.appTitle}
                </h1>
              </div>
              <nav className="flex flex-wrap items-center gap-2 self-end pr-2 sm:self-auto">
                <Button variant="outline" asChild>
                  <a
                    href={EXTERNAL_LINKS.githubRepository}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={copy.githubRepositoryAriaLabel}
                  >
                    <GitHubIcon data-icon="inline-start" aria-hidden="true" />
                    {copy.githubRepository}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href={getShortcutOverrideRatingUrl()}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={copy.rateExtensionAriaLabel}
                  >
                    <StarIcon data-icon="inline-start" aria-hidden="true" />
                    {copy.rateExtension}
                  </a>
                </Button>
                <OtherProjectsSelect
                  size="default"
                  label={copy.otherProjects}
                  ariaLabel={copy.otherProjectsAriaLabel}
                  streamDanmakuLabel={copy.streamDanmakuStore}
                  streamDanmakuTitle={copy.streamDanmakuStoreAriaLabel}
                />
              </nav>
            </div>
            <SettingsSaveStatus
              error={saveError}
              errorLabel={copy.settingsSaveError}
            />
          </header>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex min-w-0 flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon data-icon="inline-start" />
                    {copy.quickSettings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabel>{copy.locale}</FieldLabel>
                      <LanguageCombobox
                        autoLabel={copy.localeAuto}
                        className="w-36"
                        label={copy.locale}
                        size="default"
                        value={settings.locale}
                        onChange={locale => updateSettings(current => ({ ...current, locale }))}
                      />
                    </Field>
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabel>{copy.theme}</FieldLabel>
                      <ChoiceCombobox
                        className="w-36"
                        label={copy.theme}
                        size="default"
                        value={settings.theme}
                        options={[
                          { value: 'auto', label: copy.themeAuto },
                          { value: 'light', label: copy.themeLight },
                          { value: 'dark', label: copy.themeDark },
                        ]}
                        onChange={theme => updateSettings(current => ({ ...current, theme }))}
                      />
                    </Field>
                    <Field orientation="horizontal" className="items-center justify-between">
                      <SettingLabelWithTooltip
                        htmlFor="enable-shortcut-override"
                        label={copy.enabled}
                        tooltip={copy.enabledDesc}
                      />
                      <Switch
                        ref={globalEnableSwitch}
                        id="enable-shortcut-override"
                        className="focus:ring-3 focus:ring-ring/50 focus:ring-offset-2 focus:ring-offset-card"
                        checked={settings.enabled}
                        onCheckedChange={subtitleActivation.setGlobalEnabled}
                        aria-label={copy.enabled}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <KeyboardIcon data-icon="inline-start" />
                    {copy.shortcuts}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button variant="outline" aria-label={copy.resetAll} onClick={resetShortcutBindings}>
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[36rem] table-fixed">
                      <ShortcutTableHeader labels={copy} />
                    <TableBody>
                      {SHORTCUT_ACTIONS.map(action => {
                        const binding = settings.bindings[action]
                        const replacedNetflixKeys = getReplacedNetflixNativeKeyBindings(
                          action,
                          binding
                        )
                        const actionSupported =
                          action !== 'pictureInPicture' ||
                          browserCapabilities.supportsSubtitlePreservingPip
                        const overridingSubtitleAction = subtitleNavigationEnabled && binding.enabled && actionSupported
                          ? SUBTITLE_PRACTICE_ACTIONS.find(subtitleAction => {
                              const subtitleBinding = settings.subtitlePractice.bindings[subtitleAction]
                              return subtitleBinding.enabled && keyBindingsEqual(subtitleBinding.key, binding.key)
                            })
                          : undefined
                        const overrideDescription = overridingSubtitleAction
                          ? subtitlePopupCopy.overriddenBy.replace('{action}', practiceCopy[overridingSubtitleAction])
                          : undefined
                        return (
                          <TableRow key={action}>
                            <TableCell className="font-medium whitespace-normal">
                              <div className="flex items-center gap-1.5">
                                <span>{copy.actions[action]}</span>
                                {action === 'pictureInPicture' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        aria-label={`${copy.actions[action]} info`}
                                      >
                                        <CircleHelpIcon className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      sideOffset={8}
                                      className="max-w-80 whitespace-pre-line"
                                    >
                                      {actionSupported
                                        ? copy.pictureInPictureTooltip
                                        : copy.pictureInPictureUnsupported}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col items-start gap-1">
                                <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                                  <KeyBindingKbd binding={binding.key} className={cn('flex-wrap', overridingSubtitleAction && 'opacity-60')} />
                                  {overridingSubtitleAction && (
                                    <Badge
                                      variant="secondary"
                                      className="h-auto min-h-5 max-w-full rounded px-1.5 text-xs whitespace-normal shadow-xs"
                                      title={overrideDescription}
                                      aria-label={overrideDescription}
                                    >
                                      {subtitlePopupCopy.overridden}
                                    </Badge>
                                  )}
                                </div>
                                <NetflixNativeKeyReplacement
                                  bindings={replacedNetflixKeys}
                                  template={copy.replacedNetflixKeys}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              {conflictSwitch({ group: 'general', action }, !actionSupported)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground focus-visible:text-foreground"
                                  disabled={!actionSupported}
                                  onClick={() => editor.edit({ group: 'general', action })}
                                  aria-label={`${copy.edit} ${copy.actions[action]}`}
                                >
                                  <PencilIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground focus-visible:text-foreground"
                                  disabled={!actionSupported}
                                  onClick={() => editor.resetBinding({ group: 'general', action })}
                                  aria-label={`${copy.reset} ${copy.actions[action]}`}
                                >
                                  <RotateCcwIcon />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card id="subtitle-navigation" ref={subtitleSection} tabIndex={-1}
                className="scroll-mt-6 focus-visible:outline-2 focus-visible:outline-ring">
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className={cn("flex items-center gap-1.5", !settings.enabled && "text-muted-foreground")}>
                    <CaptionsIcon data-icon="inline-start" aria-hidden="true" />
                    <span>{practiceCopy.title}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button"
                          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={`${practiceCopy.title} info`}>
                          <CircleHelpIcon className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8} className="max-w-80">
                        <div className="space-y-2 whitespace-normal">
                          {practiceCopy.description.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                  <CardAction className="row-span-1 flex items-center gap-3 self-center">
                    <Popover open={showSubtitleGuide} onOpenChange={setSubtitleGuideRequested}>
                      <PopoverAnchor asChild>
                        <div ref={subtitleActivationAnchor} className="flex min-w-0 items-center gap-2">
                          <Label htmlFor="subtitle-navigation-enabled" className="text-muted-foreground">{activationCopy.enableLabel}</Label>
                          <Switch id="subtitle-navigation-enabled" disabled={!settings.enabled || subtitlePermissionPending} checked={settings.subtitlePractice.enabled} aria-label={practiceCopy.enabled}
                            aria-busy={subtitlePermissionPending} aria-describedby={[showSubtitleGuide && 'subtitle-activation-guide', subtitlePermissionError && 'subtitle-permission-error'].filter(Boolean).join(' ') || undefined}
                            onCheckedChange={enabled => {
                              if (!enabled) setSubtitleGuideRequested(false)
                              subtitleActivation.setEnabled(enabled)
                            }} />
                        </div>
                      </PopoverAnchor>
                      <PopoverContent side="bottom" align="end" sideOffset={10} collisionPadding={16} className="w-80 max-w-[calc(100vw-2rem)] gap-2 p-3"
                        aria-label={practiceCopy.title} aria-describedby="subtitle-activation-guide subtitle-activation-permission"
                        onOpenAutoFocus={event => event.preventDefault()}
                        onCloseAutoFocus={event => event.preventDefault()}
                        onInteractOutside={event => {
                          const target = event.detail.originalEvent.target
                          if (target instanceof Node && subtitleActivationAnchor.current?.contains(target)) event.preventDefault()
                        }}
                        onFocusOutside={event => {
                          if (event.target === subtitleSection.current) event.preventDefault()
                        }}>
                        <p id="subtitle-activation-guide" className="leading-relaxed">{settings.enabled ? activationCopy.guide : subtitleEnableGuidance}</p>
                        <p id="subtitle-activation-permission" className="text-xs leading-relaxed text-muted-foreground">{activationCopy.permission}</p>
                        <PopoverArrow />
                      </PopoverContent>
                    </Popover>
                    <Button variant="outline" disabled={!settings.enabled} aria-label={practiceCopy.resetAll}
                      onClick={() => updateSettings(current => ({ ...current, subtitlePractice: { ...current.subtitlePractice, bindings: structuredClone(DEFAULT_PRACTICE_BINDINGS) } }))}>
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {!settings.enabled && !showSubtitleGuide && <p className="mb-3 text-xs text-muted-foreground">{subtitleEnableGuidance}</p>}
                  {subtitlePermissionError && settings.enabled && (
                    <Alert id="subtitle-permission-error" variant="destructive" className="mb-3">
                      <AlertTitle>{SUBTITLE_PERMISSION_COPY[resolvedLocale][subtitlePermissionError]}</AlertTitle>
                    </Alert>
                  )}
                  <Table className={cn("min-w-[36rem] table-fixed", !settings.enabled && "opacity-60")}>
                    <ShortcutTableHeader labels={copy} />
                    <TableBody>{SUBTITLE_PRACTICE_ACTIONS.map(action => {
                      const binding = settings.subtitlePractice.bindings[action]
                      return <TableRow key={action}>
                        <TableCell className="font-medium whitespace-normal">{practiceCopy[action]}</TableCell>
                        <TableCell><KeyBindingKbd binding={binding.key} className="flex-wrap" /></TableCell>
                        <TableCell>{conflictSwitch({ group: 'practice', action }, !settings.enabled || !settings.subtitlePractice.enabled)}</TableCell>
                        <TableCell><div className="flex items-center justify-end gap-2">
                          <Button disabled={!settings.enabled} variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground"
                            aria-label={`${copy.edit} ${practiceCopy[action]}`}
                            onClick={() => editor.edit({ group: 'practice', action })}><PencilIcon /></Button>
                          <Button disabled={!settings.enabled} variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground"
                            aria-label={`${copy.reset} ${practiceCopy[action]}`}
                            onClick={() => editor.resetBinding({ group: 'practice', action })}><RotateCcwIcon /></Button>
                        </div></TableCell>
                      </TableRow>
                    })}</TableBody>
                  </Table>
                </CardContent>
              </Card>

            </div>

            <aside className="flex flex-col gap-6">
              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <GaugeIcon data-icon="inline-start" />
                    {copy.speed}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button
                      variant="outline"
                      onClick={speedForm.reset}
                      aria-label={copy.resetSpeedSettings}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <NumericSettingField
                        id="preferred-speed"
                        label={copy.preferredSpeed}
                        tooltip={copy.preferredSpeedTooltip}
                        min={SPEED_LIMITS.preferred.min}
                        max={SPEED_LIMITS.preferred.max}
                        step={SPEED_LIMITS.preferred.inputStep}
                        value={speedForm.draft.preferred}
                        data-speed-field="preferred"
                        onValueChange={value => speedForm.setField('preferred', value)}
                        onBlur={() => speedForm.commitField('preferred')}
                        onDragCommit={() => speedForm.commitField('preferred')}
                        onKeyDown={speedForm.handleKeyDown}
                    />
                    <NumericSettingField
                        id="min-speed"
                        label={copy.minSpeed}
                        tooltip={copy.minSpeedTooltip}
                        min={SPEED_LIMITS.min.min}
                        max={SPEED_LIMITS.min.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedForm.draft.min}
                        data-speed-field="min"
                        onValueChange={value => speedForm.setField('min', value)}
                        onBlur={() => speedForm.commitField('min')}
                        onDragCommit={() => speedForm.commitField('min')}
                        onKeyDown={speedForm.handleKeyDown}
                    />
                    <NumericSettingField
                        id="max-speed"
                        label={copy.maxSpeed}
                        tooltip={copy.maxSpeedTooltip}
                        min={SPEED_LIMITS.max.min}
                        max={SPEED_LIMITS.max.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedForm.draft.max}
                        data-speed-field="max"
                        onValueChange={value => speedForm.setField('max', value)}
                        onBlur={() => speedForm.commitField('max')}
                        onDragCommit={() => speedForm.commitField('max')}
                        onKeyDown={speedForm.handleKeyDown}
                    />
                    <NumericSettingField
                        id="speed-step"
                        label={copy.step}
                        tooltip={copy.stepTooltip}
                        min={SPEED_LIMITS.step.min}
                        max={SPEED_LIMITS.step.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedForm.draft.step}
                        data-speed-field="step"
                        onValueChange={value => speedForm.setField('step', value)}
                        onBlur={() => speedForm.commitField('step')}
                        onDragCommit={() => speedForm.commitField('step')}
                        onKeyDown={speedForm.handleKeyDown}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <ChevronsLeftRightIcon data-icon="inline-start" />
                    {copy.seek}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button
                      variant="outline"
                      onClick={seekForm.reset}
                      aria-label={copy.resetSeekSettings}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <NumericSettingField
                      id="seek-seconds"
                      label={copy.seekSeconds}
                      tooltip={copy.seekSecondsTooltip}
                      min={SEEK_LIMITS.seconds.min}
                      max={SEEK_LIMITS.seconds.max}
                      step={SEEK_LIMITS.seconds.inputStep}
                      value={seekForm.draft.seconds}
                      onValueChange={seekForm.setSeconds}
                      onBlur={seekForm.commit}
                      onDragCommit={seekForm.commit}
                      onKeyDown={seekForm.handleKeyDown}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <HoldSpeedIcon data-icon="inline-start" />
                    {copy.holdSpeed}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button
                      variant="outline"
                      onClick={holdSpeedForm.reset}
                      aria-label={`${copy.reset} ${copy.holdSpeed}`}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel
                        htmlFor="enable-hold-speed"
                        aria-disabled={holdSpeedForm.enableControlDisabled}
                      >
                        {copy.holdSpeedEnabled}
                      </FieldLabel>
                      <Switch
                        id="enable-hold-speed"
                        checked={holdSpeedForm.enabled}
                        disabled={holdSpeedForm.enableControlDisabled}
                        onCheckedChange={holdSpeedForm.setEnabled}
                        aria-label={`${copy.holdSpeed}: ${copy.holdSpeedEnabled}`}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel
                        htmlFor="show-hold-speed-hint"
                        aria-disabled={holdSpeedForm.detailsDisabled}
                      >
                        {copy.holdSpeedHint}
                      </FieldLabel>
                      <Switch
                        id="show-hold-speed-hint"
                        checked={holdSpeedForm.showHint}
                        disabled={holdSpeedForm.detailsDisabled}
                        onCheckedChange={holdSpeedForm.setShowHint}
                        aria-label={`${copy.holdSpeed}: ${copy.holdSpeedHint}`}
                      />
                    </div>
                    <NumericSettingField
                        id="hold-speed"
                        label={copy.holdSpeedRate}
                        tooltip={copy.holdSpeedTooltip}
                        min={HOLD_SPEED_LIMITS.speed.min}
                        max={HOLD_SPEED_LIMITS.speed.max}
                        step={HOLD_SPEED_LIMITS.speed.inputStep}
                        value={holdSpeedForm.draft.speed}
                        disabled={holdSpeedForm.detailsDisabled}
                        onValueChange={holdSpeedForm.setSpeed}
                        onBlur={holdSpeedForm.commit}
                        onDragCommit={holdSpeedForm.commit}
                        onKeyDown={holdSpeedForm.handleKeyDown}
                    />
                  </FieldGroup>
                </CardContent>
              </Card>

              <SettingsTransferCard
                copy={copy}
                locale={resolvedLocale}
                settings={settings}
                onImport={replaceSettings}
              />

            </aside>
          </section>
        </div>
      </main>

      <Dialog open={Boolean(recorder)} onOpenChange={open => !open && editor.closeRecorder()}>
        <DialogContent
          onCloseAutoFocus={editor.restoreRecorderFocus}
          onKeyDown={event => {
            if (!recorder) return
            if (ignoredRecordKeys.has(event.code)) return
            event.preventDefault()
            event.stopPropagation()
            editor.capture(keyBindingFromEvent(event))
          }}
        >
          <DialogHeader>
            <DialogTitle>{copy.recordTitle}</DialogTitle>
            <DialogDescription>{copy.recordDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex min-h-20 items-center justify-center rounded-lg border-2 border-dashed bg-muted px-4 text-center">
              {recorder?.draft ? (
                <KeyBindingKbd binding={recorder.draft} className="justify-center" />
              ) : (
                <span className="text-lg font-semibold">{copy.pressKey}</span>
              )}
            </div>
            {recorder?.draft && (
              <Alert variant={recorder.activeConflict ? 'destructive' : 'default'}>
                <PlayIcon />
                <AlertTitle>
                  {recorder.activeConflict
                    ? copy.conflict.replace('{action}', actionLabels[recorder.activeConflict])
                    : copy.noConflict}
                </AlertTitle>
              </Alert>
            )}
            <NetflixNativeKeyReplacement
              bindings={recorder?.replacedNetflixKeys ?? []}
              template={copy.willReplaceNetflixKeys}
              className="text-center"
              aria-live="polite"
            />
          </div>

          <Separator />

          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              onClick={editor.restoreSavedDraft}
              disabled={!recorder?.canRestoreDraft}
              aria-label={`${copy.restore} ${actionLabels[recorder?.action ?? 'playPause']}`}
            >
              {copy.restore}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={editor.closeRecorder}>
                {copy.cancel}
              </Button>
              <Button onClick={editor.saveDraft} disabled={!recorder?.canSaveDraft}>
                {copy.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
