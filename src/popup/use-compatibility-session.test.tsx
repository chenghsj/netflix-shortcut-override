import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useCompatibilitySession } from '@/popup/use-compatibility-session'
import type { CompatibilityDiagnostics } from '@/shared/diagnostics'

const READY_DIAGNOSTICS = {
  contentScriptReady: true,
  settingsLoaded: true,
  enabled: true,
  videoFound: true,
  bridgeReady: true,
  playerApiFound: true,
  playerFound: true,
  pipSupported: true,
  pipActive: false,
} satisfies CompatibilityDiagnostics

const PENDING_DIAGNOSTICS = {
  ...READY_DIAGNOSTICS,
  videoFound: false,
  playerApiFound: false,
  playerFound: false,
} satisfies CompatibilityDiagnostics

type DiagnosticsCallback = (response: CompatibilityDiagnostics | undefined) => void

const getDiagnosticsCallback = (
  optionsOrCallback: unknown,
  maybeCallback: unknown
): DiagnosticsCallback | undefined => {
  const callback =
    typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
  return typeof callback === 'function' ? callback as DiagnosticsCallback : undefined
}

const replyWithRuntimeError = (
  callback: DiagnosticsCallback | undefined,
  message: string
) => {
  Object.defineProperty(chrome.runtime, 'lastError', {
    configurable: true,
    value: { message },
  })
  callback?.(undefined)
  Object.defineProperty(chrome.runtime, 'lastError', {
    configurable: true,
    value: undefined,
  })
}

const mockMissingReceiver = () => {
  vi.mocked(chrome.tabs.sendMessage).mockImplementation(
    (_tabId, _message, optionsOrCallback, maybeCallback) => {
      replyWithRuntimeError(
        getDiagnosticsCallback(optionsOrCallback, maybeCallback),
        'Could not establish connection. Receiving end does not exist.'
      )
    }
  )
}

describe('useCompatibilitySession', () => {
  it('reports initial diagnostics for the active Netflix watch tab', async () => {
    const { result } = renderHook(() => useCompatibilitySession())

    await waitFor(() => {
      expect(result.current.pageStatus).toBe('watch')
      expect(result.current.diagnosticsState.status).toBe('ready')
    })

    expect(result.current.diagnosticsTriggerState).toBe('default')
    expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
  })

  it('requires a reload after three missing-receiver attempts', async () => {
    vi.useFakeTimers()
    mockMissingReceiver()

    const { result, unmount } = renderHook(() => useCompatibilitySession())

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
      expect(result.current.diagnosticsTriggerState).toBe('checking')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(199)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(3)
      expect(result.current.diagnosticsState.status).toBe('reload-required')
      expect(result.current.diagnosticsTriggerState).toBe('reload-required')
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('does not request diagnostics outside a Netflix watch page', async () => {
    vi.mocked(chrome.tabs.query).mockImplementationOnce((_query, callback) => {
      callback([{ id: 7, url: 'https://example.com/' } as chrome.tabs.Tab])
    })

    const { result } = renderHook(() => useCompatibilitySession())

    await waitFor(() => expect(result.current.pageStatus).toBe('external'))
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()
    expect(result.current.diagnosticsTriggerState).toBe('checking')
  })

  it('distinguishes a Netflix page without active playback', async () => {
    vi.mocked(chrome.tabs.query).mockImplementationOnce((_query, callback) => {
      callback([{ id: 7, url: 'https://www.netflix.com/browse' } as chrome.tabs.Tab])
    })

    const { result } = renderHook(() => useCompatibilitySession())

    await waitFor(() => expect(result.current.pageStatus).toBe('netflix'))
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()
  })

  it('reports non-receiver messaging failures without retrying', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        replyWithRuntimeError(
          getDiagnosticsCallback(optionsOrCallback, maybeCallback),
          'The message port closed.'
        )
      }
    )

    const { result, unmount } = renderHook(() => useCompatibilitySession())

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(result.current.diagnosticsState.status).toBe('unavailable')
      expect(result.current.diagnosticsTriggerState).toBe('default')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('polls unresolved diagnostics while open and stops after closing', async () => {
    const { result, unmount } = renderHook(() => useCompatibilitySession())
    await waitFor(() => expect(result.current.diagnosticsState.status).toBe('ready'))
    vi.mocked(chrome.tabs.sendMessage).mockClear()
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        getDiagnosticsCallback(optionsOrCallback, maybeCallback)?.(PENDING_DIAGNOSTICS)
      }
    )
    vi.useFakeTimers()

    try {
      act(() => result.current.setDiagnosticsOpen(true))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)

      act(() => result.current.setDiagnosticsOpen(false))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('recovers when the content script appears during the initial retry window', async () => {
    vi.useFakeTimers()
    let attempt = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback = getDiagnosticsCallback(optionsOrCallback, maybeCallback)
        attempt += 1
        if (attempt === 1) {
          replyWithRuntimeError(
            callback,
            'Could not establish connection. Receiving end does not exist.'
          )
          return
        }
        callback?.(READY_DIAGNOSTICS)
      }
    )

    const { result, unmount } = renderHook(() => useCompatibilitySession())

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(result.current.diagnosticsState.status).toBe('ready')
      expect(result.current.diagnosticsTriggerState).toBe('default')
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('stops polling as soon as playback compatibility is ready', async () => {
    const { result, unmount } = renderHook(() => useCompatibilitySession())
    await waitFor(() => expect(result.current.diagnosticsState.status).toBe('ready'))
    vi.mocked(chrome.tabs.sendMessage).mockClear()
    vi.useFakeTimers()

    try {
      act(() => result.current.setDiagnosticsOpen(true))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('reloads the active Netflix tab and resets the session', async () => {
    const closePopup = vi.spyOn(window, 'close').mockImplementation(() => undefined)
    const { result } = renderHook(() => useCompatibilitySession())
    await waitFor(() => expect(result.current.diagnosticsState.status).toBe('ready'))

    act(() => result.current.reloadNetflixPage())

    expect(chrome.tabs.reload).toHaveBeenCalledWith(1)
    expect(closePopup).toHaveBeenCalledOnce()
    expect(result.current.diagnosticsOpen).toBe(false)
    expect(result.current.diagnosticsState.status).toBe('loading')
    expect(result.current.diagnosticsTriggerState).toBe('checking')
  })

  it('cancels a scheduled receiver retry when the session unmounts', async () => {
    vi.useFakeTimers()
    mockMissingReceiver()

    const { unmount } = renderHook(() => useCompatibilitySession())

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()

      unmount()
      await vi.advanceTimersByTimeAsync(1_000)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the latest diagnostics visible while a later poll is pending', async () => {
    const { result, unmount } = renderHook(() => useCompatibilitySession())
    await waitFor(() => expect(result.current.diagnosticsState.status).toBe('ready'))
    vi.mocked(chrome.tabs.sendMessage).mockClear()
    let pollAttempt = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback = getDiagnosticsCallback(optionsOrCallback, maybeCallback)
        pollAttempt += 1
        if (pollAttempt > 1) return
        callback?.(PENDING_DIAGNOSTICS)
      }
    )
    vi.useFakeTimers()

    try {
      act(() => result.current.setDiagnosticsOpen(true))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(result.current.diagnosticsState.status).toBe('ready')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(result.current.diagnosticsState.status).toBe('ready')
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })

  it('keeps the diagnostics control usable when an in-flight refresh is closed', async () => {
    const { result } = renderHook(() => useCompatibilitySession())
    await waitFor(() => expect(result.current.diagnosticsState.status).toBe('ready'))
    let resolveRefresh: ((response: CompatibilityDiagnostics) => void) | undefined
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        resolveRefresh = getDiagnosticsCallback(
          optionsOrCallback,
          maybeCallback
        ) as typeof resolveRefresh
      }
    )

    act(() => result.current.setDiagnosticsOpen(true))
    expect(result.current.diagnosticsState.status).toBe('loading')

    act(() => result.current.setDiagnosticsOpen(false))
    expect(result.current.diagnosticsState.status).toBe('ready')
    await act(async () => {
      resolveRefresh?.(PENDING_DIAGNOSTICS)
      await Promise.resolve()
    })

    expect(result.current.diagnosticsState.status).toBe('ready')
    expect(result.current.diagnosticsTriggerState).toBe('default')
  })

  it('does not let an older initial request overwrite a newer refresh', async () => {
    const pendingRequests: Array<(response: CompatibilityDiagnostics) => void> = []
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback = getDiagnosticsCallback(optionsOrCallback, maybeCallback)
        if (callback) pendingRequests.push(callback as (response: CompatibilityDiagnostics) => void)
      }
    )

    const { result } = renderHook(() => useCompatibilitySession())
    await waitFor(() => {
      expect(result.current.pageStatus).toBe('watch')
      expect(pendingRequests).toHaveLength(1)
    })

    act(() => result.current.setDiagnosticsOpen(true))
    expect(pendingRequests).toHaveLength(2)

    await act(async () => {
      pendingRequests[1](READY_DIAGNOSTICS)
      await Promise.resolve()
    })
    expect(result.current.diagnosticsState).toEqual({
      status: 'ready',
      diagnostics: READY_DIAGNOSTICS,
    })

    await act(async () => {
      pendingRequests[0](PENDING_DIAGNOSTICS)
      await Promise.resolve()
    })
    expect(result.current.diagnosticsState).toEqual({
      status: 'ready',
      diagnostics: READY_DIAGNOSTICS,
    })
  })

  it('cancels a scheduled initial retry when a refresh takes ownership', async () => {
    vi.useFakeTimers()
    let attempt = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback = getDiagnosticsCallback(optionsOrCallback, maybeCallback)
        attempt += 1
        if (attempt === 2) {
          callback?.(READY_DIAGNOSTICS)
          return
        }
        replyWithRuntimeError(
          callback,
          'Could not establish connection. Receiving end does not exist.'
        )
      }
    )

    const { result, unmount } = renderHook(() => useCompatibilitySession())

    try {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()

      act(() => result.current.setDiagnosticsOpen(true))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(result.current.diagnosticsState).toEqual({
        status: 'ready',
        diagnostics: READY_DIAGNOSTICS,
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1_000)
      })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(result.current.diagnosticsState).toEqual({
        status: 'ready',
        diagnostics: READY_DIAGNOSTICS,
      })
    } finally {
      unmount()
      vi.useRealTimers()
    }
  })
})
