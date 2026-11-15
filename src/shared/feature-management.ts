import { createShortcutCatalog } from './shortcut-catalog'
import { inspectShortcutAssignment } from './shortcut-assignment'
import type { ShortcutTarget } from './shortcut-routing'
import type { ShortcutAction, ShortcutSettings } from './shortcut-types'

export const MANAGED_FEATURE_GROUPS = ['seek', 'percentage', 'preferredSpeed'] as const
export type ManagedFeatureGroup = typeof MANAGED_FEATURE_GROUPS[number]
export const MANAGED_FAVORITES_FEATURES = ['subtitleFavorites', 'audioFavorites'] as const
export type ManagedFavoritesFeature = typeof MANAGED_FAVORITES_FEATURES[number]

export function setFavoritesFeatureEnabled(settings: ShortcutSettings, feature: ManagedFavoritesFeature, enabled: boolean): ShortcutSettings {
  return { ...settings, hiddenFeatures: enabled ? settings.hiddenFeatures.filter(id => id !== feature)
    : [...new Set([...settings.hiddenFeatures, feature])] }
}

export function getActiveFavorites<Feature extends ManagedFavoritesFeature>(settings: ShortcutSettings, feature: Feature): ShortcutSettings[Feature] {
  return settings.hiddenFeatures.includes(feature) ? [] : settings[feature]
}

export function getFeatureGroupActions(settings: Pick<ShortcutSettings, 'seekShortcuts' | 'preferredSpeedShortcuts'>, group: ManagedFeatureGroup): ShortcutAction[] {
  return createShortcutCatalog(settings).groups[group].actions
}

export function isFeatureGroupHidden(settings: ShortcutSettings, group: ManagedFeatureGroup): boolean {
  const actions = getFeatureGroupActions(settings, group)
  return actions.length ? actions.every(action => isFeatureHidden(settings, { group: 'general', action }))
    : settings.hiddenFeatures.includes(`group:${group}`)
}

export function hideFeatureGroup(settings: ShortcutSettings, group: ManagedFeatureGroup): ShortcutSettings {
  const next = hideFeatures(settings, getFeatureGroupActions(settings, group).map(action => ({ group: 'general', action })))
  return { ...next, hiddenFeatures: [...new Set([...next.hiddenFeatures, `group:${group}`])] }
}

export function restoreFeatureGroup(settings: ShortcutSettings, group: ManagedFeatureGroup, supportsSubtitlePreservingPip: boolean): ShortcutSettings {
  const next = restoreFeatures(settings, getFeatureGroupActions(settings, group).map(action => ({ group: 'general', action })), supportsSubtitlePreservingPip)
  return { ...next, hiddenFeatures: next.hiddenFeatures.filter(id => id !== `group:${group}`) }
}

export const featureId = (target: ShortcutTarget) => `${target.group}:${target.action}`

export const isFeatureHidden = (settings: ShortcutSettings, target: ShortcutTarget) => {
  const binding = target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]
  return !binding?.enabled && settings.hiddenFeatures.includes(featureId(target))
}

export function hideFeatures(settings: ShortcutSettings, targets: readonly ShortcutTarget[]): ShortcutSettings {
  let next = settings
  for (const target of targets) {
    const binding = target.group === 'general' ? next.bindings[target.action] : next.subtitleNavigation.bindings[target.action]
    if (!binding) continue
    if (target.group === 'general') next = { ...next, bindings: { ...next.bindings, [target.action]: { ...binding, enabled: false } } }
    else next = { ...next, subtitleNavigation: { ...next.subtitleNavigation, bindings: { ...next.subtitleNavigation.bindings, [target.action]: { ...binding, enabled: false } } } }
    next = { ...next, hiddenFeatures: [...new Set([...next.hiddenFeatures, featureId(target)])] }
  }
  return next
}

export function restoreFeatures(settings: ShortcutSettings, targets: readonly ShortcutTarget[], supportsSubtitlePreservingPip: boolean): ShortcutSettings {
  const assignments = targets.flatMap(target => {
    const binding = target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]
    return binding ? [{ ...target, key: binding.key }] : []
  })
  const analysis = inspectShortcutAssignment(settings, assignments, { enabled: true, supportsSubtitlePreservingPip })
  const blocked = new Set(Object.entries(analysis.fieldConflicts).filter(([, conflict]) => conflict !== undefined).map(([action]) => action))
  // A seek pair is one checklist item, so either conflicting direction keeps the pair off.
  const pairs = createShortcutCatalog(settings).groups.seek.pairs.map(pair => [pair.actions.backward, pair.actions.forward])
  for (const pair of pairs) {
    if (pair.some(action => blocked.has(action))) pair.forEach(action => blocked.add(action))
  }
  let next = settings
  for (const target of assignments) {
    const binding = target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]
    const restored = { ...binding, enabled: binding.enabled || !blocked.has(target.action) }
    if (target.group === 'general') next = { ...next, bindings: { ...next.bindings, [target.action]: restored } }
    else next = { ...next, subtitleNavigation: { ...next.subtitleNavigation, bindings: { ...next.subtitleNavigation.bindings, [target.action]: restored } } }
  }
  const ids = new Set(targets.map(featureId))
  return { ...next, hiddenFeatures: next.hiddenFeatures.filter(id => !ids.has(id)) }
}
