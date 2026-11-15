import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup } from './shortcut-settings'
import { DEFAULT_KEY_BINDINGS, keyBindingsEqual } from './shortcut-bindings'
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
  const owners = [
    ...Object.entries(restored.bindings).filter(([action]) => action in rawBindings).map(([, binding]) => binding),
    ...SUBTITLE_NAVIGATION_ACTIONS.filter(action => action in rawSubtitles).map(action => restored.subtitleNavigation.bindings[action]),
  ].filter(binding => binding.enabled && binding.key)
  for (const [action, binding] of Object.entries(restored.bindings)) {
    if (!(action in rawBindings) && owners.some(owner => keyBindingsEqual(owner.key, binding.key))) {
      binding.enabled = false
    }
  }
  return normalizeSettings(restored)
}
