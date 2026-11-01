import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { observeSettings, saveSettings, updateSettings } from '@/shared/storage'
import { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

vi.mock('@/shared/storage', () => ({
  observeSettings: vi.fn(),
  updateSettings: vi.fn(),
  saveSettings: vi.fn(),
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
    vi.mocked(observeSettings).mockImplementation(callback => {
      callback(DEFAULT_SETTINGS)
      return { ready: Promise.resolve(), unsubscribe: vi.fn() }
    })
    vi.mocked(updateSettings).mockReset().mockImplementation(async updater => updater(DEFAULT_SETTINGS))
    vi.mocked(saveSettings).mockReset().mockImplementation(async settings => settings)
  })

  it('reports an initial read failure without replacing an observed functional update', async () => {
    const ready = deferred<void>()
    vi.mocked(observeSettings).mockImplementation(callback => {
      callback({ ...DEFAULT_SETTINGS, enabled: false })
      return { ready: ready.promise, unsubscribe: vi.fn() }
    })
    const { result } = renderHook(() => useShortcutSettingsForm())
    expect(result.current.loaded).toBe(false)
    expect(result.current.settings.enabled).toBe(false)

    await act(async () => ready.reject(new Error('Unable to read storage.')))

    expect(result.current.loaded).toBe(true)
    expect(result.current.settings.enabled).toBe(false)
    expect(result.current.saveError).toBe('Unable to read storage.')
  })

  it('keeps the optimistic settings after the save succeeds', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
    })
    expect(result.current.settings.enabled).toBe(false)

    await act(async () => save.resolve({ ...DEFAULT_SETTINGS, enabled: false }))
    expect(result.current.saveError).toBeNull()
    expect(result.current.settings.enabled).toBe(false)
  })

  it('passes the original updater to storage while applying optimistic state', async () => {
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const updater = (current: typeof DEFAULT_SETTINGS) => ({ ...current, enabled: false })

    act(() => result.current.updateSettings(updater))

    expect(result.current.settings.enabled).toBe(false)
    expect(updateSettings).toHaveBeenCalledWith(updater)
    expect(saveSettings).not.toHaveBeenCalled()
  })

  it('uses the accepted settings when storage rebases an edit without a change event', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => result.current.updateSettings(current => ({ ...current, enabled: false })))
    await act(async () => save.resolve(DEFAULT_SETTINGS))

    expect(result.current.settings.enabled).toBe(true)
    expect(result.current.saveError).toBeNull()
  })

  it.each(['update', 'replace'] as const)('keeps a newer observed snapshot when an older %s completes', async kind => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    vi.mocked(saveSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    const submitted = { ...DEFAULT_SETTINGS, enabled: false }
    let replacement: Promise<typeof DEFAULT_SETTINGS> | undefined
    act(() => {
      if (kind === 'update') result.current.updateSettings(() => submitted)
      else replacement = result.current.replaceSettings(submitted)
    })
    const newer = { ...submitted, locale: 'zh-TW' as const, seek: { seconds: 17 } }
    act(() => vi.mocked(observeSettings).mock.calls[0][0](newer))
    await act(async () => {
      save.resolve(submitted)
      await replacement
    })

    expect(result.current.settings).toEqual(newer)
    expect(result.current.seek.draft.seconds).toBe('17')
  })

  it.each(['update', 'replace'] as const)('preserves unsubmitted numeric drafts while a %s completes', async kind => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    vi.mocked(saveSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    let replacement: Promise<typeof DEFAULT_SETTINGS> | undefined
    act(() => {
      if (kind === 'update') result.current.updateSettings(current => ({ ...current, locale: 'zh-TW' }))
      else replacement = result.current.replaceSettings({ ...DEFAULT_SETTINGS, locale: 'zh-TW' })
    })
    act(() => {
      result.current.speed.setField('preferred', '1.8')
      result.current.seek.setSeconds('23')
      result.current.holdSpeed.setSpeed('2.7')
    })
    await act(async () => {
      save.resolve({ ...DEFAULT_SETTINGS, locale: 'zh-TW' })
      await replacement
    })

    expect(result.current.settings.locale).toBe('zh-TW')
    expect(result.current.speed.draft.preferred).toBe('1.8')
    expect(result.current.seek.draft.seconds).toBe('23')
    expect(result.current.holdSpeed.draft.speed).toBe('2.7')
  })

  it('rolls a rejected latest edit back to confirmed settings and retains the error', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => result.current.updateSettings(current => ({ ...current, enabled: false })))
    await act(async () => save.reject(new Error('Storage unavailable.')))

    expect(result.current.settings.enabled).toBe(true)
    expect(result.current.saveError).toBe('Storage unavailable.')
  })

  it('does not let an earlier successful save replace a newer local edit', async () => {
    const first = deferred<typeof DEFAULT_SETTINGS>()
    const second = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    act(() => result.current.updateSettings(current => ({ ...current, enabled: false })))
    act(() => result.current.updateSettings(current => ({ ...current, locale: 'zh-TW' })))
    await act(async () => first.resolve({ ...DEFAULT_SETTINGS, enabled: false }))

    expect(result.current.settings).toMatchObject({ enabled: false, locale: 'zh-TW' })
    await act(async () => second.resolve({ ...DEFAULT_SETTINGS, enabled: false, locale: 'zh-TW' }))
    expect(result.current.settings).toMatchObject({ enabled: false, locale: 'zh-TW' })
  })

  it('retains an earlier accepted save as the rollback baseline for a later failure', async () => {
    const first = deferred<typeof DEFAULT_SETTINGS>()
    const second = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    act(() => result.current.updateSettings(current => ({ ...current, enabled: false })))
    act(() => result.current.updateSettings(current => ({ ...current, locale: 'zh-TW' })))
    await act(async () => first.resolve({ ...DEFAULT_SETTINGS, enabled: false }))
    await act(async () => second.reject(new Error('Second write failed.')))

    expect(result.current.settings).toEqual({ ...DEFAULT_SETTINGS, enabled: false })
    expect(result.current.saveError).toBe('Second write failed.')
  })

  it('preserves numeric text drafts when observed settings change', async () => {
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    act(() => result.current.speed.setField('preferred', '1.8'))
    act(() => vi.mocked(observeSettings).mock.calls[0][0]({
      ...DEFAULT_SETTINGS,
      speed: { ...DEFAULT_SETTINGS.speed, min: 0.5 },
    }))

    expect(result.current.speed.draft.min).toBe('0.5')
    expect(result.current.speed.draft.preferred).toBe('1.8')
  })

  it('commits one speed field without erasing a different unsubmitted speed draft', async () => {
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))
    act(() => {
      result.current.speed.setField('preferred', '1.8')
      result.current.speed.setField('max', '2.4')
    })
    act(() => result.current.speed.commitField('max'))

    expect(result.current.settings.speed.max).toBe(2.4)
    expect(result.current.speed.draft.max).toBe('2.4')
    expect(result.current.speed.draft.preferred).toBe('1.8')
  })

  it('reports the latest save failure', async () => {
    const save = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings).mockReturnValue(save.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
    })
    await act(async () => save.reject(new Error('Storage unavailable.')))

    expect(result.current.saveError).toBe('Storage unavailable.')
  })

  it('ignores a stale failure from an earlier save', async () => {
    const firstSave = deferred<typeof DEFAULT_SETTINGS>()
    const secondSave = deferred<typeof DEFAULT_SETTINGS>()
    vi.mocked(updateSettings)
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(secondSave.promise)
    const { result } = renderHook(() => useShortcutSettingsForm())
    await waitFor(() => expect(result.current.loaded).toBe(true))

    act(() => {
      result.current.updateSettings(current => ({ ...current, enabled: false }))
      result.current.updateSettings(current => ({ ...current, enabled: true }))
    })
    await act(async () => firstSave.reject(new Error('Stale failure.')))
    await waitFor(() => expect(updateSettings).toHaveBeenCalledTimes(2))
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
    expect(saveSettings).toHaveBeenCalledWith(replacement)
    expect(updateSettings).not.toHaveBeenCalled()

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
