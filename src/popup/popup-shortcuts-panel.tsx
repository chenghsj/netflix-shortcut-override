import { ExternalLinkIcon, SearchIcon, XIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { ChoiceCombobox } from '@/components/choice-combobox'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { GeneralSettingsFields, PlaybackPreferenceFields } from '@/components/settings-fields'
import { Badge } from '@/components/app-ui/badge'
import { Button } from '@/components/app-ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/app-ui/input-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/app-ui/tooltip'
import { POPUP_COPY } from '@/popup/popup-copy'
import { getPopupFavoriteSections, type PopupFavoriteSection } from '@/popup/popup-favorites'
import { PopupFavoritesSection } from '@/popup/popup-favorites-section'
import { PopupSeekPairRow } from '@/popup/popup-seek-pair-row'
import { PopupShortcutGroup } from '@/popup/popup-shortcut-group'
import { EDITABLE_SETTINGS_FIELDS, findEditableSettingsFields, type EditableSettingsSection } from '@/shared/editable-settings-search'
import { isFeatureHidden } from '@/shared/feature-management'
import { createShortcutCatalog } from '@/shared/shortcut-catalog'
import { FEATURE_MANAGEMENT_COPY } from '@/shared/feature-management-copy'
import { getPopupShortcutCategories, matchesPopupShortcut, type PopupShortcutRow } from '@/popup/shortcut-catalog'
import { SUBTITLE_NAVIGATION_POPUP_COPY } from '@/popup/subtitle-navigation-copy'
import { cn } from '@/lib/utils'
import { getCopy } from '@/shared/i18n'
import { OPTIONS_LAYOUT_COPY, OPTIONS_SECTION_COPY, SETTINGS_SEARCH_COPY, type OptionsPage, type ShortcutCategory } from '@/shared/options-navigation'
import { getShortcutAvailability, getSubtitleNavigationAvailability } from '@/shared/shortcut-routing'
import { getShortcutLabels, SEEK_PAIR_COPY, SEEK_SECTION_COPY } from '@/shared/seek-shortcuts'
import type { Locale } from '@/shared/shortcut-types'
import { SPEED_SHORTCUT_COPY } from '@/shared/speed-shortcut-copy'
import { useSearchShortcut } from '@/shared/use-search-shortcut'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

export type PopupCategory = ShortcutCategory | 'general' | 'automation'

const popupRowClassName = 'flex min-h-10 items-center justify-between gap-3 border-b border-border/50 px-2 py-2 transition-colors last:border-b-0 hover:bg-accent'

type PopupShortcutsPanelProps = Pick<ReturnType<typeof useShortcutSettingsForm>, 'settings' | 'updateSettings'> & {
  locale: Locale
  supportsSubtitlePreservingPip: boolean
  category: PopupCategory
  onCategoryChange: (category: PopupCategory) => void
  query: string
  onQueryChange: (query: string) => void
  onOpenSettingsPage: (page: OptionsPage) => void
}

export function PopupShortcutsPanel({ settings, updateSettings, locale, supportsSubtitlePreservingPip,
  category, onCategoryChange, query, onQueryChange, onOpenSettingsPage }: PopupShortcutsPanelProps) {
  const copy = getCopy(locale)
  const browserCopy = OPTIONS_LAYOUT_COPY[locale]
  const searchCopy = SETTINGS_SEARCH_COPY[locale]
  const popupCopy = POPUP_COPY[locale]
  const subtitleCopy = SUBTITLE_NAVIGATION_POPUP_COPY[locale]
  const labels = getShortcutLabels(settings, locale)
  const catalog = createShortcutCatalog(settings)
  const nestedGroups = [
    { id: 'seek', label: SEEK_PAIR_COPY[locale].pair },
    { id: 'percentage', label: SEEK_SECTION_COPY[locale].percentage },
    { id: 'preferredSpeed', label: copy.preferredSpeed },
  ] as const
  const groups = nestedGroups.map(group => ({ ...group, actions: new Set(catalog.groups[group.id].actions) }))
  const nestedActions = new Set(groups.flatMap(group => [...group.actions]))
  const isNestedRow = (row: PopupShortcutRow) => row.target.group === 'general' && nestedActions.has(row.target.action)
  const input = useRef<HTMLInputElement>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set())
  const searchShortcut = useSearchShortcut(input)
  const categories = getPopupShortcutCategories(settings, locale)
  const settingsPages = [
    { value: 'general', label: copy.quickSettings },
    { value: 'automation', label: OPTIONS_SECTION_COPY[locale].playbackPreferences },
  ] as const
  const seekRows = new Map(categories.find(item => item.id === 'seeking')!.rows
    .filter(row => !isFeatureHidden(settings, row.target)).map(row => [row.id, row]))
  const searching = Boolean(query.trim())
  const activeShortcutCategory = categories.find(item => item.id === category)
  const matchingFields = searching ? findEditableSettingsFields(query, settings.speed) : undefined
  const hasSettingMatches = (section: EditableSettingsSection) =>
    EDITABLE_SETTINGS_FIELDS[section].some(field => matchingFields?.has(field))
  const visibleSettingsPages = settingsPages.filter(({ value }) => searching
    ? hasSettingMatches(value) || (value === 'automation' && hasSettingMatches('pauseScreen'))
    : value === category)
  const showSpeedRange = searching ? hasSettingMatches('speedRange') : category === 'speed'
  const speedRangeLabel = SPEED_SHORTCUT_COPY[locale].range
  const speedRangeLabels = { min: copy.minSpeed, max: copy.maxSpeed, step: copy.step }
  const favorites = getPopupFavoriteSections(settings, locale, query)
  const visibleCategories = categories.filter(item => searching || item.id === category)
    .map(item => {
      const rows = item.rows.filter(row => !isFeatureHidden(settings, row.target))
      const matchingIds = new Set(rows.filter(row => matchesPopupShortcut(row, item.id, item.label, query))
        .flatMap(row => row.parentId ? [row.id, row.parentId] : [row.id]))
      return { ...item, rows: rows.filter(row => matchingIds.has(row.id)), favorite: favorites.find(section => section.category === item.id) }
    })
    .filter(item => !searching || item.rows.length || item.favorite)

  const groupDisclosure = (id: string) => ({
    open: searching || !collapsedGroups.has(id),
    disabled: searching,
    onOpenChange: (open: boolean) => setCollapsedGroups(previous => {
      const next = new Set(previous)
      if (open) next.delete(id)
      else next.add(id)
      return next
    }),
  })

  const categorySettingsButton = (id: ShortcutCategory, label: string) => <Tooltip>
    <TooltipTrigger asChild>
      <Button type="button" variant="outline" aria-label={`${popupCopy.openSettings}: ${label}`} onClick={() => onOpenSettingsPage(id)}>
        {popupCopy.openSettings}
        <ExternalLinkIcon data-icon="inline-end" aria-hidden="true" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>{popupCopy.openCategorySettings}</TooltipContent>
  </Tooltip>

  const renderRow = (row: PopupShortcutRow, children: PopupShortcutRow[] = []) => {
    const { target } = row
    const supported = target.group !== 'general' || getShortcutAvailability(settings, target.action, supportsSubtitlePreservingPip).supported
    const overridingAction = target.group === 'subtitleNavigation'
      ? getSubtitleNavigationAvailability(settings, target.action, supportsSubtitlePreservingPip).overridingAction : undefined
    const inactive = !settings.enabled || !row.enabled || !supported || (target.group === 'subtitleNavigation' && !settings.subtitleNavigation.enabled)
    const nested = isNestedRow(row) || Boolean(row.parentId)
    const value = <span className="flex max-w-[48%] shrink-0 flex-wrap items-center justify-end gap-1">
        {row.displayValue !== undefined ? <>
          <span className={cn('font-normal tabular-nums', inactive && 'text-muted-foreground')}>{row.displayValue}</span>
          {!row.enabled && <Badge variant="secondary" className="rounded-[var(--ui-key-radius)]">{copy.disabledStatus}</Badge>}
        </> : !supported ? <Badge variant="secondary" className="rounded-[var(--ui-key-radius)]" title={copy.pictureInPictureUnsupported}>{copy.diagnosticsUnsupportedValue}</Badge>
          : !row.enabled ? <Badge variant="secondary" className="rounded-[var(--ui-key-radius)]">{copy.disabledStatus}</Badge>
            : <KeyBindingKbd binding={row.key} additionalKeys={row.additionalKeys} emptyLabel={copy.unassignedShortcut} className="flex-wrap justify-end" />}
        {overridingAction && <Badge variant="secondary" className="rounded-[var(--ui-key-radius)] whitespace-normal text-right" aria-label={subtitleCopy.overriddenBy.replace('{action}', labels[overridingAction])}>{subtitleCopy.overridden}</Badge>}
      </span>
    if (children.length) return <PopupShortcutGroup key={row.id} label={row.label} value={value}
      labelClassName={inactive ? 'text-muted-foreground' : undefined} {...groupDisclosure(row.id)}>
      {children.map(child => renderRow(child))}
    </PopupShortcutGroup>
    return <div key={row.id} className={cn(popupRowClassName, nested && 'ps-8')}>
      <span className={cn('min-w-0 text-sm leading-relaxed', nested ? 'font-normal' : 'app-popup-primary-label', inactive && 'text-muted-foreground')}>{row.label}</span>
      {value}
    </div>
  }

  const renderSeekPairs = (rows: PopupShortcutRow[]) => {
    const matches = new Set(rows.map(row => row.id))
    return catalog.groups.seek.pairs.filter(pair => matches.has(pair.actions.backward) || matches.has(pair.actions.forward)).map(pair =>
      <PopupSeekPairRow key={pair.id} seconds={pair.shortcut?.value ?? settings.seek.seconds} locale={locale} enabled={settings.enabled}
        backward={seekRows.get(pair.actions.backward)} forward={seekRows.get(pair.actions.forward)} />)
  }

  const renderRows = (rows: PopupShortcutRow[]) => <>
    {rows.filter(row => !isNestedRow(row) && !row.parentId).map(row => renderRow(row, rows.filter(child => child.parentId === row.id)))}
    {groups.map(group => {
      const children = rows.filter(row => row.target.group === 'general' && group.actions.has(row.target.action))
      if (!children.length) return null
      return <PopupShortcutGroup key={group.id} label={group.label} {...groupDisclosure(group.id)}>
        {group.id === 'seek' ? renderSeekPairs(children) : children.map(row => renderRow(row))}
      </PopupShortcutGroup>
    })}
  </>

  const renderFavorites = (section: PopupFavoriteSection) => <PopupFavoritesSection section={section} {...groupDisclosure(section.id)} />

  const renderSubtitleSection = (rows: PopupShortcutRow[], label: string, navigation: boolean, favorite?: PopupFavoriteSection) => {
    if (!rows.length && !favorite) return null
    return <section aria-label={label} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <h3 className="app-popup-section-title font-heading text-sm">{label}</h3>
        {navigation && !settings.subtitleNavigation.enabled && <Badge variant="secondary" className="rounded-[var(--ui-key-radius)]">{copy.disabledStatus}</Badge>}
      </div>
      <div>{rows.map(row => renderRow(row))}{favorite && renderFavorites(favorite)}</div>
    </section>
  }

  return <section aria-label={!searching && visibleSettingsPages.length ? browserCopy.settings : copy.shortcuts} className="app-popup-shortcuts flex flex-col gap-3 font-normal">
    <InputGroup>
      <InputGroupAddon><SearchIcon aria-hidden="true" /></InputGroupAddon>
      <InputGroupInput ref={input} autoFocus type="text" role="searchbox" enterKeyHint="search" className="text-sm" aria-label={searchCopy.search} placeholder={searchCopy.search} aria-keyshortcuts={searchShortcut.ariaKeyShortcuts}
        value={query} onChange={event => onQueryChange(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') onQueryChange('') }} />
      <InputGroupAddon align="inline-end" className="pr-3 has-[>kbd]:mr-0"><kbd aria-hidden="true" className="whitespace-nowrap font-sans text-xs font-normal text-muted-foreground">{searchShortcut.label}</kbd></InputGroupAddon>
      {query && <InputGroupAddon align="inline-end"><Button type="button" variant="ghost" size="icon-sm" aria-label={browserCopy.clear}
        onClick={() => { onQueryChange(''); input.current?.focus() }}><XIcon /></Button></InputGroupAddon>}
    </InputGroup>
    {!searching && <div className="flex items-center gap-2">
      <ChoiceCombobox<PopupCategory> changeAfterClose label={popupCopy.navigation} value={category} optionsHeading={copy.shortcuts}
        options={categories.map(({ id, label }) => ({ value: id, label }))}
        secondaryGroup={{
          heading: browserCopy.settings,
          options: settingsPages,
          links: [{ value: 'backup', label: copy.backupRestore, onSelect: () => onOpenSettingsPage('backup') }],
        }}
        size="default" className="min-w-0 flex-1" onChange={onCategoryChange} />
      {activeShortcutCategory && categorySettingsButton(activeShortcutCategory.id, activeShortcutCategory.label)}
    </div>}
    {searching && <h2 className="app-popup-section-title font-heading text-sm">{browserCopy.results}</h2>}
    {searching && !visibleCategories.length && !visibleSettingsPages.length && !showSpeedRange &&
      <p role="status" className="py-6 text-center text-sm leading-relaxed text-muted-foreground">{searchCopy.empty}</p>}
    {visibleCategories.map(item => <section key={item.id} aria-label={item.label} className="flex flex-col gap-1">
      {!item.rows.length && !item.favorite && <p role="status" className="py-6 text-sm text-muted-foreground">{FEATURE_MANAGEMENT_COPY[locale].noShortcuts}</p>}
      {searching && <div className="flex items-center justify-between gap-2">
        <h3 className="app-popup-section-title min-w-0 font-heading text-sm">{item.label}</h3>
        {categorySettingsButton(item.id, item.label)}
      </div>}
      {item.id === 'subtitles' ? <>
        {renderSubtitleSection(item.rows.filter(row => row.target.group === 'general'), browserCopy.subtitles, false, item.favorite)}
        {renderSubtitleSection(item.rows.filter(row => row.target.group === 'subtitleNavigation'), browserCopy.subtitleNavigation, true)}
      </> : (item.rows.length > 0 || item.favorite) && <div>{renderRows(item.rows)}{item.favorite && renderFavorites(item.favorite)}</div>}
    </section>)}
    {showSpeedRange && <section role="group" aria-label={speedRangeLabel} className="flex flex-col gap-1">
      <h3 className="app-popup-section-title font-heading text-sm">{speedRangeLabel}</h3>
      <dl>
        {EDITABLE_SETTINGS_FIELDS.speedRange.filter(field => matchingFields?.has(field) ?? true).map(field =>
          <div key={field} className={popupRowClassName}>
            <dt className="app-popup-primary-label min-w-0 text-sm leading-relaxed">{speedRangeLabels[field]}</dt>
            <dd className="shrink-0 font-normal tabular-nums">{settings.speed[field]}×</dd>
          </div>)}
      </dl>
    </section>}
    {visibleSettingsPages.map(page => <section key={page.value} aria-label={page.label} className="app-popup-settings flex flex-col gap-3 px-2 py-2">
      {searching && <h3 className="app-popup-section-title font-heading text-sm">{page.label}</h3>}
      {page.value === 'general'
        ? <GeneralSettingsFields settings={settings} locale={locale} updateSettings={updateSettings} visibleFields={matchingFields} />
        : <PlaybackPreferenceFields settings={settings} locale={locale} updateSettings={updateSettings} visibleFields={matchingFields} />}
    </section>)}
  </section>
}
