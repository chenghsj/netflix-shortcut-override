import { DEFAULT_PRACTICE_BINDINGS, practiceConflict, SUBTITLE_PERMISSION_COPY, SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'
import { NETFLIX_CAPTION_HOST_PERMISSIONS, NETFLIX_PAGE_HOST_PERMISSIONS } from '@/shared/netflix-caption-permissions'
import {
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
import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'

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
import { SettingLabelWithTooltip } from '@/components/setting-label-with-tooltip'
import { Label } from '@/components/ui/label'
import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from '@/components/ui/popover'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { ThemeCombobox } from '@/components/theme-combobox'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getCopy } from '@/shared/i18n'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import {
  DEFAULT_KEY_BINDINGS,
  findBindingConflict,
  findEnabledBindingConflicts,
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
  type SubtitlePracticeAction,
  type ShortcutBinding,
  type ShortcutSettings,
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

type ShortcutTarget = { group: 'general'; action: ShortcutAction } | { group: 'practice'; action: SubtitlePracticeAction }
type EnableRequest = ShortcutTarget & { savedKey: KeyBinding; key: KeyBinding; reason: 'enable' | 'reset' }
type RecorderState = ShortcutTarget & {
  draft: KeyBinding | null
  savedKey: KeyBinding
  enableOnSave?: boolean
  enableReason?: EnableRequest['reason']
} | null

function applyBindingRequest(
  settings: ShortcutSettings, request: EnableRequest, enabled: boolean,
  replaceConflicts: boolean, ignoredActions: readonly ShortcutAction[],
): ShortcutSettings {
  if (request.group === 'practice' && request.reason === 'enable' && enabled && !settings.subtitlePractice.bindings[request.action].enabled &&
    (!settings.enabled || !settings.subtitlePractice.enabled)) return settings
  const update = <Action extends string>(bindings: Record<Action, ShortcutBinding>, actions: readonly Action[], action: Action, ignored: readonly Action[] = []) => {
    if (!keyBindingsEqual(bindings[action].key, request.savedKey)) return bindings
    const conflicts = findEnabledBindingConflicts(bindings, actions, action, request.key, ignored)
    if (enabled && conflicts.length && !replaceConflicts) return bindings
    const next = { ...bindings }
    if (enabled && replaceConflicts) {
      for (const conflict of conflicts) next[conflict] = { ...bindings[conflict], enabled: false }
    }
    next[action] = { key: request.key, enabled }
    return next
  }
  return request.group === 'practice'
    ? { ...settings, subtitlePractice: { ...settings.subtitlePractice, bindings: update(settings.subtitlePractice.bindings, SUBTITLE_PRACTICE_ACTIONS, request.action) } }
    : { ...settings, bindings: update(settings.bindings, SHORTCUT_ACTIONS, request.action, ignoredActions) }
}

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
  const [recorder, setRecorder] = useState<RecorderState>(null)
  const recorderReturnFocus = useRef<HTMLButtonElement | null>(null)
  const [enableRequest, setEnableRequest] = useState<EnableRequest | null>(null)
  const [subtitlePermissionPending, setSubtitlePermissionPending] = useState(false)
  const [subtitlePermissionError, setSubtitlePermissionError] = useState<'denied' | 'failed' | null>(null)
  const permissionAttempt = useRef(0)
  const permissionBusy = useRef(false)
  const cancelSubtitlePermissionRequest = useCallback(() => {
    permissionAttempt.current++
    permissionBusy.current = false
    setSubtitlePermissionPending(false)
    setSubtitlePermissionError(null)
  }, [])
  useEffect(() => subscribeSettings(next => {
    setEnableRequest(null)
    // Observe every storage update, including off/on changes batched into
    // one render, so another view cannot revive an older approval.
    if (!next.enabled) cancelSubtitlePermissionRequest()
    if (next.subtitlePractice.enabled) setSubtitleGuideRequested(false)
  }), [cancelSubtitlePermissionRequest])
  useEffect(() => () => { permissionAttempt.current++ }, [])
  const resolvedLocale = resolveLocalePreference(settings.locale)
  const practiceCopy = SUBTITLE_PRACTICE_COPY[resolvedLocale]
  const activationCopy = SUBTITLE_ACTIVATION_COPY[resolvedLocale]
  const showSubtitleGuide = subtitleGuideRequested && !settings.subtitlePractice.enabled
  const copy = getCopy(resolvedLocale)
  const browserCapabilities = getBrowserCapabilities()
  const conflictCopy = SHORTCUT_CONFLICT_COPY[resolvedLocale]
  const ignoredGeneralActions: readonly ShortcutAction[] = browserCapabilities.supportsSubtitlePreservingPip ? [] : ['pictureInPicture']
  useTheme(settings.theme)

  const setSubtitleNavigationEnabled = (enabled: boolean) => {
    if (!settings.enabled || permissionBusy.current) return
    setSubtitlePermissionError(null)
    if (!enabled) {
      setSubtitleGuideRequested(false)
      updateSettings(current => ({ ...current, subtitlePractice: { ...current.subtitlePractice, enabled: false } }))
      return
    }
    const attempt = ++permissionAttempt.current
    permissionBusy.current = true
    setSubtitlePermissionPending(true)
    const fail = (error: 'denied' | 'failed') => {
      if (attempt === permissionAttempt.current) setSubtitlePermissionError(error)
    }
    const finish = () => {
      if (attempt !== permissionAttempt.current) return
      permissionBusy.current = false
      setSubtitlePermissionPending(false)
    }
    try {
      // Invoke synchronously in the switch's user gesture, without awaiting
      // contains(). Both browsers grant silently when access is already held.
      void chrome.permissions.request({ origins: [...NETFLIX_PAGE_HOST_PERMISSIONS, ...NETFLIX_CAPTION_HOST_PERMISSIONS] })
        .then(granted => {
          if (attempt !== permissionAttempt.current) return
          if (!granted) { fail('denied'); return }
          updateSettings(current => current.enabled
            ? { ...current, subtitlePractice: { ...current.subtitlePractice, enabled: true } }
            : current)
        })
        .catch(() => fail('failed'))
        .finally(finish)
    } catch { fail('failed'); finish() }
  }

  const actionLabels = { ...copy.actions, ...practiceCopy }
  const bindingFor = (target: ShortcutTarget) => target.group === 'practice'
    ? settings.subtitlePractice.bindings[target.action] : settings.bindings[target.action]
  const conflictsFor = (target: ShortcutTarget, key: KeyBinding) => target.group === 'practice'
    ? findEnabledBindingConflicts(settings.subtitlePractice.bindings, SUBTITLE_PRACTICE_ACTIONS, target.action, key)
    : findEnabledBindingConflicts(settings.bindings, SHORTCUT_ACTIONS, target.action, key, ignoredGeneralActions)
  const requestEnabled = (target: ShortcutTarget, enabled: boolean, key = bindingFor(target).key, reason: EnableRequest['reason'] = 'enable') => {
    const request: EnableRequest = { ...target, savedKey: bindingFor(target).key, key, reason }
    if (enabled && conflictsFor(target, key).length) { setEnableRequest(request); return }
    setEnableRequest(null)
    updateSettings(current => applyBindingRequest(current, request, enabled, false, ignoredGeneralActions))
  }
  const validEnableRequest = enableRequest && keyBindingsEqual(enableRequest.savedKey, bindingFor(enableRequest).key) &&
    (enableRequest.group === 'general' || (settings.enabled && (enableRequest.reason === 'reset' || settings.subtitlePractice.enabled)))
    ? enableRequest : null
  const enableConflicts = validEnableRequest ? conflictsFor(validEnableRequest, validEnableRequest.key) : []
  const conflictNames = new Intl.ListFormat(resolvedLocale, { style: 'short', type: 'conjunction' }).format(enableConflicts.map(action => actionLabels[action]))
  const conflictSwitch = (target: ShortcutTarget, disabled: boolean) => {
    const binding = bindingFor(target)
    const open = Boolean(validEnableRequest?.group === target.group && validEnableRequest.action === target.action && enableConflicts.length)
    return <ShortcutConflictSwitch checked={binding.enabled && (target.group === 'practice' || !disabled)} disabled={disabled}
      label={`${actionLabels[target.action]} ${copy.status}`} open={open} copy={conflictCopy}
      title={conflictCopy.title.replace('{key}', formatKeyBinding(validEnableRequest?.key ?? binding.key)).replace('{actions}', conflictNames)}
      consequence={conflictCopy.consequence.replace('{actions}', conflictNames)}
      transferLabel={conflictCopy.transfer.replace('{action}', actionLabels[target.action])}
      onOpenChange={next => { if (!next) setEnableRequest(null) }}
      onCheckedChange={enabled => requestEnabled(target, enabled)}
      onChangeKey={returnFocus => {
        if (!validEnableRequest) return
        recorderReturnFocus.current = returnFocus
        setRecorder({ ...target, savedKey: binding.key, draft: validEnableRequest.key, enableOnSave: true, enableReason: validEnableRequest.reason })
        setEnableRequest(null)
      }}
      onTransfer={() => {
        if (!validEnableRequest) return
        const request = validEnableRequest
        setEnableRequest(null)
        updateSettings(current => applyBindingRequest(current, request, true, true, ignoredGeneralActions))
      }} />
  }
  const activeConflict = recorder?.draft && (recorder.enableOnSave || bindingFor(recorder).enabled)
    ? recorder.group === 'practice'
      ? practiceConflict(settings, recorder.action, recorder.draft)
      : findBindingConflict(settings, recorder.action, recorder.draft, {
          ignoredActions: ignoredGeneralActions,
        })
    : null

  const canSaveDraft = Boolean(recorder?.draft && !activeConflict && (recorder.group === 'general' ||
    (settings.enabled && (!recorder.enableOnSave || recorder.enableReason === 'reset' || settings.subtitlePractice.enabled))))
  const canRestoreDraft = Boolean(
    recorder?.draft && !keyBindingsEqual(recorder.draft, recorder.savedKey)
  )
  const recorderReplacedNetflixKeys =
    recorder?.draft && !activeConflict && recorder.group === 'general'
      ? getReplacedNetflixNativeKeyBindings(recorder.action, {
          ...settings.bindings[recorder.action],
          key: recorder.draft,
        })
      : []

  const saveDraft = () => {
    if (!recorder?.draft || !canSaveDraft) return
    const { draft } = recorder
    const request: EnableRequest = { ...recorder, key: draft, reason: recorder.enableReason ?? 'enable' }
    const enabled = recorder.enableOnSave || bindingFor(recorder).enabled
    updateSettings(current => applyBindingRequest(current, request, enabled, false, ignoredGeneralActions))
    setRecorder(null)
  }

  const restoreSavedDraft = () => {
    if (!recorder) return
    setRecorder({
      ...recorder,
      draft: recorder.savedKey,
    })
  }

  if (!loaded) return null

  return (
    <TooltipProvider>
      <main className="min-h-svh bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex min-w-0 items-center gap-4">
                    <img src="/icons/icon48.png" alt="" className="size-12 shrink-0" />
                    <h1 className="truncate text-2xl font-semibold leading-tight">
                      {copy.appTitle}
                    </h1>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={EXTERNAL_LINKS.githubRepository}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={copy.githubRepositoryAriaLabel}
                      >
                        <GitHubIcon data-icon="inline-start" />
                        {copy.githubRepository}
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
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
                      label={copy.otherProjects}
                      ariaLabel={copy.otherProjectsAriaLabel}
                      streamDanmakuLabel={copy.streamDanmakuStore}
                      streamDanmakuTitle={copy.streamDanmakuStoreAriaLabel}
                    />
                  </div>
                </div>
                <SettingsSaveStatus
                  error={saveError}
                  errorLabel={copy.settingsSaveError}
                />
              </CardHeader>
            </Card>
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
                        onChange={locale =>
                          updateSettings(current => ({ ...current, locale }))
                        }
                      />
                    </Field>

                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabel>{copy.theme}</FieldLabel>
                      <ThemeCombobox
                        className="w-36"
                        label={copy.theme}
                        labels={{
                          auto: copy.themeAuto,
                          light: copy.themeLight,
                          dark: copy.themeDark,
                        }}
                        size="default"
                        value={settings.theme}
                        onChange={theme =>
                          updateSettings(current => ({ ...current, theme }))
                        }
                      />
                    </Field>

                    <Field orientation="horizontal" className="items-center justify-between">
                      <SettingLabelWithTooltip
                        htmlFor="enable-shortcut-override"
                        label={copy.enabled}
                        tooltip={copy.enabledDesc}
                      />
                      <Switch
                        id="enable-shortcut-override"
                        checked={settings.enabled}
                        onCheckedChange={enabled => {
                          if (!enabled) cancelSubtitlePermissionRequest()
                          updateSettings(current => ({ ...current, enabled }))
                        }}
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
                                        className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                        aria-label={`${copy.actions[action]} info`}
                                      >
                                        <CircleHelpIcon className="size-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      sideOffset={6}
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
                                <KeyBindingKbd binding={binding.key} className="flex-wrap" />
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
                                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                                  disabled={!actionSupported}
                                  onClick={() =>
                                    setRecorder({
                                      group: 'general',
                                      action,
                                      draft: settings.bindings[action].key,
                                      savedKey: settings.bindings[action].key,
                                    })
                                  }
                                  aria-label={`${copy.edit} ${copy.actions[action]}`}
                                >
                                  <PencilIcon />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                                  disabled={!actionSupported}
                                  onClick={() => requestEnabled({ group: 'general', action }, true, DEFAULT_KEY_BINDINGS[action], 'reset')}
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
                    <span>{practiceCopy.title}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button"
                          className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          aria-label={`${practiceCopy.title} info`}>
                          <CircleHelpIcon className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={6} className="max-w-80 whitespace-pre-line">
                        {`${practiceCopy.requiresEnabled}\n\n${practiceCopy.description}`}
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
                            onCheckedChange={setSubtitleNavigationEnabled} />
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
                        <p id="subtitle-activation-guide" className="leading-relaxed">{settings.enabled ? activationCopy.guide : practiceCopy.requiresEnabled}</p>
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
                <CardContent className={cn("overflow-x-auto", !settings.enabled && "opacity-60")}>
                  {!settings.enabled && !showSubtitleGuide && <p className="mb-3 text-xs text-muted-foreground">{practiceCopy.requiresEnabled}</p>}
                  {subtitlePermissionError && settings.enabled && (
                    <Alert id="subtitle-permission-error" variant="destructive" className="mb-3">
                      <AlertTitle>{SUBTITLE_PERMISSION_COPY[resolvedLocale][subtitlePermissionError]}</AlertTitle>
                    </Alert>
                  )}
                  <Table className="min-w-[36rem] table-fixed">
                    <ShortcutTableHeader labels={copy} />
                    <TableBody>{SUBTITLE_PRACTICE_ACTIONS.map(action => {
                      const binding = settings.subtitlePractice.bindings[action]
                      return <TableRow key={action}>
                        <TableCell className="font-medium whitespace-normal">{practiceCopy[action]}</TableCell>
                        <TableCell><KeyBindingKbd binding={binding.key} className="flex-wrap" /></TableCell>
                        <TableCell>{conflictSwitch({ group: 'practice', action }, !settings.enabled || !settings.subtitlePractice.enabled)}</TableCell>
                        <TableCell><div className="flex items-center justify-end gap-2">
                          <Button disabled={!settings.enabled} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                            aria-label={`${copy.edit} ${practiceCopy[action]}`}
                            onClick={() => setRecorder({ group: 'practice', action, draft: binding.key, savedKey: binding.key })}><PencilIcon /></Button>
                          <Button disabled={!settings.enabled} variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                            aria-label={`${copy.reset} ${practiceCopy[action]}`}
                            onClick={() => requestEnabled({ group: 'practice', action }, true, DEFAULT_PRACTICE_BINDINGS[action].key, 'reset')}><RotateCcwIcon /></Button>
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

      <Dialog open={Boolean(recorder)} onOpenChange={open => !open && setRecorder(null)}>
        <DialogContent
          onCloseAutoFocus={event => {
            const target = recorderReturnFocus.current
            recorderReturnFocus.current = null
            if (!target) return
            event.preventDefault()
            if (target.isConnected && !target.disabled) target.focus()
          }}
          onKeyDown={event => {
            if (!recorder) return
            if (ignoredRecordKeys.has(event.code)) return
            event.preventDefault()
            event.stopPropagation()
            setRecorder({ ...recorder, draft: keyBindingFromEvent(event) })
          }}
        >
          <DialogHeader>
            <DialogTitle>{copy.recordTitle}</DialogTitle>
            <DialogDescription>{copy.recordDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed bg-muted/35 px-4 text-center">
              {recorder?.draft ? (
                <KeyBindingKbd binding={recorder.draft} className="justify-center" />
              ) : (
                <span className="text-lg font-semibold">{copy.pressKey}</span>
              )}
            </div>
            {recorder?.draft && (
              <Alert variant={activeConflict ? 'destructive' : 'default'}>
                <PlayIcon />
                <AlertTitle>
                  {activeConflict
                    ? copy.conflict.replace('{action}', actionLabels[activeConflict])
                    : copy.noConflict}
                </AlertTitle>
              </Alert>
            )}
            <NetflixNativeKeyReplacement
              bindings={recorderReplacedNetflixKeys}
              template={copy.willReplaceNetflixKeys}
              className="text-center"
              aria-live="polite"
            />
          </div>

          <Separator />

          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              onClick={restoreSavedDraft}
              disabled={!canRestoreDraft}
              aria-label={`${copy.restore} ${actionLabels[recorder?.action ?? 'playPause']}`}
            >
              {copy.restore}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setRecorder(null)}>
                {copy.cancel}
              </Button>
              <Button onClick={saveDraft} disabled={!canSaveDraft}>
                {copy.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
