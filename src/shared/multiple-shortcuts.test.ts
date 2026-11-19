import { expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, SHORTCUT_SETTINGS_VERSION } from './shortcut-settings'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'
import { getSettings, saveSettings } from './storage'
import { applyShortcutAssignment, inspectShortcutAssignment } from './shortcut-assignment'
import { captureShortcutEdit, evaluateShortcutEdit } from './shortcut-edit'
import { getReplacedNetflixNativeKeyBindings, keyBindingFromEvent } from './shortcut-bindings'
import type { ShortcutSettings } from './shortcut-types'

const media = keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'MediaTrackNext' }))
const settingsWithKeys = (): ShortcutSettings => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.bindings.nextEpisode.additionalKeys = [media]
  settings.subtitleNavigation.bindings.previous.additionalKeys = [keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'F20', code: 'F20' }))]
  return settings
}

it('preserves all keys through storage, normalization and backup import, and upgrades single-key settings', async () => {
  const settings = settingsWithKeys()
  settings.bindings.nextEpisode.additionalKeys!.push(keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'F20', code: 'F20' })))
  await saveSettings(settings)
  expect((await getSettings()).bindings.nextEpisode).toEqual(settings.bindings.nextEpisode)
  const backup = createSettingsBackup(settings, { extensionVersion: 'test' })
  expect(parseSettingsBackup(JSON.stringify(backup))).toMatchObject({ ok: true, value: { settings } })
  const old = { ...DEFAULT_SETTINGS, version: 32 }
  expect(normalizeSettings(old)).toEqual(DEFAULT_SETTINGS)
  expect(SHORTCUT_SETTINGS_VERSION).toBeGreaterThan(32)
})

it.each(['duplicate', 'invalid', 'too many', 'orphan'] as const)('rejects a current backup with %s extra keys', kind => {
  const backup = createSettingsBackup(settingsWithKeys(), { extensionVersion: 'test' })
  const binding = backup.settings.bindings.nextEpisode
  if (kind === 'duplicate') binding.additionalKeys = [binding.key!]
  if (kind === 'invalid') Reflect.set(binding, 'additionalKeys', [{ key: 'x' }])
  if (kind === 'too many') binding.additionalKeys = Array.from({ length: 3 }, (_, index) => keyBindingFromEvent(new KeyboardEvent('keydown', { key: `F${index + 13}`, code: `F${index + 13}` })))
  if (kind === 'orphan') binding.key = null
  expect(parseSettingsBackup(JSON.stringify(backup))).toEqual({ ok: false, error: 'invalidSettings' })
})

it('checks additional keys across tables, transfers their owners and keeps all saved keys on disabled rows', () => {
  const settings = settingsWithKeys()
  const assignment = [{ group: 'subtitleNavigation' as const, action: 'next' as const, key: settings.subtitleNavigation.bindings.next.key, additionalKeys: [media] }]
  const options = { enabled: true, supportsSubtitlePreservingPip: true }
  expect(inspectShortcutAssignment(settings, assignment, options).conflicts).toEqual(['nextEpisode'])
  expect(applyShortcutAssignment(settings, assignment, options)).toBe(settings)
  const transferred = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
  expect(transferred.bindings.nextEpisode).toEqual({ ...settings.bindings.nextEpisode, enabled: false })
  expect(transferred.subtitleNavigation.bindings.next.additionalKeys).toEqual([media])
})

it('does not overwrite a second key added while the editor was open', () => {
  const settings = settingsWithKeys()
  const target = { kind: 'binding' as const, target: { group: 'general' as const, action: 'nextEpisode' as const } }
  const snapshot = captureShortcutEdit(settings, target)
  const latest = structuredClone(settings)
  latest.bindings.nextEpisode.additionalKeys = [keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'F21', code: 'F21' }))]
  const result = evaluateShortcutEdit(latest, { snapshot, keys: { nextEpisode: settings.bindings.nextEpisode.key }, additionalKeys: { nextEpisode: [media] }, enabled: 'preserve' }, true)
  expect(result.stale).toBe(true)
  expect(result.settings).toBe(latest)
})

it('does not suppress a native key that is retained as an additional shortcut', () => {
  const binding = { enabled: true, key: media, additionalKeys: [DEFAULT_SETTINGS.bindings.playPause.key] }
  expect(getReplacedNetflixNativeKeyBindings('playPause', binding)).toEqual([])
})
