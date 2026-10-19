import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerActionIcon } from '@/background/action-icon'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'

const iconPath = (enabled: boolean) => ({
  path: Object.fromEntries([16, 32, 48, 128].map(size => [
    size, `icons/${enabled ? 'icon' : 'icon-disabled'}${size}.png`,
  ])),
})

describe('toolbar shortcut state icon', () => {
  const cleanups: Array<() => void> = []
  const register = () => { cleanups.push(registerActionIcon()) }
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) cleanup()
    vi.restoreAllMocks()
  })

  it.each([true, false])('restores the saved enabled state (%s) on worker startup', async enabled => {
    await saveSettings({ ...DEFAULT_SETTINGS, enabled })
    register()
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(enabled)))
  })

  it('switches to the disabled icon on disable and restores the normal icon on enable', async () => {
    register()
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(true)))
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false })
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(false)))
    await saveSettings(DEFAULT_SETTINGS)
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(true)))
  })

  it('does not let a delayed initial settings read overwrite a newer toggle', async () => {
    let finishRead: (() => void) | undefined
    vi.mocked(chrome.storage.sync.get).mockImplementationOnce((_keys, callback) => {
      finishRead = () => callback({ shortcutSettings: DEFAULT_SETTINGS })
    })
    register()
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false })
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(false)))
    finishRead?.()
    await Promise.resolve()
    await Promise.resolve()
    expect(chrome.action.setIcon).toHaveBeenCalledTimes(1)
  })

  it('serializes rapid toggles while an earlier icon update is pending', async () => {
    let finishUpdate: (() => void) | undefined
    vi.mocked(chrome.action.setIcon).mockImplementationOnce(() => new Promise<void>(resolve => {
      finishUpdate = resolve
    }))
    register()
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenCalledTimes(1))
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false })
    await saveSettings(DEFAULT_SETTINGS)
    expect(chrome.action.setIcon).toHaveBeenCalledTimes(1)
    finishUpdate?.()
    await vi.waitFor(() => expect(chrome.action.setIcon).toHaveBeenCalledTimes(3))
    expect(chrome.action.setIcon).toHaveBeenNthCalledWith(2, iconPath(false))
    expect(chrome.action.setIcon).toHaveBeenLastCalledWith(iconPath(true))
  })
})
