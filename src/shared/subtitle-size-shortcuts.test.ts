import { describe, expect, it } from 'vitest'
import { getShortcutActions, findActionForKey } from './shortcut-bindings'
import { createSettingsBackup, parseSettingsBackup, serializeSettingsBackup } from './settings-backup'
import { DEFAULT_SETTINGS, normalizeSettings } from './shortcut-settings'
import { isSubtitleSizeList, nextSubtitleSize } from './subtitle-size-shortcuts'
import { applySubtitleSize } from '@/content/subtitle-size'
import { legacySubtitleNavigation } from './fixtures/legacy-subtitle-navigation'

const customSettings = () => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.subtitleSizeCycle = [200, 100, 150]
  settings.subtitleSize = 150
  settings.pip.subtitleSize = 175
  settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [175] },
    { id: 'subtitle-size:cycle', kind: 'cycle', sizes: [200, 150, 100] }]
  settings.bindings['subtitle-size:fixed'] = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
  settings.bindings['subtitle-size:cycle'] = { ...settings.bindings['subtitle-size:fixed'], enabled: false }
  return settings
}

describe('subtitle size shortcuts', () => {
  it('migrates legacy settings without changing either current size or the original binding', () => {
    const raw = { ...DEFAULT_SETTINGS, version: 23, subtitleSize: 'large',
      subtitleNavigation: legacySubtitleNavigation(),
      subtitleSizeCycle: undefined, subtitleSizeShortcuts: undefined, pip: { ...DEFAULT_SETTINGS.pip, subtitleSize: 'small' } }
    const settings = normalizeSettings(raw)
    expect(settings).toMatchObject({ subtitleSize: 'large', pip: { subtitleSize: 'small' }, subtitleSizeCycle: [80, 100, 125], subtitleSizeShortcuts: [] })
    expect(settings.bindings).toEqual(DEFAULT_SETTINGS.bindings)
    expect(normalizeSettings(settings)).toEqual(settings)
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8' })
    expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: raw }))).toMatchObject({ ok: true, value: { settings } })
  })

  it('routes custom bindings and preserves independent sizes and shortcuts through backup', () => {
    const settings = customSettings()
    expect(normalizeSettings(settings)).toEqual(settings)
    expect(getShortcutActions(settings)).toContain('subtitle-size:fixed')
    expect(findActionForKey(settings, { code: 'KeyB', key: 'b', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false })).toBe('subtitle-size:fixed')
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.8' })
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({ ok: true, value: { settings } })
  })

  it('preserves twelve-size saved cycles through normalization and backup', () => {
    const settings = customSettings()
    const sizes = Array.from({ length: 12 }, (_, index) => 50 + index).reverse()
    settings.subtitleSizeCycle = sizes
    settings.subtitleSizeShortcuts[1].sizes = [...sizes]
    expect(normalizeSettings(settings)).toEqual(settings)
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.9' })
    expect(parseSettingsBackup(serializeSettingsBackup(backup))).toMatchObject({ ok: true, value: { settings } })
  })

  it.each([[], [100], [100, 100], [49, 100], [100, 301], [100, 125.5], [100, NaN], Array.from({ length: 13 }, (_, index) => 50 + index)])('rejects invalid cycle %j', sizes => {
    expect(isSubtitleSizeList(sizes)).toBe(false)
    const settings = { ...customSettings(), subtitleSizeCycle: sizes }
    const backup = createSettingsBackup(DEFAULT_SETTINGS, { extensionVersion: '0.6.8' })
    expect(parseSettingsBackup(JSON.stringify({ ...backup, settings }))).toEqual({ ok: false, error: 'invalidSettings' })
    expect(normalizeSettings(settings).subtitleSizeCycle).toEqual([80, 100, 125])
  })

  it('rejects missing fields, broken entries, duplicate IDs and absent bindings in current backups', () => {
    const settings = customSettings()
    const backup = createSettingsBackup(settings, { extensionVersion: '0.6.8' })
    const invalid = [
      { ...settings, subtitleSizeShortcuts: undefined },
      { ...settings, subtitleSize: 0 },
      { ...settings, pip: { ...settings.pip, subtitleSize: 301 } },
      { ...settings, subtitleSizeShortcuts: [...settings.subtitleSizeShortcuts, settings.subtitleSizeShortcuts[0]] },
      { ...settings, subtitleSizeShortcuts: [{ ...settings.subtitleSizeShortcuts[0], sizes: [100, 150] }] },
      { ...settings, subtitleSizeShortcuts: [{ ...settings.subtitleSizeShortcuts[0], id: 'seek:wrong' }] },
      { ...settings, bindings: DEFAULT_SETTINGS.bindings },
    ]
    for (const raw of invalid) expect(parseSettingsBackup(JSON.stringify({ ...backup, settings: raw }))).toEqual({ ok: false, error: 'invalidSettings' })
    expect(normalizeSettings({ ...settings, bindings: DEFAULT_SETTINGS.bindings }).subtitleSizeShortcuts).toEqual([])
  })

  it('preserves arbitrary unique order and advances through it before wrapping', () => {
    const sizes = [150, 80, 125, 100]
    expect(isSubtitleSizeList(sizes)).toBe(true)
    expect(nextSubtitleSize(sizes, 'medium')).toBe(150)
    expect(nextSubtitleSize(sizes, 150)).toBe('small')
    expect(nextSubtitleSize(sizes, 'small')).toBe('large')
    expect(nextSubtitleSize(sizes, 'large')).toBe('medium')
    expect(nextSubtitleSize(sizes, 175)).toBe(150)
    expect(nextSubtitleSize(sizes, 50)).toBe(150)
    expect(nextSubtitleSize([80, 100, 125], 'large')).toBe('small')
  })

  it('applies a custom scale and removes all overrides at the original size', () => {
    const doc = document.implementation.createHTMLDocument()
    applySubtitleSize(doc, 175)
    expect(doc.getElementById('shortcut-override-subtitle-size')?.textContent).toContain('zoom: 1.75 !important')
    expect(doc.documentElement.getAttribute('data-shortcut-override-subtitle-size')).toBe('175')
    applySubtitleSize(doc, 100)
    expect(doc.getElementById('shortcut-override-subtitle-size')).toBeNull()
    expect(doc.documentElement.hasAttribute('data-shortcut-override-subtitle-size')).toBe(false)
  })
})
