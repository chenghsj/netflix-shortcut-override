import { describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { SETTINGS_STORAGE_KEY, saveSettings } from '@/shared/storage'

describe('settings storage', () => {
  it('keeps the legacy hold-speed key for older synced installations', async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      holdSpeed: { enabled: false, speed: 2.35, showHint: false },
    }

    await saveSettings(settings)

    expect(vi.mocked(chrome.storage.sync.set)).toHaveBeenCalledWith(
      {
        [SETTINGS_STORAGE_KEY]: {
          ...settings,
          spaceHold: settings.holdSpeed,
        },
      },
      expect.any(Function)
    )
  })
})
