import { getCopy } from '@/shared/i18n'
import { OPTIONS_LAYOUT_COPY, SHORTCUT_CATEGORIES, type ShortcutCategory } from '@/shared/options-navigation'
import { getShortcutLabels, getRelativeSeekLabel } from '@/shared/seek-shortcuts'
import { createShortcutCatalog } from '@/shared/shortcut-catalog'
import { createShortcutSearchIndex, matchesShortcutSearch } from '@/shared/shortcut-search'
import { SHORTCUT_GROUPS } from '@/shared/shortcut-groups'
import type { ShortcutTarget } from '@/shared/shortcut-routing'
import { SUBTITLE_NAVIGATION_ACTIONS, type KeyBinding, type Locale, type ShortcutSettings } from '@/shared/shortcut-types'
import { SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'
import { formatSubtitleSizes } from '@/shared/subtitle-size-shortcuts'

export type PopupShortcutRow = {
  id: string
  target: ShortcutTarget
  label: string
  key: KeyBinding | null
  enabled: boolean
  keywords: string[]
  parentId?: string
  displayValue?: string
}

export function getPopupShortcutCategories(settings: ShortcutSettings, locale: Locale) {
  const copy = getCopy(locale)
  const searchIndex = createShortcutSearchIndex(settings)
  const catalog = createShortcutCatalog(settings)
  const { holdSpeed } = catalog
  const labels = getShortcutLabels(settings, locale)
  const subtitleCopy = SUBTITLE_NAVIGATION_COPY[locale]
  const categoryLabels: Record<ShortcutCategory, string> = {
    ...copy.shortcutGroups,
    seeking: OPTIONS_LAYOUT_COPY[locale].seeking,
    volume: OPTIONS_LAYOUT_COPY[locale].volume,
  }
  const rows: Record<ShortcutCategory, PopupShortcutRow[]> = {
    playback: [], seeking: [], subtitles: [], volume: [], speed: [],
  }
  const addGeneral = (category: ShortcutCategory, action: keyof ShortcutSettings['bindings'], label = labels[action], keywords: string[] = []) => {
    const binding = settings.bindings[action]
    rows[category].push({ id: action, target: { group: 'general', action }, label, ...binding, keywords: [...searchIndex.general(action, category), ...keywords] })
  }
  for (const { title, actions } of SHORTCUT_GROUPS) {
    for (const action of actions) {
      const label = action === 'cycleSubtitleSize' ? `${labels[action]} · ${formatSubtitleSizes(settings.subtitleSizeCycle)}`
        : action === 'setPreferredSpeed' ? `${labels[action]} · ${settings.speed.preferred}×` : labels[action]
      addGeneral(title, action, label)
      if (action === holdSpeed.parentAction && !settings.hiddenFeatures.includes(holdSpeed.id)) {
        const binding = settings.bindings[holdSpeed.parentAction]
        rows.playback.push({
          id: holdSpeed.id, parentId: holdSpeed.parentAction, target: { group: 'general', action: holdSpeed.parentAction },
          label: copy.holdSpeedRate, displayValue: `${settings.holdSpeed.speed}×`, key: binding.key,
          enabled: binding.enabled && settings.holdSpeed.enabled,
          keywords: [...searchIndex.holdSpeed, ...searchIndex.general(holdSpeed.parentAction, 'playback')],
        })
      }
      if (action === 'setPreferredSpeed') {
        for (const member of catalog.groups.preferredSpeed.actions) {
          if (member !== action) addGeneral('speed', member)
        }
      }
    }
  }
  for (const shortcut of settings.subtitleSizeShortcuts) addGeneral('subtitles', shortcut.id)
  const builtinPair = catalog.groups.seek.pairs[0]
  for (const direction of ['backward', 'forward'] as const) {
    addGeneral('seeking', builtinPair.actions[direction], getRelativeSeekLabel(settings.seek.seconds, locale, direction), searchIndex.seekPair)
  }
  for (const shortcut of settings.seekShortcuts) {
    if (shortcut.kind === 'relative') {
      const pair = catalog.groups.seek.pairs.find(pair => pair.id === shortcut.id)!
      for (const action of [pair.actions.backward, pair.actions.forward]) {
        addGeneral('seeking', action, undefined, searchIndex.seekPair)
      }
    } else addGeneral('seeking', shortcut.id, undefined, searchIndex.seekPercentage)
  }
  for (const action of SUBTITLE_NAVIGATION_ACTIONS) {
    rows.subtitles.push({
      id: `subtitleNavigation:${action}`, target: { group: 'subtitleNavigation', action },
      label: subtitleCopy[action], ...settings.subtitleNavigation.bindings[action],
      keywords: searchIndex.subtitleNavigation(action),
    })
  }
  return SHORTCUT_CATEGORIES.map(id => ({ id, label: categoryLabels[id], rows: rows[id] }))
}

export const matchesPopupShortcut = (row: PopupShortcutRow, category: ShortcutCategory, categoryLabel: string, query: string) =>
  matchesShortcutSearch([row.label, row.displayValue ?? '', ...row.keywords, category, categoryLabel], row.key, query)
