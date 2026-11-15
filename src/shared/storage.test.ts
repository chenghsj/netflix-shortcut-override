import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { SETTINGS_STORAGE_KEY, SETTINGS_COMPATIBILITY_KEY, UI_STYLE_STORAGE_KEY, getSettings, saveSettings } from '@/shared/storage'
import { UI_STYLES } from '@/shared/ui-styles'

describe('settings storage', () => {
  it('counts compatibility aliases, the storage key and UTF-8 bytes at the sync boundary', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    const values = vi.mocked(chrome.storage.sync.set).mock.calls.at(-1)![0] as Record<string, unknown>
    const bytes = new TextEncoder().encode(JSON.stringify(values[SETTINGS_STORAGE_KEY])).byteLength + SETTINGS_STORAGE_KEY.length
    const boundary = structuredClone(DEFAULT_SETTINGS)
    boundary.bindings.mute.key.key += 'a'.repeat(8192 - bytes)
    await expect(saveSettings(boundary)).resolves.toEqual(boundary)

    for (const key of [boundary.bindings.mute.key.key + 'a', boundary.bindings.mute.key.key.slice(0, -1) + '界']) {
      const oversized = structuredClone(boundary)
      oversized.bindings.mute.key.key = key
      vi.mocked(chrome.storage.sync.set).mockClear()
      await expect(saveSettings(oversized)).rejects.toThrow('Settings storage is full')
      expect(chrome.storage.sync.set).not.toHaveBeenCalled()
      expect(await getSettings()).toEqual(boundary)
    }
  })

  it('rejects settings above the sync item limit before replacing saved preferences', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    const oversized = structuredClone(DEFAULT_SETTINGS)
    for (let index = 0; index < 12; index += 1) {
      const id = `seek:00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as const
      oversized.seekShortcuts.push({ id, kind: 'relative', value: index + 1 })
      for (const direction of ['backward', 'forward'] as const) {
        oversized.bindings[`${id}-${direction}`] = {
          enabled: true,
          key: { code: `F${index + 1}`, key: `F${index + 1}`, ctrl: false, alt: false, shift: direction === 'forward', meta: false },
        }
      }
    }
    vi.mocked(chrome.storage.sync.set).mockClear()
    await expect(saveSettings(oversized)).rejects.toThrow('Settings storage is full')
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps the legacy hold-speed key for older synced installations', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      holdSpeed: { enabled: false, speed: 2.35, showHint: false },
    }

    await saveSettings(settings)

    expect(vi.mocked(chrome.storage.sync.set)).toHaveBeenCalledWith(
      {
        [UI_STYLE_STORAGE_KEY]: settings.uiStyle,
        [SETTINGS_COMPATIBILITY_KEY]: settings,
        [SETTINGS_STORAGE_KEY]: {
          ...settings,
          spaceHold: settings.holdSpeed,
          subtitlePractice: settings.subtitleNavigation,
        },
      },
      expect.any(Function)
    )
  })

  it.each(UI_STYLES)('preserves %s after a legacy write in the browser preview fallback', async uiStyle => {
    vi.stubGlobal('chrome', undefined)
    try {
      localStorage.clear()
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, version: 12, uiStyle: undefined }))
      expect((await getSettings()).uiStyle).toBe('classic')
      await saveSettings({ ...DEFAULT_SETTINGS, uiStyle })
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, version: 12, uiStyle: undefined, enabled: false }))
      expect(await getSettings()).toMatchObject({ enabled: false, uiStyle })
      localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken')
      await expect(getSettings()).rejects.toThrow(SyntaxError)
    } finally {
      localStorage.clear()
      vi.unstubAllGlobals()
    }
  })

})
