import { getShortcutActions, keyBindingsEqual } from './shortcut-bindings'
import { createShortcutCatalog } from './shortcut-catalog'
import { getShortcutAvailability, type ShortcutTarget } from './shortcut-routing'
import { DEFAULT_SUBTITLE_NAVIGATION_BINDINGS } from './subtitle-navigation'
import { SUBTITLE_NAVIGATION_ACTIONS, type ShortcutBinding, type ShortcutSettings, type KeyBinding } from './shortcut-types'

type AssignmentAction = ShortcutTarget['action']
export type ShortcutAssignment = ShortcutTarget & { key: KeyBinding | null; savedKey?: KeyBinding | null }
type AssignmentOptions = { supportsSubtitlePreservingPip: boolean; enabled: boolean }

const bindingFor = (settings: ShortcutSettings, target: ShortcutTarget): ShortcutBinding | undefined =>
  target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]

export function resetSubtitleNavigationBindings(settings: ShortcutSettings, supportsSubtitlePreservingPip: boolean) {
  const bindings = structuredClone(DEFAULT_SUBTITLE_NAVIGATION_BINDINGS)
  const generalActions = getShortcutActions(settings).filter(action =>
    settings.bindings[action].enabled && getShortcutAvailability(settings, action, supportsSubtitlePreservingPip).supported)
  for (const action of SUBTITLE_NAVIGATION_ACTIONS) {
    if (generalActions.some(owner => keyBindingsEqual(settings.bindings[owner].key, bindings[action].key))) {
      bindings[action].enabled = false
    }
  }
  return bindings
}

// Both editors inspect the same consequences that will be applied at save time.
export function inspectShortcutAssignment(
  settings: ShortcutSettings,
  assignments: readonly ShortcutAssignment[],
  { supportsSubtitlePreservingPip, enabled }: AssignmentOptions,
) {
  const conflicts = new Set<AssignmentAction>()
  const affectedTargets = new Map<string, ShortcutTarget>()
  const fieldConflicts: Partial<Record<AssignmentAction, AssignmentAction>> = {}
  const conflictingKeys: KeyBinding[] = []
  let hasDuplicateKeys = false
  const generalActions = getShortcutActions(settings)
  const catalog = createShortcutCatalog(settings)
  const candidates: ShortcutTarget[] = [
    ...generalActions.filter(action => getShortcutAvailability(settings, action, supportsSubtitlePreservingPip).supported)
      .map(action => ({ group: 'general' as const, action })),
    ...SUBTITLE_NAVIGATION_ACTIONS.map(action => ({ group: 'subtitleNavigation' as const, action })),
  ]

  for (const target of assignments) {
    if (!target.key) continue
    const peers = assignments.filter(peer => peer.group === target.group)
    const duplicate = peers.find(peer => peer.action !== target.action && keyBindingsEqual(peer.key, target.key))
    if (duplicate) {
      hasDuplicateKeys = true
      fieldConflicts[target.action] = duplicate.action
    }
    if (!enabled) continue
    const owners = candidates.filter(candidate => !peers.some(peer => peer.group === candidate.group && peer.action === candidate.action) &&
      bindingFor(settings, candidate)?.enabled && keyBindingsEqual(bindingFor(settings, candidate)!.key, target.key))
    if (owners.length) conflictingKeys.push(target.key)
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
  return { conflicts: [...conflicts], affectedTargets: [...affectedTargets.values()], affectedActions: [...affectedTargets.values()].map(target => target.action), fieldConflicts, conflictingKeys, hasDuplicateKeys }
}

// A rejected assignment returns the original settings, with no partial transfer.
export function applyShortcutAssignment(
  settings: ShortcutSettings,
  assignments: readonly ShortcutAssignment[],
  options: AssignmentOptions & { transfer?: boolean },
): ShortcutSettings {
  if (!assignments.length || assignments.some(target => target.group !== assignments[0].group)) return settings
  if (assignments.some(target => 'savedKey' in target &&
    (!bindingFor(settings, target) || !keyBindingsEqual(bindingFor(settings, target)!.key, target.savedKey)))) return settings
  const analysis = inspectShortcutAssignment(settings, assignments, options)
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
  for (const target of assignments) write(target, { key: target.key, enabled: options.enabled })
  return next
}
