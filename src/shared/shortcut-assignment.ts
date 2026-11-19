import {
  bindingMatchesKey,
  bindingWithKeys,
  getBindingKeys,
  getShortcutActions,
  keyBindingsEqual,
  keyListsEqual,
} from './shortcut-bindings'
import { createShortcutCatalog } from './shortcut-catalog'
import { getShortcutAvailability, type ShortcutTarget } from './shortcut-routing'
import { DEFAULT_SUBTITLE_NAVIGATION_BINDINGS } from './subtitle-navigation'
import { SUBTITLE_NAVIGATION_ACTIONS, type ShortcutBinding, type ShortcutSettings, type KeyBinding } from './shortcut-types'

type AssignmentAction = ShortcutTarget['action']
export type ShortcutKeyConflict = {
  key: KeyBinding
  duplicate: boolean
  actions: AssignmentAction[]
}
export type ShortcutAssignment = ShortcutTarget & {
  key: KeyBinding | null
  additionalKeys?: KeyBinding[]
  savedKey?: KeyBinding | null
  savedAdditionalKeys?: KeyBinding[]
}
type AssignmentOptions = { supportsSubtitlePreservingPip: boolean; enabled: boolean }

const bindingFor = (settings: ShortcutSettings, target: ShortcutTarget): ShortcutBinding | undefined =>
  target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]

// Enable/disable callers may omit additional keys. An explicit empty list from
// an editor or reset means clear them; omission means keep the saved list.
const withSavedAdditionalKeys = (settings: ShortcutSettings, assignments: readonly ShortcutAssignment[]) =>
  assignments.map(target => ({
    ...target,
    additionalKeys: target.additionalKeys ?? bindingFor(settings, target)?.additionalKeys,
  }))

export function resetSubtitleNavigationBindings(settings: ShortcutSettings, supportsSubtitlePreservingPip: boolean) {
  const bindings = structuredClone(DEFAULT_SUBTITLE_NAVIGATION_BINDINGS)
  const generalActions = getShortcutActions(settings).filter(action =>
    settings.bindings[action].enabled && getShortcutAvailability(settings, action, supportsSubtitlePreservingPip).supported)
  for (const action of SUBTITLE_NAVIGATION_ACTIONS) {
    if (generalActions.some(owner => bindingMatchesKey(settings.bindings[owner], bindings[action].key))) {
      bindings[action].enabled = false
    }
  }
  return bindings
}

// Every editor inspects the same consequences that will be applied at save time.
export function inspectShortcutAssignment(
  settings: ShortcutSettings,
  assignments: readonly ShortcutAssignment[],
  { supportsSubtitlePreservingPip, enabled }: AssignmentOptions,
) {
  const resolvedAssignments = withSavedAdditionalKeys(settings, assignments)
  const conflicts = new Set<AssignmentAction>()
  const affectedTargets = new Map<string, ShortcutTarget>()
  const fieldConflicts: Partial<Record<AssignmentAction, AssignmentAction>> = {}
  const keyConflicts: Partial<Record<AssignmentAction, ShortcutKeyConflict[]>> = {}
  const conflictingKeys: KeyBinding[] = []
  let hasDuplicateKeys = false
  const generalActions = getShortcutActions(settings)
  const catalog = createShortcutCatalog(settings)
  const candidates: ShortcutTarget[] = [
    ...generalActions.filter(action => getShortcutAvailability(settings, action, supportsSubtitlePreservingPip).supported)
      .map(action => ({ group: 'general' as const, action })),
    ...SUBTITLE_NAVIGATION_ACTIONS.map(action => ({ group: 'subtitleNavigation' as const, action })),
  ]

  for (const target of resolvedAssignments) {
    const keys = getBindingKeys(target)
    const peers = resolvedAssignments.filter(peer => peer.group === target.group)
    const otherFields = peers.filter(peer => peer.action !== target.action)
    const owners = enabled ? candidates.flatMap(candidate => {
      const beingEdited = peers.some(peer => peer.group === candidate.group && peer.action === candidate.action)
      const binding = bindingFor(settings, candidate)
      return !beingEdited && binding?.enabled && keys.some(key => bindingMatchesKey(binding, key))
        ? [{ ...candidate, binding }] : []
    }) : []
    const conflictsForKeys = keys.flatMap((key, index) => {
      const duplicate = keys.some((other, otherIndex) => index !== otherIndex && keyBindingsEqual(key, other))
      const otherFieldsWithKey = otherFields.filter(peer => bindingMatchesKey(peer, key))
      const ownersWithKey = owners.filter(owner => bindingMatchesKey(owner.binding, key))
      if (ownersWithKey.length) conflictingKeys.push(key)
      if (duplicate || otherFieldsWithKey.length) {
        hasDuplicateKeys = true
        fieldConflicts[target.action] = otherFieldsWithKey[0]?.action ?? fieldConflicts[target.action] ?? target.action
      }
      const actions = [...new Set([...otherFieldsWithKey, ...ownersWithKey].map(owner => owner.action))]
      return duplicate || actions.length ? [{ key, duplicate, actions }] : []
    })
    if (conflictsForKeys.length) keyConflicts[target.action] = conflictsForKeys
    fieldConflicts[target.action] ??= owners[0]?.action
    for (const owner of owners) {
      conflicts.add(owner.action)
      const pair = owner.group === 'general' ? catalog.seekPairFor(owner.action) : undefined
      const affected: ShortcutTarget[] = pair
        ? [pair.actions.backward, pair.actions.forward].map(action => ({ group: 'general', action }))
        : [owner]
      for (const member of affected) affectedTargets.set(`${member.group}:${member.action}`, member)
    }
  }
  return {
    conflicts: [...conflicts],
    affectedTargets: [...affectedTargets.values()],
    affectedActions: [...affectedTargets.values()].map(target => target.action),
    fieldConflicts,
    keyConflicts,
    conflictingKeys,
    hasDuplicateKeys,
  }
}

// A rejected assignment returns the original settings, with no partial transfer.
export function applyShortcutAssignment(
  settings: ShortcutSettings,
  assignments: readonly ShortcutAssignment[],
  options: AssignmentOptions & { transfer?: boolean },
): ShortcutSettings {
  const resolvedAssignments = withSavedAdditionalKeys(settings, assignments)
  if (!assignments.length || assignments.some(target => target.group !== assignments[0].group)) return settings
  const stale = resolvedAssignments.some(target => {
    if (!('savedKey' in target)) return false
    const saved = bindingFor(settings, target)
    return !saved || !keyBindingsEqual(saved.key, target.savedKey) ||
      !keyListsEqual(saved.additionalKeys ?? [], target.savedAdditionalKeys ?? [])
  })
  if (stale) return settings
  const analysis = inspectShortcutAssignment(settings, resolvedAssignments, options)
  if ((options.enabled && analysis.hasDuplicateKeys) || (analysis.conflicts.length && !options.transfer)) return settings

  const write = (target: ShortcutTarget, binding: ShortcutBinding) => {
    if (target.group === 'general') next = { ...next, bindings: { ...next.bindings, [target.action]: binding } }
    else next = { ...next, subtitleNavigation: { ...next.subtitleNavigation,
      bindings: { ...next.subtitleNavigation.bindings, [target.action]: binding } } }
  }
  let next = settings
  if (options.enabled && options.transfer) {
    for (const target of analysis.affectedTargets) {
      const binding = bindingFor(settings, target)
      if (binding) write(target, { ...binding, enabled: false })
    }
  }
  for (const target of resolvedAssignments) write(target, bindingWithKeys(options.enabled, getBindingKeys(target)))
  return next
}
