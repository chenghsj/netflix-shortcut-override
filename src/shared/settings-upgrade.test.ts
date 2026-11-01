import { describe, expect, it, vi } from 'vitest'

import fixtures from '@/shared/fixtures/settings-v0.6.4.json'
import { DEFAULT_SETTINGS, SHORTCUT_SETTINGS_VERSION } from '@/shared/shortcut-settings'
import { parseSettingsBackup } from '@/shared/settings-backup'
import {
  SETTINGS_STORAGE_KEY, UI_STYLE_STORAGE_KEY, UI_STYLE_DEFAULT_KEY,
  getSettings, saveSettings, subscribeSettings, initializeUiStyleDefault,
} from '@/shared/storage'

const setSync = (values: Record<string, unknown>) => new Promise<void>(resolve => chrome.storage.sync.set(values, resolve))
const setLocal = (values: Record<string, unknown>) => new Promise<void>(resolve => chrome.storage.local.set(values, resolve))
const readSync = () => new Promise<Record<string, unknown>>(resolve => chrome.storage.sync.get(null, resolve))
const flush = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

describe('v0.6.4 upgrade compatibility', () => {
  it.each(fixtures.cases)('retains all functional preferences and backup values for $name', async fixture => {
    await setSync({ [SETTINGS_STORAGE_KEY]: fixture.settings })
    await initializeUiStyleDefault('update')
    const oldSettings = Object.fromEntries(Object.entries(fixture.settings).filter(([key]) => key !== 'spaceHold'))
    const expected = { ...oldSettings, version: SHORTCUT_SETTINGS_VERSION, uiStyle: 'classic' }
    expect(await getSettings()).toEqual(expected)
    expect((await readSync())[SETTINGS_STORAGE_KEY]).toEqual(fixture.settings)
    const restored = parseSettingsBackup(JSON.stringify(fixture.backup))
    expect(restored.ok).toBe(true)
    if (restored.ok) expect(restored.value.settings).toEqual(expected)
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it.each(['install', 'update'] as const)('distinguishes an empty %s and keeps its default on later updates', async reason => {
    await initializeUiStyleDefault(reason)
    const expected = reason === 'install' ? 'neobrutalism' : 'classic'
    expect((await getSettings()).uiStyle).toBe(expected)
    await initializeUiStyleDefault('update')
    expect((await getSettings()).uiStyle).toBe(expected)
    expect((await readSync())[SETTINGS_STORAGE_KEY]).toBeUndefined()
  })

  it.each(['classic', 'neobrutalism'] as const)('preserves inline %s during bootstrap and older full-object writes', async uiStyle => {
    await setSync({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, uiStyle } })
    await initializeUiStyleDefault('update')
    await setSync({ [SETTINGS_STORAGE_KEY]: fixtures.cases[1].settings })
    expect((await getSettings()).uiStyle).toBe(uiStyle)
    await saveSettings({ ...(await getSettings()), uiStyle })
    await setSync({ [SETTINGS_STORAGE_KEY]: fixtures.cases[2].settings })
    expect(await getSettings()).toMatchObject({ uiStyle, enabled: false, theme: 'dark', seek: { seconds: 17 } })
  })

  it('does not let delayed initialization overwrite an explicit selection', async () => {
    let finishRead: (() => void) | undefined
    vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((_keys, callback) => {
      finishRead = () => callback?.({})
      return Promise.resolve({})
    })
    const initializing = initializeUiStyleDefault('update')
    await saveSettings({ ...DEFAULT_SETTINGS, uiStyle: 'neobrutalism' })
    finishRead?.()
    await initializing
    expect((await getSettings()).uiStyle).toBe('neobrutalism')
  })

  it('recovers the original install default after a failed sync initialization and subsequent update', async () => {
    vi.spyOn(chrome.storage.sync, 'set').mockImplementationOnce((_values, callback) => {
      Object.assign(chrome.runtime, { lastError: { message: 'offline' } })
      callback?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
      return Promise.resolve()
    })
    await expect(initializeUiStyleDefault('install')).rejects.toThrow('offline')
    await initializeUiStyleDefault('update')
    expect((await getSettings()).uiStyle).toBe('neobrutalism')
    expect((await readSync())[UI_STYLE_DEFAULT_KEY]).toBe('neobrutalism')
  })

  it('leaves announcements and permission state untouched during recovery', async () => {
    await setLocal({ announcementSeen: 'kept', [UI_STYLE_DEFAULT_KEY]: 'classic' })
    vi.mocked(chrome.storage.local.set).mockClear()
    await initializeUiStyleDefault()
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ [UI_STYLE_DEFAULT_KEY]: 'classic' }, expect.any(Function))
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it('delivers off/on synchronously before hydration and never rolls back newer snapshots', async () => {
    let finishRead: (() => void) | undefined
    vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((_keys, callback) => {
      finishRead = () => callback?.({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, enabled: false } })
      return Promise.resolve({})
    })
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, enabled: false } })
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS })
    expect(receive.mock.calls.map(([settings]) => settings.enabled)).toEqual([false, true])
    expect(receive.mock.calls.every(([settings]) => !('uiStyle' in settings))).toBe(true)
    finishRead?.()
    await flush()
    expect(receive.mock.calls.map(([settings]) => settings.enabled)).toEqual([false, true, true])
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true, uiStyle: 'neobrutalism' }))
    unsubscribe()
  })

  it('emits style-only changes with hydrated functional settings and stops on unsubscribe', async () => {
    await setSync({ [SETTINGS_STORAGE_KEY]: fixtures.cases[2].settings })
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    await flush()
    expect(receive).not.toHaveBeenCalled()
    await setSync({ [UI_STYLE_STORAGE_KEY]: 'neobrutalism' })
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, uiStyle: 'neobrutalism' }))
    unsubscribe()
    await setSync({ [UI_STYLE_STORAGE_KEY]: 'classic' })
    expect(receive).toHaveBeenCalledTimes(1)
  })

  it('delivers a new explicit appearance immediately and resolves its removal after hydration', async () => {
    await setSync({
      [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS,
      [UI_STYLE_STORAGE_KEY]: 'neobrutalism',
      [UI_STYLE_DEFAULT_KEY]: 'classic',
    })
    const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()
    if (!originalGet) throw new Error('Missing storage mock')
    let finishRead: (() => void) | undefined
    vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((keys, callback) => {
      originalGet(keys, values => { finishRead = () => callback?.(values) })
      return Promise.resolve({})
    })
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    try {
      await setSync({
        [SETTINGS_STORAGE_KEY]: fixtures.cases[2].settings,
        [UI_STYLE_STORAGE_KEY]: 'markdown',
      })
      expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, uiStyle: 'markdown' }))
      await setSync({ [UI_STYLE_STORAGE_KEY]: undefined })
      expect(receive.mock.calls.at(-1)?.[0]).not.toHaveProperty('uiStyle')
      finishRead?.()
      await flush()
      expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, uiStyle: 'classic' }))
      expect((await getSettings()).uiStyle).toBe('classic')
    } finally {
      finishRead?.()
      unsubscribe()
      vi.restoreAllMocks()
    }
  })

  it('defers only a cold style-only event and applies a combined event once', async () => {
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    chrome.storage.sync.set({ [UI_STYLE_STORAGE_KEY]: 'classic' })
    expect(receive).not.toHaveBeenCalled()
    await flush()
    expect(receive).toHaveBeenCalledTimes(1)
    await setSync({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, enabled: false }, [UI_STYLE_STORAGE_KEY]: 'neobrutalism' })
    expect(receive).toHaveBeenCalledTimes(2)
    expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, uiStyle: 'neobrutalism' }))
    unsubscribe()
  })

  it('notifies an empty hydrated installation when Chrome omits nonexistent keys', async () => {
    vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((_keys, callback) => {
      callback?.({})
      return Promise.resolve({})
    })
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    await flush()
    expect(receive).not.toHaveBeenCalled()
    await setSync({ [UI_STYLE_DEFAULT_KEY]: 'classic' })
    expect(receive).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ uiStyle: 'classic' }))
    unsubscribe()
  })

  it('propagates storage read and selection write errors', async () => {
    vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((_keys, callback) => {
      Object.assign(chrome.runtime, { lastError: { message: 'read failed' } })
      callback?.({})
      Reflect.deleteProperty(chrome.runtime, 'lastError')
      return Promise.resolve({})
    })
    await expect(getSettings()).rejects.toThrow('read failed')
    vi.spyOn(chrome.storage.sync, 'set').mockImplementationOnce((_values, callback) => {
      Object.assign(chrome.runtime, { lastError: { message: 'write failed' } })
      callback?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
      return Promise.resolve()
    })
    await expect(saveSettings(DEFAULT_SETTINGS)).rejects.toThrow('write failed')
  })


  it.each(['classic', 'neobrutalism'] as const)('keeps valid inline %s ahead of local fallback during recovery', async uiStyle => {
    await setLocal({ [UI_STYLE_DEFAULT_KEY]: uiStyle === 'classic' ? 'neobrutalism' : 'classic' })
    await setSync({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, uiStyle } })
    expect((await getSettings()).uiStyle).toBe(uiStyle)
    await initializeUiStyleDefault()
    expect((await getSettings()).uiStyle).toBe(uiStyle)
    expect((await readSync())[UI_STYLE_DEFAULT_KEY]).toBe(uiStyle)
  })

})
