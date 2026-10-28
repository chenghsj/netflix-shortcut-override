import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import {
  getSettings, initializeUiStyleDefault, observeSettings, saveSettings, subscribeSettings,
  updateSettings, SETTINGS_STORAGE_KEY, UI_STYLE_STORAGE_KEY,
} from '@/shared/storage'

const setSync = (values: Record<string, unknown>) =>
  new Promise<void>(resolve => chrome.storage.sync.set(values, () => resolve()))

const deferNextRead = () => {
  const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()
  if (!originalGet) throw new Error('Missing storage mock')
  let finish: (() => void) | undefined
  vi.spyOn(chrome.storage.sync, 'get').mockImplementationOnce((keys, callback) => {
    originalGet(keys, values => { finish = () => callback?.(values) })
    return Promise.resolve({})
  })
  return {
    wait: () => vi.waitFor(() => expect(finish).toBeTypeOf('function')),
    release: () => {
      finish?.()
      finish = undefined
    },
  }
}

afterEach(() => vi.restoreAllMocks())

describe('settings owner', () => {
  it('invalidates a read on a raw appearance event even when UI delivery is deferred', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, uiStyle: 'markdown' })
    const hydration = deferNextRead()
    const receive = vi.fn()
    const unsubscribe = subscribeSettings(receive)
    const read = deferNextRead()
    const saving = updateSettings(current => ({
      ...current, pip: { ...current.pip, subtitleBackground: 'dark' },
    }))
    try {
      await read.wait()
      await setSync({ [UI_STYLE_STORAGE_KEY]: 'classic' })
      expect(receive).not.toHaveBeenCalled()
      read.release()
      expect(await saving).toMatchObject({ uiStyle: 'classic', pip: { subtitleBackground: 'dark' } })
      expect((await getSettings()).uiStyle).toBe('classic')
    } finally {
      read.release()
      hydration.release()
      unsubscribe()
    }
  })

  it('preserves real upgrade defaults written while a mutation read is pending', async () => {
    const read = deferNextRead()
    const saving = updateSettings(current => ({
      ...current, pip: { ...current.pip, subtitleBackground: 'dark' },
    }))
    try {
      await read.wait()
      await initializeUiStyleDefault('update')
      expect((await getSettings()).uiStyle).toBe('classic')
      read.release()
      expect(await saving).toMatchObject({ uiStyle: 'classic', pip: { subtitleBackground: 'dark' } })
    } finally {
      read.release()
    }
  })

  it('returns the newest functional snapshot after a change during getSettings', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    const read = deferNextRead()
    const loading = getSettings()
    try {
      await read.wait()
      await setSync({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, enabled: false, locale: 'zh-TW' } })
      read.release()
      expect(await loading).toMatchObject({ enabled: false, locale: 'zh-TW' })
    } finally {
      read.release()
    }
  })

  it('orders whole replacements and field mutations on the same queue', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    const read = deferNextRead()
    const first = updateSettings(current => ({
      ...current, pip: { ...current.pip, subtitleBackground: 'dark' },
    }))
    const replacement = { ...DEFAULT_SETTINGS, enabled: false, uiStyle: 'classic' as const }
    const replace = saveSettings(replacement)
    const last = updateSettings(current => ({ ...current, locale: 'zh-TW' }))
    try {
      await read.wait()
      read.release()
      await Promise.all([first, replace, last])
      expect(await getSettings()).toEqual({ ...replacement, locale: 'zh-TW' })
    } finally {
      read.release()
    }
  })

  it('reports a rejected write and still performs the next mutation', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    vi.spyOn(chrome.storage.sync, 'set').mockImplementationOnce((_values, callback) => {
      Object.assign(chrome.runtime, { lastError: { message: 'Write failed' } })
      try {
        callback?.()
      } finally {
        Reflect.deleteProperty(chrome.runtime, 'lastError')
      }
      return Promise.resolve()
    })
    const first = updateSettings(current => ({ ...current, enabled: false }))
    const next = updateSettings(current => ({ ...current, locale: 'zh-TW' }))
    await expect(first).rejects.toThrow('Write failed')
    expect(await next).toMatchObject({ enabled: true, locale: 'zh-TW' })
    expect(await getSettings()).toMatchObject({ enabled: true, locale: 'zh-TW' })
  })

  it('delivers live functional events and the reconciled initial snapshot through one observation', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    const hydration = deferNextRead()
    const receive = vi.fn()
    const observation = observeSettings(receive)
    try {
      await setSync({ [SETTINGS_STORAGE_KEY]: { ...DEFAULT_SETTINGS, enabled: false } })
      expect(receive.mock.calls.map(([settings]) => settings.enabled)).toEqual([false])
      hydration.release()
      expect(await observation.ready).toBeUndefined()
      expect(receive.mock.calls.map(([settings]) => settings.enabled)).toEqual([false, false])
      expect(receive).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false, uiStyle: 'neobrutalism' }))
    } finally {
      hydration.release()
      observation.unsubscribe()
    }
  })

  it('settles readiness without callbacks after unsubscribe', async () => {
    const hydration = deferNextRead()
    const receive = vi.fn()
    const observation = observeSettings(receive)
    observation.unsubscribe()
    hydration.release()
    await observation.ready
    await setSync({ [UI_STYLE_STORAGE_KEY]: 'classic' })
    expect(receive).not.toHaveBeenCalled()
  })
})
