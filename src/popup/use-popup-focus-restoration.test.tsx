import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePopupFocusRestoration } from '@/popup/use-popup-focus-restoration'

describe('usePopupFocusRestoration', () => {
  it('delegates focus restoration when the Netflix watch popup closes', async () => {
    renderHook(() =>
      usePopupFocusRestoration(async () => ({ tabId: 17, windowId: 4 }))
    )

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'REQUEST_PLAYBACK_FOCUS_RESTORATION',
      tabId: 17,
      windowId: 4,
    })
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  it('does not request restoration without a Netflix playback target', async () => {
    renderHook(() => usePopupFocusRestoration(async () => undefined))

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.scripting.executeScript).not.toHaveBeenCalled()
  })

  it('requests restoration at most once', async () => {
    const resolvePlaybackFocusTarget = vi.fn(async () => ({
      tabId: 17,
      windowId: 4,
    }))
    renderHook(() => usePopupFocusRestoration(resolvePlaybackFocusTarget))

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(resolvePlaybackFocusTarget).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
  })

  it('allows intentional navigation to suppress restoration', () => {
    const resolvePlaybackFocusTarget = vi.fn(async () => ({
      tabId: 17,
      windowId: 4,
    }))
    const { result } = renderHook(() =>
      usePopupFocusRestoration(resolvePlaybackFocusTarget)
    )

    act(() => {
      result.current.suppressFocusRestoration()
      window.dispatchEvent(new Event('pagehide'))
    })

    expect(resolvePlaybackFocusTarget).not.toHaveBeenCalled()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('silently ignores background messaging failures', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockRejectedValueOnce(
      new Error('The tab closed.')
    )
    renderHook(() =>
      usePopupFocusRestoration(async () => ({ tabId: 17, windowId: 4 }))
    )

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledOnce()
  })
})
