import { describe, expect, it, vi } from 'vitest'

import { registerSettingsMigration } from '@/background/settings-migration'
import { getSettings, SETTINGS_STORAGE_KEY, SETTINGS_COMPATIBILITY_KEY, UI_STYLE_DEFAULT_KEY } from '@/shared/storage'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import legacy from '@/shared/fixtures/settings-v0.6.8.json'

const install = (reason: 'install' | 'update') => {
  vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)?.[0]({
    reason, previousVersion: '0.6.4',
  } as chrome.runtime.InstalledDetails)
}

describe('appearance migration lifecycle', () => {
  it('seeds protection when first loading legacy settings and preserves a later new-client save', async () => {
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: legacy.settings })
    registerSettingsMigration()
    await vi.waitFor(() => expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { [SETTINGS_COMPATIBILITY_KEY]: expect.objectContaining({ version: DEFAULT_SETTINGS.version }) }, expect.any(Function),
    ))
    chrome.storage.sync.set({ [SETTINGS_COMPATIBILITY_KEY]: { ...DEFAULT_SETTINGS, autoNextEpisode: true } })
    vi.mocked(chrome.storage.sync.set).mockClear()
    registerSettingsMigration()
    await vi.waitFor(async () => expect((await getSettings()).autoNextEpisode).toBe(true))
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
  })

  it('protects existing current preferences on first startup without replacing the shared object', async () => {
    const settings = { ...DEFAULT_SETTINGS, autoNextEpisode: true }
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: settings })
    vi.mocked(chrome.storage.sync.set).mockClear()
    registerSettingsMigration()
    await vi.waitFor(() => expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      { [SETTINGS_COMPATIBILITY_KEY]: settings }, expect.any(Function),
    ))
    expect(await getSettings()).toEqual(settings)
  })
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
