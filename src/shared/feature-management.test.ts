import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup } from './shortcut-settings'
import { hideFeatures, isFeatureHidden, hideFeatureGroup, isFeatureGroupHidden, setFavoritesFeatureEnabled, getActiveFavorites, restoreFeatures, restoreFeatureGroup } from './feature-management'
import { recoverCompatibleSettings } from './settings-compatibility'
import { createSettingsBackup, parseSettingsBackup, serializeSettingsBackup } from './settings-backup'
import type { ShortcutSettings } from './shortcut-types'

const target = { group: 'general' as const, action: 'previousFrame' as const }

describe('managed feature visibility', () => {
  it('hides and disables a feature without changing its key or unrelated preferences', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const next = hideFeatures(settings, [target])
    expect(isFeatureHidden(next, target)).toBe(true)
    expect(next.bindings.previousFrame).toEqual({ ...settings.bindings.previousFrame, enabled: false })
    expect(settings.bindings.previousFrame.enabled).toBe(true)
    expect(next.speed).toEqual(settings.speed)
  })

  it('keeps ordinary disabled bindings visible and clears hiding when re-enabled', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.previousFrame.enabled = false
    expect(isFeatureHidden(settings, target)).toBe(false)
    const hidden = hideFeatures(settings, [target])
    hidden.bindings.previousFrame.enabled = true
    expect(isFeatureHidden(hidden, target)).toBe(false)
    expect(normalizeSettings(hidden).hiddenFeatures).toEqual([])
  })

  it('restores an unoccupied shortcut with its saved key enabled', () => {
    const settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [target])
    const next = restoreFeatures(settings, [target], true)
    expect(next.bindings.previousFrame).toEqual(DEFAULT_SETTINGS.bindings.previousFrame)
    expect(isFeatureHidden(next, target)).toBe(false)
    expect(next.speed).toEqual(settings.speed)
  })

  it('shows an occupied shortcut while preserving its disabled state and the enabled owner', () => {
    const settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [target])
    settings.bindings.previousFrame.key = settings.bindings.fullscreen.key
    const next = restoreFeatures(settings, [target], true)
    expect(isFeatureHidden(next, target)).toBe(false)
    expect(next.bindings.previousFrame).toEqual(settings.bindings.previousFrame)
    expect(next.bindings.fullscreen).toEqual(settings.bindings.fullscreen)
  })

  it.each(['general', 'subtitleNavigation'] as const)('keeps restored %s shortcuts disabled for conflicts across groups', group => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.previousFrame.key = settings.subtitleNavigation.bindings.previous.key
    const restored = group === 'general' ? target : { group: 'subtitleNavigation' as const, action: 'previous' as const }
    const hidden = hideFeatures(settings, [restored])
    const next = restoreFeatures(hidden, [restored], true)
    expect(isFeatureHidden(next, restored)).toBe(false)
    expect(next.bindings.previousFrame.enabled).toBe(group !== 'general')
    expect(next.subtitleNavigation.bindings.previous.enabled).toBe(group === 'general')
  })

  it('restores duplicate keys within a group as disabled while enabling its unoccupied entry', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:first', speed: 2 }, { id: 'preferred-speed:second', speed: 3 }]
    settings.bindings['preferred-speed:first'] = { enabled: false, key: settings.bindings.setPreferredSpeed.key }
    settings.bindings['preferred-speed:second'] = { enabled: false, key: null }
    const hidden = hideFeatureGroup(settings, 'preferredSpeed')
    const next = restoreFeatureGroup(hidden, 'preferredSpeed', true)
    expect(next.bindings.setPreferredSpeed.enabled).toBe(false)
    expect(next.bindings['preferred-speed:first'].enabled).toBe(false)
    expect(next.bindings['preferred-speed:second'].enabled).toBe(true)
    expect(next.hiddenFeatures).toEqual([])
  })

  it('keeps an existing group member enabled when a restored member shares its key', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2 }]
    settings.bindings['preferred-speed:custom'] = { enabled: false, key: settings.bindings.setPreferredSpeed.key }
    settings.hiddenFeatures = ['general:preferred-speed:custom']
    const next = restoreFeatureGroup(settings, 'preferredSpeed', true)
    expect(next.bindings.setPreferredSpeed).toEqual(settings.bindings.setPreferredSpeed)
    expect(next.bindings['preferred-speed:custom']).toEqual(settings.bindings['preferred-speed:custom'])
    expect(next.hiddenFeatures).toEqual([])
  })

  it('normalizes unknown, deleted, enabled and duplicate hidden entries', () => {
    const settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [target])
    const next = normalizeSettings({ ...settings, hiddenFeatures: [...settings.hiddenFeatures, ...settings.hiddenFeatures, 'unknown', 'general:mute', 'general:seek:deleted', 42] })
    expect(next.hiddenFeatures).toEqual(['general:previousFrame'])
    expect(normalizeSettings({ ...settings, version: 29, hiddenFeatures: undefined }).hiddenFeatures).toEqual([])
  })

  it('round-trips hidden features through backups and rejects invalid current lists', () => {
    const settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [target])
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.8' })
    const parsed = parseSettingsBackup(serializeSettingsBackup(backup))
    expect(parsed.ok && parsed.value.settings).toEqual(settings)
    for (const hiddenFeatures of [undefined, ['unknown'], ['general:mute'], ['general:previousFrame', 'general:previousFrame'], [42]]) {
      expect(parseSettingsForBackup({ ...settings, hiddenFeatures })).toEqual({ ok: false, error: 'invalidSettings' })
    }
  })

  it('retains subtitle navigation and hold speed hiding', () => {
    let settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [{ group: 'subtitleNavigation', action: 'next' }])
    settings = { ...settings, holdSpeed: { ...settings.holdSpeed, enabled: false }, hiddenFeatures: [...settings.hiddenFeatures, 'holdSpeed'] }
    expect(normalizeSettings(settings).hiddenFeatures).toEqual(['subtitleNavigation:next', 'holdSpeed'])
  })

  it('recovers hiding omitted by older clients while respecting their enabled edits', () => {
    const settings = hideFeatures(structuredClone(DEFAULT_SETTINGS), [target])
    const legacy = { ...settings, version: 29, hiddenFeatures: undefined }
    expect(recoverCompatibleSettings(legacy, settings).hiddenFeatures).toEqual(['general:previousFrame'])
    legacy.bindings = { ...legacy.bindings, previousFrame: { ...legacy.bindings.previousFrame, enabled: true } }
    expect(recoverCompatibleSettings(legacy, settings).hiddenFeatures).toEqual([])
  })


  it('normalizes and backs up whole-group hiding and removes the marker when a child is enabled', () => {
    const settings = hideFeatureGroup(structuredClone(DEFAULT_SETTINGS), 'seek')
    expect(isFeatureGroupHidden(settings, 'seek')).toBe(true)
    expect(normalizeSettings(settings).hiddenFeatures).toEqual(settings.hiddenFeatures)
    const parsed = parseSettingsForBackup(settings)
    expect(parsed.ok && parsed.settings.hiddenFeatures).toEqual(settings.hiddenFeatures)
    settings.bindings.seekForward.enabled = true
    expect(isFeatureGroupHidden(settings, 'seek')).toBe(false)
    expect(normalizeSettings(settings).hiddenFeatures).not.toContain('group:seek')
  })

  it('retains explicit hiding of an empty group and rejects unknown group markers', () => {
    const settings = hideFeatureGroup(structuredClone(DEFAULT_SETTINGS), 'percentage')
    expect(normalizeSettings(settings).hiddenFeatures).toEqual(['group:percentage'])
    expect(isFeatureGroupHidden(settings, 'percentage')).toBe(true)
    expect(parseSettingsForBackup({ ...settings, hiddenFeatures: ['group:unknown'] }).ok).toBe(false)
  })


  it('disables favorite filtering without clearing saved lists and round-trips the flags', () => {
    const settings = { ...structuredClone(DEFAULT_SETTINGS), subtitleFavorites: [{ language: 'ja' }], audioFavorites: [{ language: 'en', audioDescription: true }] }
    const disabled = setFavoritesFeatureEnabled(setFavoritesFeatureEnabled(settings, 'audioFavorites', false), 'subtitleFavorites', false)
    expect(getActiveFavorites(disabled, 'audioFavorites')).toEqual([])
    expect(getActiveFavorites(disabled, 'subtitleFavorites')).toEqual([])
    expect(disabled.audioFavorites).toEqual(settings.audioFavorites)
    expect(disabled.subtitleFavorites).toEqual(settings.subtitleFavorites)
    expect(normalizeSettings(disabled)).toEqual(disabled)
    const backup = createSettingsBackup(disabled, { extensionVersion: '0.6.8' })
    const parsed = parseSettingsBackup(serializeSettingsBackup(backup))
    expect(parsed.ok && parsed.value.settings).toEqual(disabled)
    const recovered = recoverCompatibleSettings({ ...disabled, version: 29, hiddenFeatures: undefined }, disabled)
    expect(recovered.hiddenFeatures).toEqual(disabled.hiddenFeatures)
    const restored = setFavoritesFeatureEnabled(disabled, 'audioFavorites', true)
    expect(getActiveFavorites(restored, 'audioFavorites')).toEqual(settings.audioFavorites)
    expect(getActiveFavorites(restored, 'subtitleFavorites')).toEqual([])
  })

})
