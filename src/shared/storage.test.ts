import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { SETTINGS_STORAGE_KEY, UI_STYLE_STORAGE_KEY, getSettings, saveSettings } from '@/shared/storage'
import { UI_STYLES } from '@/shared/ui-styles'

describe('settings storage', () => {
  it('keeps the legacy hold-speed key for older synced installations', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      holdSpeed: { enabled: false, speed: 2.35, showHint: false },
    }

    await saveSettings(settings)

    expect(vi.mocked(chrome.storage.sync.set)).toHaveBeenCalledWith(
      {
        [UI_STYLE_STORAGE_KEY]: settings.uiStyle,
        [SETTINGS_STORAGE_KEY]: {
          ...settings,
          spaceHold: settings.holdSpeed,
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
