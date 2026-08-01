import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings, subscribeSettings } from '@/shared/storage'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

vi.mock('@/shared/storage', () => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  subscribeSettings: vi.fn(),
}))

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useShortcutSettingsForm', () => {
  beforeEach(() => {
    vi.mocked(getSettings).mockResolvedValue(DEFAULT_SETTINGS)
    vi.mocked(saveSettings).mockReset()
    vi.mocked(subscribeSettings).mockReturnValue(() => undefined)
  })

  it('keeps the optimistic settings after the save succeeds', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(saveSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
    })
    expect(result.current.settings.enabled).toBe(false)

    await act(async () => save.resolve({ ...DEFAULT_SETTINGS, enabled: false }))
    expect(result.current.saveError).toBeNull()
  })

  it('reports the latest save failure', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(saveSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
    })
    await act(async () => save.reject(new Error('Storage unavailable.')))

    expect(result.current.saveError).toBe('Storage unavailable.')
  })

  it('ignores a stale failure from an earlier queued save', async () => {
    const firstSave = deferred<typeof DEFAULT_SETTINGS>()
    const secondSave = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(saveSettings)
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
      result.current.updateSettings(current => ({ ...current, enabled: true }))
    })
    await act(async () => firstSave.reject(new Error('Stale failure.')))
    await waitFor(() => expect(saveSettings).toHaveBeenCalledTimes(2))
    expect(result.current.saveError).toBeNull()

    await act(async () => secondSave.reject(new Error('Latest failure.')))
    expect(result.current.saveError).toBe('Latest failure.')
  })
})
