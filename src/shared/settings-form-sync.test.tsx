import { act, renderHook, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import fixtures from '@/shared/fixtures/settings-v0.6.4.json'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings, SETTINGS_STORAGE_KEY, UI_STYLE_STORAGE_KEY } from '@/shared/storage'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import { useShortcutEditor } from '@/options/use-shortcut-editor'

it('keeps the latest functional preferences and explicit appearance through initial hydration and a later edit', async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, uiStyle: 'neobrutalism' })
  const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()
  if (!originalGet) throw new Error('Missing storage mock')
  let deferNextRead = true
  let releaseInitialRead: (() => void) | undefined
  vi.spyOn(chrome.storage.sync, 'get').mockImplementation((keys, callback) => {
    if (!deferNextRead) return originalGet(keys, callback)
    deferNextRead = false
    originalGet(keys, values => {
      releaseInitialRead = () => {
        releaseInitialRead = undefined
        callback?.(values)
      }
    })
    return Promise.resolve({})
  })
  const { result, unmount } = renderHook(() => useShortcutSettingsForm())
  try {
    await waitFor(() => expect(releaseInitialRead).toBeTypeOf('function'))
    expect(result.current.loaded).toBe(false)
    await act(async () => {
      chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: fixtures.cases[0].settings })
      chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: fixtures.cases[2].settings })
    })
    expect(result.current.loaded).toBe(false)
    expect(result.current.settings).toMatchObject({ enabled: false, theme: 'dark', locale: 'zh-TW' })
    expect(result.current.speed.draft.preferred).toBe('1.75')
    expect(result.current.seek.draft.seconds).toBe('17')

    await act(async () => releaseInitialRead?.())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    expect(result.current.settings).toMatchObject({ enabled: false, theme: 'dark', locale: 'zh-TW', uiStyle: 'neobrutalism' })
    expect(result.current.speed.draft.preferred).toBe('1.75')
    expect(result.current.seek.draft.seconds).toBe('17')

    await act(async () => {
      result.current.updateSettings(current => ({ ...current, theme: 'light' }))
    })
    await waitFor(async () => {
      expect(await getSettings()).toMatchObject({ uiStyle: 'neobrutalism', theme: 'light', enabled: false, locale: 'zh-TW', speed: { preferred: 1.75 }, seek: { seconds: 17 } })
    })
    const persisted = await new Promise<Record<string, unknown>>(resolve => chrome.storage.sync.get(UI_STYLE_STORAGE_KEY, values => resolve(values)))
    expect(persisted[UI_STYLE_STORAGE_KEY]).toBe('neobrutalism')
  } finally {
    releaseInitialRead?.()
    unmount()
    vi.restoreAllMocks()
  }
})

it('shows the persisted shortcut when a failed edit makes the next queued edit a no-op', async () => {
  await saveSettings(DEFAULT_SETTINGS)
  const persisted = await new Promise<Record<string, unknown>>(resolve => chrome.storage.sync.get(null, resolve))
  const originalSet = vi.mocked(chrome.storage.sync.set).getMockImplementation()
  if (!originalSet) throw new Error('Missing storage mock')
  let rejectFirstWrite: (() => void) | undefined
  let writes = 0
  vi.spyOn(chrome.storage.sync, 'set').mockImplementation((values, callback) => {
    writes += 1
    if (writes === 1) {
      rejectFirstWrite = () => {
        Object.assign(chrome.runtime, { lastError: { message: 'Write failed' } })
        try { callback?.() } finally { Reflect.deleteProperty(chrome.runtime, 'lastError') }
      }
      return Promise.resolve()
    }
    if (Object.entries(values).every(([key, value]) => JSON.stringify(value) === JSON.stringify(persisted[key]))) {
      callback?.()
      return Promise.resolve()
    }
    return originalSet(values, callback)
  })
  const { result, unmount } = renderHook(() => {
    const form = useShortcutSettingsForm()
    const editor = useShortcutEditor({ ...form, ignoredGeneralActions: [] })
    return { form, editor }
  })
  const target = { group: 'general', action: 'playPause' } as const
  const edit = (code: string, key: string) => {
    act(() => result.current.editor.edit(target))
    act(() => result.current.editor.capture({ ...DEFAULT_SETTINGS.bindings.playPause.key, code, key }))
    act(() => result.current.editor.saveDraft())
  }
  try {
    await waitFor(() => expect(result.current.form.loaded).toBe(true))
    edit('KeyJ', 'j')
    await waitFor(() => expect(rejectFirstWrite).toBeTypeOf('function'))
    edit('KeyK', 'k')
    expect(result.current.form.settings.bindings.playPause.key.code).toBe('KeyK')
    await act(async () => rejectFirstWrite?.())
    await waitFor(() => expect(writes).toBe(2))
    const stored = await getSettings()
    expect(stored.bindings.playPause.key.code).toBe('Space')
    expect(result.current.form.settings.bindings.playPause.key.code).toBe('Space')
  } finally {
    unmount()
    vi.restoreAllMocks()
  }
})
