import { PageFeatureManager, type ManagedFeatureEntry } from '@/options/page-feature-manager'
import { FeatureGroupCheckbox } from '@/options/feature-group-checkbox'
import { hideFeatures, isFeatureHidden, isFeatureGroupHidden, restoreFeatures, setFavoritesFeatureEnabled, type ManagedFeatureGroup, type ManagedFavoritesFeature } from '@/shared/feature-management'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { FEATURE_MANAGEMENT_COPY } from '@/shared/feature-management-copy'
import { useFeatureManagement } from '@/options/use-feature-management'
import { FeatureCheckbox } from '@/components/feature-checkbox'
import { formatSubtitleSizes } from '@/shared/subtitle-size-shortcuts'
import { ResetButton, RestoreButton } from '@/components/reset-button'
import { DeleteButton } from '@/components/delete-button'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { SUBTITLE_PERMISSION_COPY, SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'
import { resetSubtitleNavigationBindings } from '@/shared/shortcut-assignment'
import {
  CircleHelpIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
} from 'lucide-react'
import { Fragment, useEffect, useId, useRef, useState, type ComponentProps } from 'react'

import { GitHubIcon } from '@/components/github-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { ShortcutRecordingArea } from '@/components/shortcut-recording-area'
import { LanguageCombobox } from '@/components/language-combobox'
import { NumericSettingField } from '@/components/numeric-setting-field'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingsTransferCard } from '@/options/settings-transfer-card'
import { SubtitleFavoritesCard } from '@/options/subtitle-favorites-card'
import { AudioFavoritesCard } from '@/options/audio-favorites-card'
import { createSettingsSearch } from '@/options/settings-search'
import { SHORTCUT_CONFLICT_COPY } from '@/options/shortcut-conflict-copy'
import { ShortcutConflictSwitch } from '@/options/shortcut-conflict-switch'
import { SUBTITLE_ACTIVATION_COPY } from '@/options/subtitle-activation-copy'
import { SUBTITLE_NAVIGATION_POPUP_COPY } from '@/popup/subtitle-navigation-copy'
import { useSubtitleActivation } from '@/shared/use-subtitle-activation'
import { useShortcutEditor } from '@/options/use-shortcut-editor'
import { SubtitleSizeDialog } from '@/options/subtitle-size-dialog'
import { SubtitleSizeShortcutRows } from '@/options/subtitle-size-shortcut-rows'
import { useSubtitleSizeEditor } from '@/options/use-subtitle-size-editor'
import { SeekShortcutDialog } from '@/options/seek-shortcut-dialog'
import { useSeekShortcutEditor, type SeekEditorTarget } from '@/options/use-seek-shortcut-editor'
import { ShortcutGroupToggle, ShortcutTableGroup } from '@/options/shortcut-table-group'
import { HoldSpeedShortcutSettings, SpeedRangeSettings } from '@/options/speed-shortcut-settings'
import { SPEED_SHORTCUT_COPY } from '@/options/speed-shortcut-copy'
import { PreferredSpeedShortcutSettings } from '@/options/preferred-speed-shortcut-rows'
import { getShortcutLabels, getSeekShortcutLabel, SEEK_PAIR_COPY, SEEK_SECTION_COPY, SEEK_SHORTCUT_COPY } from '@/shared/seek-shortcuts'
import { createShortcutCatalog, type ShortcutSeekPair } from '@/shared/shortcut-catalog'
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
import { createShortcutSearchIndex, matchesShortcutSearch } from '@/shared/shortcut-search'
import { getOptionsPageFromHash, OPTIONS_PAGE_HASHES } from '@/shared/options-navigation'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'
import { getShortcutAvailability, getSubtitleNavigationAvailability, type ShortcutTarget } from '@/shared/shortcut-routing'
import {
  formatKeyBinding,
  getReplacedNetflixNativeKeyBindings,
  keyBindingFromEvent,
} from '@/shared/shortcut-bindings'
import {
  SPEED_LIMITS,
} from '@/shared/shortcut-settings'
import {
  SUBTITLE_NAVIGATION_ACTIONS,
  type KeyBinding,
  type ShortcutAction,
} from '@/shared/shortcut-types'
import { subscribeSettings } from '@/shared/storage'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { EXTERNAL_LINKS, getShortcutOverrideRatingUrl } from '@/shared/external-links'
import { useTheme } from '@/shared/use-theme'
import { useUiStyle } from '@/shared/use-ui-style'
import { getUiStyleOptions } from '@/shared/ui-styles'
import { SUBTITLE_OPTIONS_HASH } from '@/shared/feature-announcements'
import { SEEK_GROUPS, SHORTCUT_GROUPS } from '@/shared/shortcut-groups'
import { OptionsBreadcrumb, OptionsLayout, OPTIONS_LAYOUT_COPY, type OptionsPage, type OptionsPageDescriptor, type ShortcutCategory } from '@/options/options-layout'
import { HelpPage } from '@/help/help-page'
import { HELP_UI_COPY } from '@/help/help-copy'

type OptionsShortcutGroupId = 'seek' | 'percentage' | 'holdSpeed' | 'preferredSpeed'
type PageFeature = Omit<ManagedFeatureEntry, 'children'> & { matches: boolean; visible: boolean; children?: PageFeature[] }

function ShortcutTableHeader({ labels }: {
  labels: { action: string; key: string; status: string; columnActions: string }
}) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="w-[40%]">{labels.action}</TableHead>
        <TableHead className="w-[30%]">{labels.key}</TableHead>
        <TableHead className="w-[15%]">{labels.status}</TableHead>
        <TableHead className="w-[15%] text-right">{labels.columnActions}</TableHead>
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
    settings: savedSettings,
    loaded,
    saveError,
    updateSettings: persistSettings,
    replaceSettings,
    resetShortcutBindings,
    speed: speedForm,
    holdSpeed: rawHoldSpeedForm,
  } = useShortcutSettingsForm()
  const management = useFeatureManagement({ settings: savedSettings, updateSettings: persistSettings })
  const settings = management.settings
  const catalog = createShortcutCatalog(settings)
  const cancelFeaturePreview = management.cancel
  const subtitleSection = useRef<HTMLDivElement>(null)
  const recordingArea = useRef<HTMLDivElement>(null)
  const preferredSpeedInput = useRef<HTMLInputElement>(null)
  const globalEnableSwitch = useRef<HTMLButtonElement>(null)
  const subtitleActivationAnchor = useRef<HTMLDivElement>(null)
  const [activeShortcutCategory, setActiveShortcutCategory] = useState<OptionsPage>(() => getOptionsPageFromHash(window.location.hash))
  const [shortcutQuery, setShortcutQuery] = useState('')
  const [managingPage, setManagingPage] = useState<string | null>(null)
  const holdSpeedSettingsId = useId()
  const pauseOverlaySettingsId = useId()
  const [expandedShortcutGroups, setExpandedShortcutGroups] = useState(() => new Set<OptionsShortcutGroupId>([...SEEK_GROUPS, 'holdSpeed', 'preferredSpeed']))
  const setShortcutGroupOpen = (group: OptionsShortcutGroupId, open: boolean) => {
    setExpandedShortcutGroups(current => {
      const next = new Set(current)
      if (open) next.add(group)
      else next.delete(group)
      return next
    })
  }
  const [subtitleGuideRequested, setSubtitleGuideRequested] = useState(() => window.location.hash === SUBTITLE_OPTIONS_HASH)
  const [subtitleNavigationRequest, setSubtitleNavigationRequest] = useState(0)
  useEffect(() => {
    const navigate = () => {
      const requested = window.location.hash === SUBTITLE_OPTIONS_HASH
      setActiveShortcutCategory(getOptionsPageFromHash(window.location.hash))
      setManagingPage(null)
      cancelFeaturePreview()
      setShortcutQuery('')
      setSubtitleGuideRequested(requested)
      if (requested) {
        setSubtitleNavigationRequest(current => current + 1)
      }
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [cancelFeaturePreview])
  useEffect(() => {
    if (!loaded || window.location.hash !== SUBTITLE_OPTIONS_HASH) return
    subtitleSection.current?.focus({ preventScroll: true })
    subtitleSection.current?.scrollIntoView({ block: 'start' })
  }, [loaded, subtitleNavigationRequest])
  const resolvedLocale = resolveLocalePreference(settings.locale)
  const browserCapabilities = getBrowserCapabilities()
  const updateSettings = management.updateSettings
  const setManaging = (id: string, open: boolean) => {
    if (open) management.start()
    else { cancelFeaturePreview(); shortcutEditor.dismissConflict(); seekEditor.dismissConflict() }
    setManagingPage(open ? id : null)
  }
  const holdSpeedForm = { ...rawHoldSpeedForm, setEnabled: (enabled: boolean) => {
    updateSettings(current => ({ ...current, holdSpeed: { ...current.holdSpeed, enabled } }))
  } }
  const subtitleActivation = useSubtitleActivation({ settings, updateSettings })
  const { pending: subtitlePermissionPending, error: subtitlePermissionError } = subtitleActivation
  useEffect(() => subscribeSettings(next => {
    if (next.subtitleNavigation.enabled) setSubtitleGuideRequested(false)
  }), [])
  const subtitleNavigationCopy = SUBTITLE_NAVIGATION_COPY[resolvedLocale]
  const subtitlePopupCopy = SUBTITLE_NAVIGATION_POPUP_COPY[resolvedLocale]
  const activationCopy = SUBTITLE_ACTIVATION_COPY[resolvedLocale]
  const showSubtitleGuide = subtitleGuideRequested && !settings.subtitleNavigation.enabled
  const copy = getCopy(resolvedLocale)
  const featureCopy = FEATURE_MANAGEMENT_COPY[resolvedLocale]
  const speedCopy = SPEED_SHORTCUT_COPY[resolvedLocale]
  const conflictCopy = SHORTCUT_CONFLICT_COPY[resolvedLocale]
  useTheme(settings.theme, loaded)
  useUiStyle(settings.uiStyle, loaded)

  const shortcutEditor = useShortcutEditor({ settings, updateSettings, supportsSubtitlePreservingPip: browserCapabilities.supportsSubtitlePreservingPip })
  const editor = shortcutEditor
  const seekEditor = useSeekShortcutEditor({ settings, updateSettings, supportsSubtitlePreservingPip: browserCapabilities.supportsSubtitlePreservingPip })
  const sizeEditor = useSubtitleSizeEditor({ settings, updateSettings, supportsSubtitlePreservingPip: browserCapabilities.supportsSubtitlePreservingPip })
  const { recorder, conflict } = editor
  const actionLabels: Record<string, string> = { ...getShortcutLabels(settings, resolvedLocale), ...subtitleNavigationCopy }
  const seekCopy = SEEK_SHORTCUT_COPY[resolvedLocale]
  const pairCopy = SEEK_PAIR_COPY[resolvedLocale]
  const browserCopy = OPTIONS_LAYOUT_COPY[resolvedLocale]
  const shortcutGroupLabels = { ...copy.shortcutGroups, subtitles: browserCopy.subtitles, subtitleNavigation: browserCopy.subtitleNavigation, seeking: browserCopy.seeking, volume: browserCopy.volume, seek: pairCopy.pair, percentage: SEEK_SECTION_COPY[resolvedLocale].percentage }
  const searchingShortcuts = Boolean(shortcutQuery.trim())
  const holdSpeedExpanded = searchingShortcuts || expandedShortcutGroups.has('holdSpeed')
  const searchIndex = createShortcutSearchIndex(settings)
  const matchesSettings = createSettingsSearch(settings)
  const matchesSubtitleFavorites = !settings.hiddenFeatures.includes('subtitleFavorites') && matchesSettings('subtitleFavorites', shortcutQuery)
  const matchesAudioFavorites = !settings.hiddenFeatures.includes('audioFavorites') && matchesSettings('audioFavorites', shortcutQuery)
  const matchesSpeedRange = matchesSettings('speedRange', shortcutQuery)
  const visibleSubtitleNavigationActions = SUBTITLE_NAVIGATION_ACTIONS.filter(action => !isFeatureHidden(settings, { group: 'subtitleNavigation', action }) && matchesShortcutSearch(
    searchIndex.subtitleNavigation(action), settings.subtitleNavigation.bindings[action].key, shortcutQuery,
  ))
  const matchesShortcut = (action: ShortcutAction, category: ShortcutCategory, extra: string[] = []) => {
    const binding = settings.bindings[action]?.key
    return !isFeatureHidden(settings, { group: 'general', action }) && matchesShortcutSearch([...searchIndex.general(action, category), ...extra], binding, shortcutQuery)
  }
  const matchesSubtitleSize = (action: ShortcutAction) => matchesShortcut(action, 'subtitles')
  const matchesHoldSpeed = !settings.hiddenFeatures.includes(catalog.holdSpeed.id) && !isFeatureHidden(settings, { group: 'general', action: catalog.holdSpeed.parentAction }) && (matchesShortcut(catalog.holdSpeed.parentAction, 'playback', [...searchIndex.holdSpeed, String(settings.holdSpeed.speed)]) || matchesSettings('holdSpeed', shortcutQuery))
  const matchesSeekPair = (pair: ShortcutSeekPair = catalog.groups.seek.pairs[0]) => {
    const actions = [pair.actions.backward, pair.actions.forward]
    const labels = [...searchIndex.seekPair, String(pair.shortcut?.value ?? settings.seek.seconds)]
    return !actions.every(action => isFeatureHidden(settings, { group: 'general', action })) && (actions.some(action => matchesShortcut(action, 'seeking', labels)) || matchesSettings('seekPair', shortcutQuery))
  }
  const matchesPercentage = (shortcut: typeof settings.seekShortcuts[number]) => !isFeatureHidden(settings, { group: 'general', action: shortcut.id }) && (matchesShortcut(shortcut.id, 'seeking', [...searchIndex.seekPercentage, `${shortcut.value}%`]) || matchesSettings('seekPercentage', shortcutQuery))
  const visibleSeekGroups = SEEK_GROUPS.filter(group => !isFeatureGroupHidden(settings, group) && (!searchingShortcuts || (group === 'seek'
    ? catalog.groups.seek.pairs.some(matchesSeekPair)
    : matchesSettings('seekPercentage', shortcutQuery) || catalog.groups.percentage.shortcuts.some(matchesPercentage))))
  const conflictNames = new Intl.ListFormat(resolvedLocale, { style: 'short', type: 'conjunction' }).format([...new Set(conflict?.affectedActions.map(action => actionLabels[action]) ?? [])])
  const featureCheckbox = (targets: ShortcutTarget[], label: string, disabled = false) => <FeatureCheckbox
    checked={!targets.every(target => isFeatureHidden(settings, target))} disabled={disabled}
    aria-label={featureCopy.show.replace('{action}', label)} onCheckedChange={checked => updateSettings(current => checked === true
      ? restoreFeatures(current, targets, browserCapabilities.supportsSubtitlePreservingPip)
      : hideFeatures(current, targets))} />
  const conflictSwitch = (target: ShortcutTarget, disabled: boolean) => {
    const binding = target.group === 'subtitleNavigation' ? settings.subtitleNavigation.bindings[target.action] : settings.bindings[target.action]
    const open = Boolean(conflict?.group === target.group && conflict.action === target.action && conflict.actions.length)
    return <ShortcutConflictSwitch checked={binding.enabled && (target.group === 'subtitleNavigation' || !disabled)} disabled={disabled}
      label={`${actionLabels[target.action]} ${copy.status}`} open={open} copy={conflictCopy}
      title={conflictCopy.title.replace('{key}', formatKeyBinding(conflict?.key ?? binding.key)).replace('{actions}', conflictNames)}
      consequence={conflictCopy.consequence.replace('{actions}', conflictNames)}
      transferLabel={conflictCopy.transfer.replace('{action}', actionLabels[target.action])}
      onOpenChange={next => { if (!next) editor.dismissConflict() }}
      onCheckedChange={enabled => editor.setBindingEnabled(target, enabled)}
      onChangeKey={button => {
        const shortcut = target.group === 'general' && settings.seekShortcuts.find(item => item.id === target.action)
        if (target.group === 'general' && (target.action === 'cycleSubtitleSize' || settings.subtitleSizeShortcuts.some(item => item.id === target.action))) {
          editor.dismissConflict(); sizeEditor.open(target.action as 'cycleSubtitleSize' | `subtitle-size:${string}`, button, true)
        }
        else if (shortcut) { editor.dismissConflict(); seekEditor.open({ kind: 'custom', shortcut }, button, false, true) }
        else editor.changeConflictKey(button)
      }}
      onTransfer={editor.confirmTransfer} />
  }

  const seekPairSwitch = (target: SeekEditorTarget, label: string) => {
    const pair = catalog.groups.seek.pairs.find(pair => target.kind === 'builtin' ? !pair.shortcut : pair.id === target.shortcut.id)!
    const actions = [pair.actions.backward, pair.actions.forward]
    const pending = seekEditor.pairConflict
    const open = Boolean(pending && (target.kind === 'builtin' ? pending.target.kind === 'builtin'
      : pending.target.kind === 'custom' && pending.target.shortcut.id === target.shortcut.id))
    const names = new Intl.ListFormat(resolvedLocale, { style: 'short', type: 'conjunction' }).format(
      [...new Set(pending?.affectedActions.map(action => actionLabels[action]) ?? [])])
    return <ShortcutConflictSwitch checked={actions.some(action => settings.bindings[action].enabled)} disabled={false}
      label={`${label} ${copy.status}`} open={open} copy={conflictCopy}
      title={conflictCopy.title.replace('{key}', pending?.keys.map(key => formatKeyBinding(key)).join(' · ') ?? '').replace('{actions}', names)}
      consequence={conflictCopy.consequence.replace('{actions}', names)} transferLabel={conflictCopy.transfer.replace('{action}', label)}
      onOpenChange={next => { if (!next) seekEditor.dismissConflict() }}
      onCheckedChange={enabled => seekEditor.setPairEnabled(target, enabled)}
      onChangeKey={seekEditor.changeConflictKeys} onTransfer={seekEditor.confirmTransfer} />
  }
  const addSeekControl = (kind: 'relative' | 'percentage', expand: () => void) => {
    const label = kind === 'relative' ? pairCopy.add : SEEK_SECTION_COPY[resolvedLocale].addPercentage
    return <Button variant="outline" aria-label={label} onClick={event => { expand(); seekEditor.add(kind, event.currentTarget) }}>
      <PlusIcon data-icon="inline-start" />{seekCopy.add}
    </Button>
  }
  const seekBindingCell = (action: ShortcutAction) => {
    const binding = settings.bindings[action]
    return <TableCell key={action}>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <KeyBindingKbd binding={binding.key} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
        <NetflixNativeKeyReplacement bindings={getReplacedNetflixNativeKeyBindings(action, binding)} template={copy.replacedNetflixKeys} />
      </div>
    </TableCell>
  }

  const generalFeature = (action: ShortcutAction, category: ShortcutCategory) => {
    const supported = getShortcutAvailability(settings, action, browserCapabilities.supportsSubtitlePreservingPip).supported
    const label = action === 'setPreferredSpeed' ? `${actionLabels[action]} · ${settings.speed.preferred}×`
      : action === 'cycleSubtitleSize' ? `${actionLabels[action]} · ${formatSubtitleSizes(settings.subtitleSizeCycle)}` : actionLabels[action]
    return { id: String(action), label, matches: matchesShortcut(action, category), visible: !isFeatureHidden(settings, { group: 'general', action }),
      control: featureCheckbox([{ group: 'general', action }], actionLabels[action], !supported) }
  }
  const pairFeature = (pair: ShortcutSeekPair) => {
    const label = pair.shortcut ? getSeekShortcutLabel(pair.shortcut, resolvedLocale) : pairCopy.group.replace('{value}', String(settings.seek.seconds))
    const actions = [pair.actions.backward, pair.actions.forward]
    return { id: pair.shortcut ? pair.id : 'builtin-seek', label,
      matches: actions.some(action => matchesShortcut(action, 'seeking', [label])), visible: !actions.every(action => isFeatureHidden(settings, { group: 'general', action })),
      control: featureCheckbox(actions.map(action => ({ group: 'general', action })), label) }
  }
  const navigationFeatures = SUBTITLE_NAVIGATION_ACTIONS.map(action => ({ id: action, label: subtitleNavigationCopy[action],
    matches: visibleSubtitleNavigationActions.includes(action), visible: !isFeatureHidden(settings, { group: 'subtitleNavigation', action }),
    control: featureCheckbox([{ group: 'subtitleNavigation', action }], subtitleNavigationCopy[action], !settings.enabled || !settings.subtitleNavigation.enabled) }))
  const groupFeature = (group: ManagedFeatureGroup, label: string, children: PageFeature[]): PageFeature => ({
    id: `group:${group}`, label, children, matches: children.some(child => child.matches), visible: !isFeatureGroupHidden(settings, group),
    control: <FeatureGroupCheckbox group={group} label={label} settings={settings} locale={resolvedLocale}
      supportsSubtitlePreservingPip={browserCapabilities.supportsSubtitlePreservingPip} updateSettings={updateSettings} />,
  })
  const pageFeatures = (category: ShortcutCategory): PageFeature[] => {
    const actions = SHORTCUT_GROUPS.find(group => group.title === category)!.actions
    const holdSpeedFeature: PageFeature = { id: catalog.holdSpeed.id, label: copy.holdSpeed, matches: matchesSettings('holdSpeed', shortcutQuery), visible: !settings.hiddenFeatures.includes(catalog.holdSpeed.id) && !isFeatureHidden(settings, { group: 'general', action: catalog.holdSpeed.parentAction }),
      control: <FeatureCheckbox checked={!settings.hiddenFeatures.includes('holdSpeed')} disabled={holdSpeedForm.enableControlDisabled}
        aria-label={featureCopy.show.replace('{action}', copy.holdSpeed)} onCheckedChange={next => updateSettings(current => ({ ...current, holdSpeed: { ...current.holdSpeed, enabled: next === true },
          hiddenFeatures: next === true ? current.hiddenFeatures.filter(id => id !== 'holdSpeed') : [...new Set([...current.hiddenFeatures, 'holdSpeed'])] }))} /> }
    const entries = actions.map(action => action === 'setPreferredSpeed'
      ? groupFeature('preferredSpeed', copy.preferredSpeed, catalog.groups.preferredSpeed.actions.map(action => generalFeature(action, category)))
      : { ...generalFeature(action, category), ...(action === catalog.holdSpeed.parentAction ? { children: [holdSpeedFeature] } : {}) })
    if (category === 'seeking') entries.push(
      groupFeature('seek', pairCopy.pair, catalog.groups.seek.pairs.map(pairFeature)),
      groupFeature('percentage', SEEK_SECTION_COPY[resolvedLocale].percentage, catalog.groups.percentage.actions.map(action => generalFeature(action, category))),
    )
    const favoritesFeature = (feature: ManagedFavoritesFeature, label: string): PageFeature => ({
      id: feature, label, visible: !settings.hiddenFeatures.includes(feature),
      matches: !settings.hiddenFeatures.includes(feature) && matchesSettings(feature, shortcutQuery),
      control: <FeatureCheckbox checked={!settings.hiddenFeatures.includes(feature)} aria-label={featureCopy.show.replace('{action}', label)}
        onCheckedChange={next => updateSettings(current => setFavoritesFeatureEnabled(current, feature, next === true))} />,
    })
    if (category === 'subtitles') entries.push(...settings.subtitleSizeShortcuts.map(shortcut => generalFeature(shortcut.id, category)),
      favoritesFeature('subtitleFavorites', copy.subtitleFavorites.title))
    if (category === 'volume') entries.push(favoritesFeature('audioFavorites', getAudioFavoritesCopy(resolvedLocale).title))
    return entries
  }
  const featureManager = (id: string, entries: ReturnType<typeof pageFeatures>) => {
    if (searchingShortcuts) return null
    return <PageFeatureManager locale={resolvedLocale} entries={entries} open={managingPage === id} stale={management.stale}
      onOpenChange={open => setManaging(id, open)} onApply={() => { management.apply(); setManagingPage(null); editor.dismissConflict(); seekEditor.dismissConflict() }} />
  }

  if (!loaded) return null

  const subtitleEnableGuidance = <>
    {subtitleNavigationCopy.requiresEnabled}{' '}
    <a href="#enable-shortcut-override"
      className="inline-block rounded-sm text-foreground underline underline-offset-4 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      onClick={event => {
        event.preventDefault()
        setSubtitleGuideRequested(false)
        globalEnableSwitch.current?.scrollIntoView({ block: 'center' })
        globalEnableSwitch.current?.focus({ preventScroll: true })
      }}>
      {subtitleNavigationCopy.goToGeneralSettings}
    </a>
  </>

  const subtitleNavigationActions = <div className="ml-auto flex max-w-full flex-wrap items-center justify-end gap-3">
    <Popover open={showSubtitleGuide} onOpenChange={setSubtitleGuideRequested}>
      <PopoverAnchor asChild>
        <div ref={subtitleActivationAnchor} className="flex min-w-0 items-center gap-2">
          <Label htmlFor="subtitle-navigation-enabled" className="text-muted-foreground">{activationCopy.enableLabel}</Label>
          <Switch id="subtitle-navigation-enabled" disabled={!settings.enabled || subtitlePermissionPending} checked={settings.subtitleNavigation.enabled} aria-label={subtitleNavigationCopy.enabled}
            aria-busy={subtitlePermissionPending} aria-describedby={[showSubtitleGuide && 'subtitle-activation-guide', subtitlePermissionError && 'subtitle-permission-error'].filter(Boolean).join(' ') || undefined}
            onCheckedChange={enabled => {
              if (!enabled) setSubtitleGuideRequested(false)
              subtitleActivation.setEnabled(enabled)
            }} />
        </div>
      </PopoverAnchor>
      <PopoverContent side="bottom" align="end" sideOffset={10} collisionPadding={16} className="w-80 max-w-[calc(100vw-2rem)] gap-2 p-3"
        aria-label={browserCopy.subtitleNavigation} aria-describedby="subtitle-activation-guide subtitle-activation-permission"
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
    <ResetButton locale={resolvedLocale} disabled={!settings.enabled} label={subtitleNavigationCopy.resetAll} description={RESET_SCOPE_COPY[resolvedLocale].subtitleNavigation}
      onClick={() => updateSettings(current => ({ ...current, subtitleNavigation: { ...current.subtitleNavigation, bindings: resetSubtitleNavigationBindings(current, browserCapabilities.supportsSubtitlePreservingPip) } }))}>{copy.reset}</ResetButton>
    {featureManager('subtitleNavigation', navigationFeatures)}
  </div>

  const subtitleNavigationPanel = (
              <div role="group" aria-label={browserCopy.subtitleNavigation} id="subtitle-navigation" ref={subtitleSection} tabIndex={-1}
                className="flex min-w-0 scroll-mt-6 flex-col gap-3 border-t pt-6 focus-visible:outline-2 focus-visible:outline-ring">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 id="subtitle-navigation-heading" className="text-base font-semibold">{browserCopy.subtitleNavigation}</h3>
                  {subtitleNavigationActions}
                </div>
                <div className="min-w-0">
                  {!settings.enabled && !showSubtitleGuide && <p className="mb-3 text-xs text-muted-foreground">{subtitleEnableGuidance}</p>}
                  {subtitlePermissionError && settings.enabled && (
                    <Alert id="subtitle-permission-error" variant="destructive" className="mb-3">
                      <AlertTitle>{SUBTITLE_PERMISSION_COPY[resolvedLocale][subtitlePermissionError]}</AlertTitle>
                    </Alert>
                  )}
                  <Table aria-label={browserCopy.subtitleNavigation} className={cn("min-w-[32rem] table-fixed", !settings.enabled && "opacity-60")}>
                    <ShortcutTableHeader labels={copy} />
                    <TableBody>{visibleSubtitleNavigationActions.map(action => {
                      const binding = settings.subtitleNavigation.bindings[action]
                      const { overridingAction } = getSubtitleNavigationAvailability(settings, action, browserCapabilities.supportsSubtitlePreservingPip)
                      const overrideDescription = overridingAction ? subtitlePopupCopy.overriddenBy.replace('{action}', actionLabels[overridingAction]) : undefined
                      return <TableRow key={action}>
                        <TableCell className="font-medium whitespace-normal">
                          <span>{subtitleNavigationCopy[action]}</span>
                          {action === 'replay' && <p className="mt-1 text-xs font-normal text-muted-foreground">{subtitleNavigationCopy.replayHint}</p>}
                        </TableCell>
                        <TableCell><div className="flex flex-wrap items-center gap-1.5"><KeyBindingKbd binding={binding.key} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
                          {overridingAction && <Badge variant="secondary" className="max-w-full whitespace-normal" title={overrideDescription} aria-label={overrideDescription}>{subtitlePopupCopy.overridden}</Badge>}
                        </div></TableCell>
                        <TableCell>{conflictSwitch({ group: 'subtitleNavigation', action }, !settings.enabled || !settings.subtitleNavigation.enabled)}</TableCell>
                        <TableCell><div className="flex items-center justify-end gap-2">
                          <Button disabled={!settings.enabled} variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground"
                            aria-label={`${copy.edit} ${subtitleNavigationCopy[action]}`}
                            onClick={event => editor.edit({ group: 'subtitleNavigation', action }, event.currentTarget)}><PencilIcon /></Button>
                          <ResetButton locale={resolvedLocale} disabled={!settings.enabled} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground"
                            label={`${copy.reset} ${subtitleNavigationCopy[action]}`} description={RESET_SCOPE_COPY[resolvedLocale].binding}
                            onClick={() => editor.resetBinding({ group: 'subtitleNavigation', action })} />
                        </div></TableCell>
                      </TableRow>
                    })}</TableBody>
                  </Table>
                </div>
              </div>
  )
  const shortcutPageActions = (category: ShortcutCategory) => <div className="flex items-center gap-2">
    <ResetButton locale={resolvedLocale} label={copy.resetAll} description={RESET_SCOPE_COPY[resolvedLocale].generalShortcuts} onClick={resetShortcutBindings}>{copy.reset}</ResetButton>
    {featureManager(category, pageFeatures(category))}
  </div>
  const pages: OptionsPageDescriptor[] = SHORTCUT_GROUPS.map(({ title, actions }) => ({
                      id: title,
                      titleActions: title === 'subtitles' ? null : shortcutPageActions(title),
                      group: 'shortcuts',
                      label: title === 'subtitles' ? copy.shortcutGroups.subtitles : shortcutGroupLabels[title],
                      afterContent: title === 'speed' ? <SpeedRangeSettings locale={resolvedLocale} form={speedForm} updateSettings={updateSettings} />
                        : title === 'subtitles' ? subtitleNavigationPanel : undefined,
                      afterContentInCard: title === 'subtitles',
                      afterContentMatches: (title === 'speed' && matchesSpeedRange) || (title === 'subtitles' && (visibleSubtitleNavigationActions.length > 0 || matchesSettings('subtitleNavigation', shortcutQuery))),
                      matches: pageFeatures(title).some(entry => entry.matches) || (title === 'seeking' ? visibleSeekGroups.length > 0 : actions.some(action => action === 'cycleSubtitleSize'
                        ? matchesSubtitleSize(action) || settings.subtitleSizeShortcuts.some(shortcut => matchesSubtitleSize(shortcut.id))
                        : matchesShortcut(action, title)) || (title === 'speed' && catalog.groups.preferredSpeed.actions.some(action => matchesShortcut(action, 'speed'))) || (title === 'playback' && matchesHoldSpeed) || (title === 'subtitles' && matchesSubtitleFavorites) || (title === 'volume' && matchesAudioFavorites)),
                      content: <section role="group" aria-label={shortcutGroupLabels[title]} className="flex min-w-0 flex-col gap-3">
                        {!pageFeatures(title).some(entry => entry.visible) && <p role="status" className="py-3 text-sm text-muted-foreground">{featureCopy.empty}</p>}
                        {title === 'subtitles' ? <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="text-base font-semibold">{shortcutGroupLabels[title]}</h3>
                          {!searchingShortcuts && shortcutPageActions(title)}
                        </div> : <h3 className={cn('font-semibold', !searchingShortcuts && 'sr-only')}>{shortcutGroupLabels[title]}</h3>}
                        <Table className="min-w-[32rem] table-fixed" aria-label={shortcutGroupLabels[title]}>
                          <ShortcutTableHeader labels={copy} />
                          <TableBody>
                        {actions.map(action => {
                          if (action === 'setPreferredSpeed') return <PreferredSpeedShortcutSettings key={action} settings={settings} locale={resolvedLocale}
                            editor={editor} updateSettings={updateSettings} conflictSwitch={conflictSwitch} isVisible={id => matchesShortcut(id, 'speed')}
                            open={searchingShortcuts || expandedShortcutGroups.has('preferredSpeed')} collapsible={!searchingShortcuts}
                            onOpenChange={open => setShortcutGroupOpen('preferredSpeed', open)} />
                          if (action === 'cycleSubtitleSize') return <SubtitleSizeShortcutRows key={action} isVisible={matchesSubtitleSize}
                            settings={settings} locale={resolvedLocale} editor={sizeEditor}
                            updateSettings={updateSettings} conflictSwitch={conflictSwitch}
                            />
                          if (!matchesShortcut(action, title) && !(action === catalog.holdSpeed.parentAction && matchesHoldSpeed)) return null
                          const binding = settings.bindings[action]
                          const replacedNetflixKeys = getReplacedNetflixNativeKeyBindings(
                            action,
                            binding
                          )
                          const { supported: actionSupported } = getShortcutAvailability(
                            settings, action, browserCapabilities.supportsSubtitlePreservingPip,
                          )
                          const actionHint = action === 'pictureInPicture'
                            ? actionSupported ? copy.pictureInPictureTooltip : copy.pictureInPictureUnsupported
                            : action === 'previousFrame' || action === 'nextFrame' ? copy.frameStepTooltip : null
                          return (
                            <Fragment key={action}>
                              <TableRow className={cn(action === catalog.holdSpeed.parentAction && matchesHoldSpeed && 'hover:bg-transparent has-aria-expanded:bg-transparent')}>
                                <TableCell className={cn('font-medium whitespace-normal', action === catalog.holdSpeed.parentAction && matchesHoldSpeed && !searchingShortcuts && 'p-0')}>
                                  <div className="flex items-center gap-1.5">
                                    {action === catalog.holdSpeed.parentAction && matchesHoldSpeed && !searchingShortcuts
                                      ? <ShortcutGroupToggle label={copy.actions[action]} open={holdSpeedExpanded} aria-controls={holdSpeedSettingsId}
                                        onClick={() => setShortcutGroupOpen('holdSpeed', !holdSpeedExpanded)}
                                        className="px-2 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring" />
                                      : <span>{copy.actions[action]}</span>}
                                    {actionHint && (
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
                                          {actionHint}
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col items-start gap-1">
                                    <div className="flex min-w-0 max-w-full flex-wrap items-center gap-1.5">
                                      <KeyBindingKbd binding={binding.key} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
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
                                      onClick={event => editor.edit({ group: 'general', action }, event.currentTarget)}
                                      aria-label={`${copy.edit} ${copy.actions[action]}`}
                                    >
                                      <PencilIcon />
                                    </Button>
                                    <ResetButton locale={resolvedLocale} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground"
                                      disabled={!actionSupported} onClick={() => editor.resetBinding({ group: 'general', action })}
                                      label={`${copy.reset} ${copy.actions[action]}`} description={RESET_SCOPE_COPY[resolvedLocale].binding} />
                                  </div>
                                </TableCell>
                              </TableRow>
                              {action === catalog.holdSpeed.parentAction && matchesHoldSpeed && <HoldSpeedShortcutSettings locale={resolvedLocale} settings={settings} form={holdSpeedForm} updateSettings={updateSettings}
                                id={holdSpeedSettingsId} open={holdSpeedExpanded} />}
                            </Fragment>
                          )
                        })}
                        {title === 'volume' && matchesAudioFavorites && <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                          <TableCell colSpan={5} className="p-0">
                            <AudioFavoritesCard favorites={settings.audioFavorites} locale={resolvedLocale} collapsible={!searchingShortcuts}
                              onChange={update => updateSettings(current => ({ ...current, audioFavorites: update(current.audioFavorites) }))} />
                          </TableCell>
                        </TableRow>}
                        {title === 'subtitles' && matchesSubtitleFavorites && <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                          <TableCell colSpan={4} className="p-0 whitespace-normal">
                            <SubtitleFavoritesCard favorites={settings.subtitleFavorites} locale={resolvedLocale} collapsible={!searchingShortcuts}
                              onChange={update => updateSettings(current => ({ ...current, subtitleFavorites: update(current.subtitleFavorites) }))} />
                          </TableCell>
                        </TableRow>}
                        {title === 'seeking' && visibleSeekGroups.map(seekTitle => (
                          <ShortcutTableGroup key={seekTitle} label={shortcutGroupLabels[seekTitle]} collapsible={!searchingShortcuts}
                            open={searchingShortcuts || expandedShortcutGroups.has(seekTitle)} onOpenChange={open => setShortcutGroupOpen(seekTitle, open)}
                            controls={expand => addSeekControl(seekTitle === 'seek' ? 'relative' : 'percentage', expand)}
                            columns={seekTitle === 'seek' ? [20, 25, 25, 12, 18] : undefined}
                            emptyState={seekTitle === 'percentage' && !catalog.groups.percentage.shortcuts.length
                              ? <p>{SEEK_SECTION_COPY[resolvedLocale].emptyPercentage}</p> : undefined}
                            tableHeader={<TableHeader><TableRow className="hover:bg-transparent">
                              <TableHead>{seekTitle === 'seek' ? seekCopy.seconds : seekCopy.percentage}</TableHead>
                              {seekTitle === 'seek' ? <><TableHead>{pairCopy.forwardKey}</TableHead><TableHead>{pairCopy.backwardKey}</TableHead></> : <TableHead>{copy.key}</TableHead>}
                              <TableHead>{copy.status}</TableHead><TableHead className="text-right">{copy.columnActions}</TableHead>
                            </TableRow></TableHeader>}>
                          {seekTitle === 'seek' && matchesSeekPair() && <TableRow aria-label={pairCopy.group.replace('{value}', String(settings.seek.seconds))}>
                            <TableCell>{settings.seek.seconds} {pairCopy.unit}</TableCell>
                            {seekBindingCell(catalog.groups.seek.pairs[0].actions.forward)}
                            {seekBindingCell(catalog.groups.seek.pairs[0].actions.backward)}
                            <TableCell>{seekPairSwitch({ kind: 'builtin' }, pairCopy.group.replace('{value}', String(settings.seek.seconds)))}</TableCell>
                            <TableCell><div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={`${copy.edit} ${pairCopy.group.replace('{value}', String(settings.seek.seconds))}`} onClick={event => seekEditor.open({ kind: 'builtin' }, event.currentTarget)}><PencilIcon /></Button>
                              <ResetButton locale={resolvedLocale} variant="ghost" iconOnly className="text-muted-foreground focus-visible:text-foreground" onClick={seekEditor.resetBuiltin} label={copy.resetSeekSettings} description={RESET_SCOPE_COPY[resolvedLocale].seekInterval} />
                            </div></TableCell>
                          </TableRow>}
                          {(seekTitle === 'seek'
                            ? catalog.groups.seek.pairs.flatMap(pair => pair.shortcut && matchesSeekPair(pair) ? [pair.shortcut] : [])
                            : catalog.groups.percentage.shortcuts.filter(matchesPercentage)).map(shortcut => {
                            const pair = catalog.groups.seek.pairs.find(pair => pair.id === shortcut.id)
                            const label = getSeekShortcutLabel(shortcut, resolvedLocale)
                            const remove = <DeleteButton locale={resolvedLocale} className="text-muted-foreground focus-visible:text-foreground" label={seekCopy.remove.replace('{action}', label)} onClick={() => updateSettings(current => {
                              const bindings = { ...current.bindings }
                              for (const action of pair ? [pair.actions.backward, pair.actions.forward] : [shortcut.id]) delete bindings[action]
                              return { ...current, bindings, seekShortcuts: current.seekShortcuts.filter(item => item.id !== shortcut.id) }
                            })} />
                            if (shortcut.kind === 'relative') return <TableRow key={shortcut.id} aria-label={label}>
                              <TableCell>{shortcut.value} {pairCopy.unit}</TableCell>
                              {seekBindingCell(pair!.actions.forward)}
                              {seekBindingCell(pair!.actions.backward)}
                              <TableCell>{seekPairSwitch({ kind: 'custom', shortcut }, label)}</TableCell>
                              <TableCell><div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={`${copy.edit} ${label}`} onClick={event => seekEditor.open({ kind: 'custom', shortcut }, event.currentTarget)}><PencilIcon /></Button>
                                {remove}
                              </div></TableCell>
                            </TableRow>
                            const binding = settings.bindings[shortcut.id]
                            return <TableRow key={shortcut.id} aria-label={label}>
                              <TableCell className="font-medium whitespace-normal">
                                <div className="flex flex-wrap items-center gap-3">
                                  <span>{label}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <KeyBindingKbd binding={binding.key} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
                              </TableCell>
                              <TableCell>{conflictSwitch({ group: 'general', action: shortcut.id }, false)}</TableCell>
                              <TableCell><div className="flex items-center justify-end gap-2">
                                <Button variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground" aria-label={`${copy.edit} ${label}`} onClick={event => seekEditor.open({ kind: 'custom', shortcut }, event.currentTarget)}><PencilIcon /></Button>
                                {remove}
                              </div></TableCell>
                            </TableRow>
                          })}
                          </ShortcutTableGroup>
                        ))}
                          </TableBody>
                        </Table>
                      </section>,
                    }))
  pages.push(
    { id: 'general', label: copy.quickSettings, group: 'settings', matches: matchesSettings('general', shortcutQuery), content:               <Card>
                <CardHeader>
                  <CardTitle>
                    {searchingShortcuts ? copy.quickSettings : <OptionsBreadcrumb locale={resolvedLocale} group="settings" label={copy.quickSettings} />}
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
                      <FieldLabel>{copy.uiStyle}</FieldLabel>
                      <ChoiceCombobox
                        className="w-36"
                        size="default"
                        label={copy.uiStyle}
                        value={settings.uiStyle}
                        options={getUiStyleOptions(resolvedLocale)}
                        onChange={uiStyle => updateSettings(current => ({ ...current, uiStyle }))}
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
                      <SettingLabelWithTooltip htmlFor={pauseOverlaySettingsId}
                        label={copy.hidePauseOverlay} tooltip={copy.hidePauseOverlayDescription} />
                      <Switch id={pauseOverlaySettingsId}
                        checked={settings.hidePauseOverlay} disabled={!settings.enabled}
                        onCheckedChange={hidePauseOverlay => updateSettings(current => ({ ...current, hidePauseOverlay }))} />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card> },
    { id: 'automation', label: copy.autoSkip, group: 'settings', matches: matchesSettings('automation', shortcutQuery), content:               <Card>
                <CardHeader>
                  <CardTitle>
                    {searchingShortcuts ? copy.autoSkip : <OptionsBreadcrumb locale={resolvedLocale} group="settings" label={copy.autoSkip} />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup role="group" aria-label={copy.autoSkip}>
                    {([
                      ['intro', copy.autoSkipIntro],
                      ['recap', copy.autoSkipRecap],
                    ] as const).map(([kind, label]) => (
                      <div key={kind} className="flex items-center justify-between gap-3">
                        <FieldLabel htmlFor={`auto-skip-${kind}`} aria-disabled={!settings.enabled}>
                          {label}
                        </FieldLabel>
                        <Switch
                          id={`auto-skip-${kind}`}
                          checked={settings.autoSkip[kind]}
                          disabled={!settings.enabled}
                          onCheckedChange={checked => updateSettings(current => ({
                            ...current,
                            autoSkip: { ...current.autoSkip, [kind]: checked },
                          }))}
                        />
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3">
                      <FieldLabel htmlFor="auto-next-episode" aria-disabled={!settings.enabled}>
                        {copy.autoNextEpisode}
                      </FieldLabel>
                      <Switch
                        id="auto-next-episode"
                        checked={settings.autoNextEpisode}
                        disabled={!settings.enabled}
                        onCheckedChange={autoNextEpisode => updateSettings(current => ({ ...current, autoNextEpisode }))}
                      />
                    </div>
                  </FieldGroup>
                </CardContent>
              </Card> },
    { id: 'backup', label: copy.backupRestore, group: 'settings', matches: matchesSettings('backup', shortcutQuery), content:               <SettingsTransferCard
                title={searchingShortcuts ? copy.backupRestore : <OptionsBreadcrumb locale={resolvedLocale} group="settings" label={copy.backupRestore} />}
                copy={copy}
                locale={resolvedLocale}
                settings={settings}
                onImport={replaceSettings}
              /> },
    { id: 'help', label: HELP_UI_COPY[resolvedLocale].title, group: 'help', content: <HelpPage
      locale={resolvedLocale} query={shortcutQuery} /> },
  )

  return (
    <TooltipProvider>
      <OptionsLayout locale={resolvedLocale} pages={pages} activePage={activeShortcutCategory}
        onPageChange={page => {
          setManagingPage(null)
          cancelFeaturePreview()
          window.history.replaceState(null, '', OPTIONS_PAGE_HASHES[page])
          setActiveShortcutCategory(page)
          setSubtitleGuideRequested(false)
        }}
        query={shortcutQuery} onQueryChange={query => { setManagingPage(null); cancelFeaturePreview(); setShortcutQuery(query) }}
        globalControl={                  <Field orientation="horizontal" className="min-h-8 items-center justify-between gap-3">
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
                  </Field>}
        header={          <header className="flex flex-col gap-2 py-2">
            <div className="flex min-w-0 items-center justify-between gap-2 sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 sm:pl-2">
                <img src="/icons/icon48.png" alt="" className="app-brand-icon size-8 shrink-0 sm:size-10" />
                <h1 className="min-w-0 font-heading text-xl font-black leading-tight tracking-tight wrap-break-word sm:text-2xl">
                  {copy.appTitle}
                </h1>
              </div>
              <nav className="flex shrink-0 items-center gap-1 sm:gap-2 sm:pr-2">
                <Tooltip>
                  <TooltipTrigger asChild><Button variant="outline" size="icon" asChild>
                    <a
                      href={EXTERNAL_LINKS.githubRepository}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={copy.githubRepositoryAriaLabel}
                    >
                      <GitHubIcon aria-hidden="true" />
                    </a>
                  </Button></TooltipTrigger>
                  <TooltipContent side="bottom">{copy.githubRepository}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild><Button variant="outline" size="icon" asChild>
                    <a
                      href={getShortcutOverrideRatingUrl()}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={copy.rateExtensionAriaLabel}
                    >
                      <StarIcon aria-hidden="true" />
                    </a>
                  </Button></TooltipTrigger>
                  <TooltipContent side="bottom">{copy.rateExtension}</TooltipContent>
                </Tooltip>
                <OtherProjectsSelect
                  iconOnly
                  className="rounded-[var(--ui-control-radius)]"
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
          </header>}
        shortcutActions={<ResetButton locale={resolvedLocale} label={copy.resetAll} description={RESET_SCOPE_COPY[resolvedLocale].generalShortcuts} onClick={resetShortcutBindings}>{copy.reset}</ResetButton>} />

      <SubtitleSizeDialog editor={sizeEditor} settings={settings} locale={resolvedLocale} />
      <SeekShortcutDialog editor={seekEditor} settings={settings} locale={resolvedLocale} />

      <Dialog open={Boolean(recorder)} onOpenChange={open => !open && editor.closeRecorder()}>
        <DialogContent
          onOpenAutoFocus={event => {
            event.preventDefault()
            if (recorder?.preferredSpeed !== undefined) preferredSpeedInput.current?.focus({ preventScroll: true })
            else recordingArea.current?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={editor.restoreRecorderFocus}
          onKeyDown={event => {
            if (!recorder) return
            if (event.key === 'Tab' || event.key === 'Escape') return
            if (event.target !== event.currentTarget && !recordingArea.current?.contains(event.target as Node)) return
            if (recorder.preferredSpeed !== undefined && (
              !recordingArea.current?.contains(event.target as Node) || event.key === 'Tab' || event.key === 'Escape'
            )) return
            if (ignoredRecordKeys.has(event.code)) return
            event.preventDefault()
            event.stopPropagation()
            editor.capture(keyBindingFromEvent(event))
          }}
        >
          <DialogHeader>
            <DialogTitle>{recorder?.preferredSpeed !== undefined ? copy.preferredSpeed : copy.recordTitle}</DialogTitle>
            <DialogDescription>{recorder?.preferredSpeed !== undefined ? speedCopy.preferredDescription : `${copy.recordDesc} ${copy.shortcutOptional}`}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            {recorder?.preferredSpeed !== undefined && <FieldGroup>
              <NumericSettingField ref={preferredSpeedInput} id="preferred-speed" label={speedCopy.rate} tooltip={copy.preferredSpeedTooltip}
                layout="inline-range" unit="×"
                min={SPEED_LIMITS.preferred.min} max={SPEED_LIMITS.preferred.max} step={SPEED_LIMITS.preferred.inputStep}
                value={recorder.preferredSpeed} onValueChange={editor.setPreferredSpeed} onBlur={editor.normalizePreferredSpeed}
                onDragCommit={editor.normalizePreferredSpeed} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} />
            </FieldGroup>}
            {recorder?.preferredSpeed !== undefined && <Label id="preferred-speed-key-label">{copy.key}</Label>}
            <ShortcutRecordingArea ref={recordingArea} aria-label={recorder?.preferredSpeed !== undefined ? undefined : copy.recordTitle}
              aria-labelledby={recorder?.preferredSpeed !== undefined ? 'preferred-speed-key-label' : undefined}
              tabIndex={recorder?.preferredSpeed !== undefined ? 0 : -1} onClick={event => event.currentTarget.focus()}
              onClear={() => editor.capture(null)} clearLabel={copy.clearShortcut}
              binding={recorder?.draft} placeholder={copy.pressKey} idlePlaceholder={copy.shortcutPlaceholder} aria-invalid={Boolean(recorder?.activeConflict)} />
            {recorder?.preferredSpeedStale && <Alert variant="destructive"><AlertTitle>{speedCopy.changed}</AlertTitle></Alert>}
            {recorder?.storageFull && <Alert variant="destructive"><AlertTitle>{copy.settingsStorageFull}</AlertTitle></Alert>}
            {recorder?.draft && !recorder.preferredSpeedStale && (
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

          <DialogFooter className="sm:justify-between">
            <RestoreButton onClick={editor.restoreSavedDraft} disabled={!recorder?.canRestoreDraft}
              label={copy.restore}
              description={RESET_SCOPE_COPY[resolvedLocale].restoreDraft} />
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
