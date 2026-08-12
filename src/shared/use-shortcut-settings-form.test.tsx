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

  it('replaces all settings only after persistence succeeds', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(saveSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const replacement = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      locale: 'zh-TW' as const,
      speed: { ...DEFAULT_SETTINGS.speed, preferred: 2.25 },
    }

    let replacementPromise!: Promise<typeof DEFAULT_SETTINGS>
    act(() => {
      replacementPromise = result.current.replaceSettings(replacement)
    })
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)

    await act(async () => save.resolve(replacement))
    await expect(replacementPromise).resolves.toEqual(replacement)
    expect(result.current.settings).toEqual(replacement)
    expect(result.current.speed.draft.preferred).toBe('2.25')
  })

  it('keeps the original settings when replacement persistence fails', async () => {
    vi.mocked(saveSettings).mockRejectedValue(new Error('Storage unavailable.'))
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    await act(async () => {
      await expect(
        result.current.replaceSettings({ ...DEFAULT_SETTINGS, enabled: false })
      ).rejects.toThrow('Storage unavailable.')
    })

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    expect(result.current.saveError).toBe('Storage unavailable.')
  })

  it('centralizes hold-speed availability and setting updates', async () => {
    vi.mocked(saveSettings).mockImplementation(async settings => settings)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    expect(result.current.holdSpeed.enableControlDisabled).toBe(false)
    expect(result.current.holdSpeed.detailsDisabled).toBe(false)

    act(() => result.current.holdSpeed.setEnabled(false))

    expect(result.current.settings.holdSpeed.enabled).toBe(false)
    expect(result.current.holdSpeed.detailsDisabled).toBe(true)

    act(() => result.current.holdSpeed.setShowHint(false))
    expect(result.current.settings.holdSpeed.showHint).toBe(false)
  })
})
