import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup } from './shortcut-settings'
import { DEFAULT_KEY_BINDINGS, getBindingKeys, keyBindingsEqual } from './shortcut-bindings'
import { createShortcutCatalog } from './shortcut-catalog'
import { DEFAULT_SUBTITLE_NAVIGATION_BINDINGS } from './subtitle-navigation'
import { SUBTITLE_NAVIGATION_ACTIONS, type ShortcutAction, type ShortcutSettings } from './shortcut-types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

// Older clients replace the shared object and omit fields they cannot represent.
// Restore only those missing fields; shared preferences still follow their edits.
const restoreMissingFields = (raw: unknown, normalized: unknown, saved: unknown): unknown => {
  if (raw === undefined) return saved
  if (!isRecord(raw) || !isRecord(normalized) || !isRecord(saved)) return normalized
  const restored = { ...normalized }
  for (const [key, value] of Object.entries(saved)) {
    restored[key] = restoreMissingFields(raw[key], normalized[key], value)
  }
  return restored
}

export const recoverCompatibleSettings = (raw: unknown, saved: unknown): ShortcutSettings => {
  const normalized = normalizeSettings(raw)
  if (!isRecord(raw) || !isRecord(saved)) return normalized
  const version = typeof raw.version === 'number' ? raw.version : 1
  if (typeof saved.version !== 'number' || version >= saved.version) return normalized
  const parsed = parseSettingsForBackup(saved)
  if (!parsed.ok) return normalized
  const retained = parsed.settings
  const canonicalRaw = {
    ...raw,
    holdSpeed: raw.holdSpeed ?? raw.spaceHold ??
      (isRecord(raw.speed) && raw.speed.hold !== undefined ? { speed: raw.speed.hold } : undefined),
    subtitleNavigation: raw.subtitleNavigation ?? (version < 14 ? raw.subtitlePractice : undefined),
  }
  const restored = restoreMissingFields(canonicalRaw, normalized, retained) as ShortcutSettings

  // Old clients normalize unsupported values to defaults rather than omitting them.
  if (version < 24) {
    if (typeof retained.subtitleSize === 'number' && restored.subtitleSize === DEFAULT_SETTINGS.subtitleSize) {
      restored.subtitleSize = retained.subtitleSize
    }
    if (typeof retained.pip.subtitleSize === 'number' && restored.pip.subtitleSize === DEFAULT_SETTINGS.pip.subtitleSize) {
      restored.pip.subtitleSize = retained.pip.subtitleSize
    }
  }
  if (version < 27) {
    for (const [action, binding] of Object.entries(restored.bindings)) {
      const fallback = DEFAULT_KEY_BINDINGS[action as keyof typeof DEFAULT_KEY_BINDINGS]
      if (retained.bindings[action as ShortcutAction]?.key === null && keyBindingsEqual(binding.key, fallback)) binding.key = null
    }
    for (const action of SUBTITLE_NAVIGATION_ACTIONS) {
      const fallback = action === 'replay' ? DEFAULT_KEY_BINDINGS.skipIntro : DEFAULT_SUBTITLE_NAVIGATION_BINDINGS[action].key
      if (retained.subtitleNavigation.bindings[action].key === null &&
        keyBindingsEqual(restored.subtitleNavigation.bindings[action].key, fallback)) {
        restored.subtitleNavigation.bindings[action].key = null
      }
    }
  }
  const rawBindings = isRecord(raw.bindings) ? raw.bindings : {}
  const rawSubtitles = isRecord(canonicalRaw.subtitleNavigation) && isRecord(canonicalRaw.subtitleNavigation.bindings)
    ? canonicalRaw.subtitleNavigation.bindings : {}
  const bindings = [
    ...Object.entries(restored.bindings).map(([action, binding]) => ({
      generalAction: action as ShortcutAction, binding, rawBinding: rawBindings[action],
    })),
    ...SUBTITLE_NAVIGATION_ACTIONS.map(action => ({
      generalAction: undefined, binding: restored.subtitleNavigation.bindings[action], rawBinding: rawSubtitles[action],
    })),
  ]
  const keySources = bindings.filter(({ binding }) => binding?.enabled).map(({ generalAction, binding, rawBinding }) => {
    const legacy = isRecord(rawBinding) ? rawBinding : {}
    const hasLegacyPrimary = legacy.key !== undefined
    const hasLegacyAdditional = legacy.additionalKeys !== undefined
    return {
      generalAction,
      binding,
      legacyKeys: getBindingKeys({
        key: hasLegacyPrimary ? binding.key : null,
        additionalKeys: hasLegacyAdditional ? binding.additionalKeys : undefined,
      }),
      recoveredKeys: getBindingKeys({
        key: hasLegacyPrimary ? null : binding.key,
        additionalKeys: hasLegacyAdditional ? undefined : binding.additionalKeys,
      }),
    }
  })

  // An old client can claim a recovered key even when it knows the action that
  // previously owned it. Collect claims before disabling any bindings.
  const legacyClaims = keySources.flatMap(({ binding, legacyKeys }) => legacyKeys.map(key => ({ binding, key })))
  const { seekPairFor } = createShortcutCatalog(restored)
  for (const { generalAction, binding, recoveredKeys } of keySources) {
    const conflicts = recoveredKeys.some(key => legacyClaims.some(claim =>
      claim.binding !== binding && keyBindingsEqual(claim.key, key)))
    if (!conflicts) continue
    binding.enabled = false
    const pair = generalAction ? seekPairFor(generalAction) : undefined
    if (!pair) continue
    for (const action of Object.values(pair.actions)) {
      const direction = restored.bindings[action]
      if (direction) direction.enabled = false
    }
  }
  // Older clients can clear the primary field without seeing the other keys.
  // Promote after resolving conflicts so the promoted key remains a recovered key.
  for (const { binding } of bindings) {
    if (binding?.key !== null || !binding.additionalKeys?.length) continue
    const [key, ...additionalKeys] = binding.additionalKeys
    binding.key = key
    binding.additionalKeys = additionalKeys
  }
  return normalizeSettings(restored)
}
