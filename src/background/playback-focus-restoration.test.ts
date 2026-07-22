import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE } from '@/shared/playback-focus-restoration'
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

describe('background playback focus restoration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('restores focus for a ready active Netflix watch page', async () => {
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]

    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
    expect(chrome.storage.session.set).toHaveBeenCalled()
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: 17 },
      world: 'MAIN',
      func: expect.any(Function),
    })
  })

  it('keeps the request pending until the loading Netflix tab completes', async () => {
    let tabStatus: chrome.tabs.Tab['status'] = 'loading'
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: tabStatus,
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]

    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )

    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
    const onUpdated = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0]?.[0]
    expect(onUpdated).toBeDefined()

    tabStatus = 'complete'
    onUpdated?.(
      17,
      { status: 'complete' },
      {
        id: 17,
        windowId: 1,
        active: true,
        status: 'complete',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab
    )

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalled())
  })

  it('resumes a persisted loading request when the service worker restarts after completion', async () => {
    let tabStatus: chrome.tabs.Tab['status'] = 'loading'
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: tabStatus,
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )
    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()

    tabStatus = 'complete'
    vi.resetModules()
    await import('@/background/index')

    await vi.waitFor(() => expect(chrome.scripting.executeScript).toHaveBeenCalledOnce())
  })

  it('clears scheduled work when a pending request is cancelled', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      listener?.(
        {
          type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
          tabId: 17,
          windowId: 1,
        },
        {} as chrome.runtime.MessageSender,
        vi.fn()
      )
      await vi.advanceTimersByTimeAsync(0)

      const onActivated = vi.mocked(chrome.tabs.onActivated.addListener).mock.calls[0]?.[0]
      onActivated?.({ tabId: 99, windowId: 1 })
      await vi.advanceTimersByTimeAsync(0)
      const storageReadsAfterCancellation = vi.mocked(chrome.storage.session.get).mock.calls.length

      await vi.advanceTimersByTimeAsync(30_000)
      expect(chrome.storage.session.get).toHaveBeenCalledTimes(
        storageReadsAfterCancellation
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('cancels pending focus when the user activates another tab', async () => {
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )
    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())

    const onActivated = vi.mocked(chrome.tabs.onActivated.addListener).mock.calls[0]?.[0]
    expect(onActivated).toBeDefined()
    onActivated?.({ tabId: 99, windowId: 1 })
    await vi.waitFor(() =>
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
    )

    const onUpdated = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0]?.[0]
    onUpdated?.(
      17,
      { status: 'complete' },
      {
        id: 17,
        windowId: 1,
        active: true,
        status: 'complete',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab
    )

    await Promise.resolve()
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  it('cancels pending focus when the user focuses another window', async () => {
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )
    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())

    const onFocusChanged = vi.mocked(
      chrome.windows.onFocusChanged.addListener
    ).mock.calls[0]?.[0]
    expect(onFocusChanged).toBeDefined()
    onFocusChanged?.(2)
    await vi.waitFor(() =>
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
    )

    const onUpdated = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0]?.[0]
    onUpdated?.(
      17,
      { status: 'complete' },
      {
        id: 17,
        windowId: 1,
        active: true,
        status: 'complete',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab
    )

    await Promise.resolve()
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  it('cancels pending focus when the Netflix tab closes', async () => {
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )
    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())

    const onRemoved = vi.mocked(chrome.tabs.onRemoved.addListener).mock.calls[0]?.[0]
    expect(onRemoved).toBeDefined()
    onRemoved?.(17, { windowId: 1, isWindowClosing: false })
    await vi.waitFor(() =>
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
    )
  })

  it('cancels pending focus when the tab leaves Netflix playback', async () => {
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    await import('@/background/index')
    const listener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    listener?.(
      {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      },
      {} as chrome.runtime.MessageSender,
      vi.fn()
    )
    await vi.waitFor(() => expect(chrome.storage.session.set).toHaveBeenCalled())

    const onUpdated = vi.mocked(chrome.tabs.onUpdated.addListener).mock.calls[0]?.[0]
    onUpdated?.(
      17,
      { status: 'loading', url: 'https://www.netflix.com/browse' },
      {
        id: 17,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/browse',
      } as chrome.tabs.Tab
    )

    await vi.waitFor(() =>
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
    )
  })

  it('expires a pending focus request after thirty seconds', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      listener?.(
        {
          type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
          tabId: 17,
          windowId: 1,
        },
        {} as chrome.runtime.MessageSender,
        vi.fn()
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.storage.session.set).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(29_999)
      expect(chrome.storage.session.set).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(1)
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits for fresh compatibility readiness before restoring focus', async () => {
    vi.useFakeTimers()
    let diagnosticsAttempt = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : maybeCallback
        diagnosticsAttempt += 1
        callback?.(
          diagnosticsAttempt === 1
            ? {
                ...READY_DIAGNOSTICS,
                contentScriptReady: false,
              } as unknown as CompatibilityDiagnostics
            : READY_DIAGNOSTICS
        )
      }
    )
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      listener?.(
        {
          type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
          tabId: 17,
          windowId: 1,
        },
        {} as chrome.runtime.MessageSender,
        vi.fn()
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(200)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits while shortcut handling is disabled before restoring focus', async () => {
    vi.useFakeTimers()
    let diagnosticsAttempt = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : maybeCallback
        diagnosticsAttempt += 1
        callback?.(
          diagnosticsAttempt === 1
            ? { ...READY_DIAGNOSTICS, enabled: false }
            : READY_DIAGNOSTICS
        )
      }
    )
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      listener?.(
        {
          type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
          tabId: 17,
          windowId: 1,
        },
        {} as chrome.runtime.MessageSender,
        vi.fn()
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledOnce()
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(200)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('retries window focus up to three times until the page reports focus', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.scripting.executeScript)
      .mockResolvedValueOnce([{ frameId: 0, result: false }] as never)
      .mockResolvedValueOnce([{ frameId: 0, result: false }] as never)
      .mockResolvedValueOnce([{ frameId: 0, result: true }] as never)
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      listener?.(
        {
          type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
          tabId: 17,
          windowId: 1,
        },
        {} as chrome.runtime.MessageSender,
        vi.fn()
      )
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(99)
      expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()

      await vi.advanceTimersByTimeAsync(1)
      expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(100)
      expect(chrome.scripting.executeScript).toHaveBeenCalledTimes(3)
      expect(chrome.storage.session.set).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('lets a newer request supersede an older in-flight request for the same tab', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const diagnosticsCallbacks: Array<
      (diagnostics: CompatibilityDiagnostics) => void
    > = []
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : maybeCallback
        diagnosticsCallbacks.push(callback as (diagnostics: CompatibilityDiagnostics) => void)
      }
    )
    const listenerPromise = import('@/background/index').then(
      () => vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
    )

    try {
      const listener = await listenerPromise
      const request = {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      }
      listener?.(request, {} as chrome.runtime.MessageSender, vi.fn())
      await vi.advanceTimersByTimeAsync(0)
      expect(diagnosticsCallbacks).toHaveLength(1)

      await vi.advanceTimersByTimeAsync(1)
      listener?.(request, {} as chrome.runtime.MessageSender, vi.fn())
      await vi.advanceTimersByTimeAsync(0)
      expect(diagnosticsCallbacks).toHaveLength(2)

      diagnosticsCallbacks[0](READY_DIAGNOSTICS)
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.scripting.executeScript).not.toHaveBeenCalled()

      diagnosticsCallbacks[1](READY_DIAGNOSTICS)
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.scripting.executeScript).toHaveBeenCalledOnce()
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps the newer deadline when startup recovery races with a new request', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    vi.mocked(chrome.tabs.get).mockImplementation((tabId, callback) => {
      callback({
        id: tabId,
        windowId: 1,
        active: true,
        status: 'loading',
        url: 'https://www.netflix.com/watch/123',
      } as chrome.tabs.Tab)
    })

    try {
      await import('@/background/index')
      const firstListener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
      const request = {
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 1,
      }
      firstListener?.(request, {} as chrome.runtime.MessageSender, vi.fn())
      await vi.advanceTimersByTimeAsync(0)

      await vi.advanceTimersByTimeAsync(1_000)
      const originalSessionGet = vi.mocked(chrome.storage.session.get).getMockImplementation()
      let releaseStartupRead: (() => void) | undefined
      vi.mocked(chrome.storage.session.get).mockImplementationOnce((keys, callback) => {
        originalSessionGet?.(keys, items => {
          const startupSnapshot = structuredClone(items)
          releaseStartupRead = () => callback(startupSnapshot)
        })
      })

      vi.resetModules()
      await import('@/background/index')
      expect(releaseStartupRead).toBeDefined()
      const restartedListener = vi.mocked(chrome.runtime.onMessage.addListener).mock.calls.at(-1)?.[0]
      restartedListener?.(request, {} as chrome.runtime.MessageSender, vi.fn())
      await vi.advanceTimersByTimeAsync(0)

      releaseStartupRead?.()
      await vi.advanceTimersByTimeAsync(30_000)

      const stored = await new Promise<Record<string, unknown>>(resolve => {
        chrome.storage.session.get(
          'pendingPlaybackFocusRestorations' as never,
          resolve
        )
      })
      expect(stored.pendingPlaybackFocusRestorations).toEqual({})
    } finally {
      vi.useRealTimers()
    }
  })
})
