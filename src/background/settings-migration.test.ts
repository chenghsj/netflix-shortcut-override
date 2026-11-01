import { describe, expect, it, vi } from 'vitest'

import { registerSettingsMigration } from '@/background/settings-migration'
import { getSettings, UI_STYLE_DEFAULT_KEY } from '@/shared/storage'

const install = (reason: 'install' | 'update') => {
  vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)?.[0]({
    reason, previousVersion: '0.6.4',
  } as chrome.runtime.InstalledDetails)
}

describe('appearance migration lifecycle', () => {
  it.each(['install', 'update'] as const)('initializes %s without requesting permissions or changing functional settings', async reason => {
    registerSettingsMigration()
    install(reason)
    await vi.waitFor(async () => expect((await getSettings()).uiStyle).toBe(reason === 'install' ? 'neobrutalism' : 'classic'))
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ [UI_STYLE_DEFAULT_KEY]: reason === 'install' ? 'neobrutalism' : 'classic' }, expect.any(Function))
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    expect(chrome.runtime.openOptionsPage).not.toHaveBeenCalled()
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })

  it('does not classify unknown empty storage on ordinary worker startup', async () => {
    registerSettingsMigration()
    await vi.waitFor(() => expect(chrome.storage.local.get).toHaveBeenCalled())
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
  })
})
