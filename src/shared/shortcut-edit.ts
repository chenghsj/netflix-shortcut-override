import { applyShortcutAssignment, inspectShortcutAssignment } from './shortcut-assignment'
import { getBindingKeys, isShortcutKey, MAX_SHORTCUT_KEYS } from './shortcut-bindings'
import { createShortcutCatalog } from './shortcut-catalog'
import { getSeekShortcutActions, SEEK_SHORTCUT_LIMITS } from './seek-shortcuts'
import { normalizeSpeedSettings, SEEK_LIMITS } from './shortcut-settings'
import type { ShortcutTarget } from './shortcut-routing'
import { getSubtitleSizeEditLimit, isSubtitleSizeList } from './subtitle-size-shortcuts'
import { fitsSettingsStorageLimit } from './storage'
import type {
  KeyBinding, PreferredSpeedShortcutAction, SeekShortcut, ShortcutBinding, ShortcutSettings,
  SubtitleSizeShortcutAction,
} from './shortcut-types'

export type ShortcutEditTarget =
  | { kind: 'binding'; target: ShortcutTarget }
  | { kind: 'preferredSpeed'; action: 'setPreferredSpeed' | PreferredSpeedShortcutAction; isNew?: boolean }
  | { kind: 'seek'; shortcut: SeekShortcut | null; isNew?: boolean }
  | { kind: 'subtitleSize'; action: 'cycleSubtitleSize' | SubtitleSizeShortcutAction }

export type ShortcutEditSnapshot = {
  readonly target: ShortcutEditTarget
  readonly identity: string
}

export type ShortcutEditDraft = {
  snapshot: ShortcutEditSnapshot
  keys: Partial<Record<ShortcutTarget['action'], KeyBinding | null>>
  additionalKeys?: Partial<Record<ShortcutTarget['action'], readonly (KeyBinding | null)[]>>
  enabled: boolean | 'preserve'
  value?: number | string | readonly number[]
  transfer?: boolean
  allowSubtitleEnable?: boolean
}

const bindingFor = (settings: ShortcutSettings, target: ShortcutTarget): ShortcutBinding | undefined =>
  target.group === 'general' ? settings.bindings[target.action] : settings.subtitleNavigation.bindings[target.action]

const readEntry = (settings: ShortcutSettings, target: ShortcutEditTarget) => {
  let targets: ShortcutTarget[]
  let value: unknown
  let exists = true
  switch (target.kind) {
    case 'binding':
      targets = [target.target]
      exists = Boolean(bindingFor(settings, target.target))
      break
    case 'preferredSpeed': {
      targets = [{ group: 'general', action: target.action }]
      const entry = settings.preferredSpeedShortcuts.find(item => item.id === target.action)
      value = target.action === 'setPreferredSpeed' ? settings.speed.preferred : entry?.speed
      exists = value !== undefined || Boolean(settings.bindings[target.action])
      break
    }
    case 'seek': {
      const builtin = createShortcutCatalog(settings).groups.seek.pairs[0]
      targets = (target.shortcut ? getSeekShortcutActions(target.shortcut) : [builtin.actions.backward, builtin.actions.forward])
        .map(action => ({ group: 'general', action }))
      const entry = target.shortcut && settings.seekShortcuts.find(item => item.id === target.shortcut!.id)
      value = target.shortcut ? entry : settings.seek.seconds
      exists = !target.shortcut || Boolean(entry) || targets.some(item => bindingFor(settings, item))
      break
    }
    case 'subtitleSize': {
      targets = [{ group: 'general', action: target.action }]
      value = target.action === 'cycleSubtitleSize' ? settings.subtitleSizeCycle
        : settings.subtitleSizeShortcuts.find(item => item.id === target.action)
      exists = value !== undefined && Boolean(settings.bindings[target.action])
      break
    }
  }
  const bindings = targets.map(item => bindingFor(settings, item))
  // A plain key recorder preserves the latest enabled state; parameter editors
  // protect the entire entry, including its enabled state and metadata.
  const physicalKey = (key: KeyBinding | null | undefined) => key && [key.code, key.ctrl, key.alt, key.shift, key.meta]
  const identity = JSON.stringify(target.kind === 'binding'
    ? { exists, keys: getBindingKeys(bindings[0]).map(physicalKey) }
    : { exists, value, bindings: target.kind === 'subtitleSize' ? bindings
      : bindings.map(binding => binding && { enabled: binding.enabled, keys: getBindingKeys(binding).map(physicalKey) }) })
  return { targets, bindings, value, exists, identity }
}

export const captureShortcutEdit = (settings: ShortcutSettings, target: ShortcutEditTarget): ShortcutEditSnapshot => ({
  target: structuredClone(target), identity: readEntry(settings, target).identity,
})

export const isShortcutEditCurrent = (settings: ShortcutSettings, snapshot: ShortcutEditSnapshot): boolean => {
  const entry = readEntry(settings, snapshot.target)
  const creating = 'isNew' in snapshot.target && snapshot.target.isNew
  return creating ? !entry.exists : entry.exists && entry.identity === snapshot.identity
}

// Preview and authoritative save evaluate the same edit against their respective
// settings snapshots. Rejection always returns the input settings unchanged.
export function evaluateShortcutEdit(settings: ShortcutSettings, draft: ShortcutEditDraft, supportsSubtitlePreservingPip: boolean) {
  const { snapshot, keys } = draft
  const value = typeof draft.value === 'string' ? draft.value.trim() ? Number(draft.value) : Number.NaN : draft.value
  const { target } = snapshot
  const entry = readEntry(settings, target)
  const enabled = draft.enabled === 'preserve' ? entry.bindings.some(binding => binding?.enabled) : draft.enabled
  const assignments = entry.targets.map(item => ({ ...item, key: keys[item.action] ?? null,
    additionalKeys: (draft.additionalKeys?.[item.action] ?? bindingFor(settings, item)?.additionalKeys ?? [])
      .filter((key): key is KeyBinding => key !== null) }))
  const analysis = inspectShortcutAssignment(settings, assignments, { enabled, supportsSubtitlePreservingPip })
  const stale = !isShortcutEditCurrent(settings, snapshot)
  let valid = entry.targets.every(item => isShortcutKey(keys[item.action]))
  valid &&= assignments.every(item => getBindingKeys(item).length <= MAX_SHORTCUT_KEYS && item.additionalKeys.every(isShortcutKey))
  if (target.kind === 'preferredSpeed') valid &&= typeof value === 'number' && Number.isFinite(value)
  if (target.kind === 'seek') {
    const percentage = target.shortcut?.kind === 'percentage'
    valid &&= typeof value === 'number' && Number.isInteger(value) && value >= (percentage ? 0 : 1) &&
      value <= (percentage ? 100 : target.shortcut ? SEEK_SHORTCUT_LIMITS.seconds : SEEK_LIMITS.seconds.max)
  }
  if (target.kind === 'subtitleSize') {
    const shortcut = target.action === 'cycleSubtitleSize' ? undefined
      : settings.subtitleSizeShortcuts.find(item => item.id === target.action)
    const fixed = shortcut?.kind === 'fixed'
    const savedSizes = target.action === 'cycleSubtitleSize' ? settings.subtitleSizeCycle : shortcut?.sizes ?? []
    valid &&= isSubtitleSizeList(value, fixed ? 1 : 2, getSubtitleSizeEditLimit(savedSizes)) && (!fixed || value.length === 1)
  }
  const subtitleBlocked = !draft.allowSubtitleEnable && enabled && entry.targets.some(item =>
    item.group === 'subtitleNavigation' && !bindingFor(settings, item)?.enabled &&
    (!settings.enabled || !settings.subtitleNavigation.enabled))
  const blocked = !valid || stale || subtitleBlocked || analysis.hasDuplicateKeys ||
    (analysis.conflicts.length > 0 && !draft.transfer)
  let next = settings
  if (!blocked) {
    next = applyShortcutAssignment(settings, assignments, { enabled, transfer: draft.transfer, supportsSubtitlePreservingPip })
    if (next !== settings) {
      if (target.kind === 'preferredSpeed') {
        const speed = normalizeSpeedSettings({ preferred: value as number }).preferred
        if (target.action === 'setPreferredSpeed') next = { ...next, speed: { ...next.speed, preferred: speed } }
        else {
          const shortcut = { id: target.action, speed }
          next = { ...next, preferredSpeedShortcuts: target.isNew ? [...next.preferredSpeedShortcuts, shortcut]
            : next.preferredSpeedShortcuts.map(item => item.id === target.action ? shortcut : item) }
        }
      } else if (target.kind === 'seek') {
        if (!target.shortcut) next = { ...next, seek: { ...next.seek, seconds: value as number } }
        else {
          const shortcut = { ...target.shortcut, value: value as number }
          next = { ...next, seekShortcuts: target.isNew ? [...next.seekShortcuts, shortcut]
            : next.seekShortcuts.map(item => item.id === shortcut.id ? shortcut : item) }
        }
      } else if (target.kind === 'subtitleSize') {
        const sizes = [...value as readonly number[]]
        next = target.action === 'cycleSubtitleSize' ? { ...next, subtitleSizeCycle: sizes }
          : { ...next, subtitleSizeShortcuts: next.subtitleSizeShortcuts.map(item => item.id === target.action ? { ...item, sizes } : item) }
      }
    }
  }
  // Check quota before saving so every editor can retain an oversized draft.
  const storageFull = !blocked && !fitsSettingsStorageLimit(next)
  return { settings: blocked || storageFull ? settings : next, stale, storageFull,
    canSave: !blocked && !storageFull, analysis }
}
