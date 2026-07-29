import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PopupApp } from '@/popup/popup-app'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE } from '@/shared/playback-focus-restoration'

const openCompatibilityDiagnostics = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Compatibility' }))
}

describe('PopupApp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('explains prolonged Netflix loading without reporting compatibility ready', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
      callback([
        {
          id: 1,
          windowId: 1,
          status: 'loading',
          url: 'https://www.netflix.com/watch/123',
        } as chrome.tabs.Tab,
      ])
    })

    try {
      render(<PopupApp />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(
        screen.getByRole('button', { name: 'Checking compatibility…' })
      ).toBeDisabled()
      expect(
        screen.queryByText(
          'Netflix is still loading. Compatibility will be checked automatically when loading finishes.'
        )
      ).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })

      expect(
        screen.getByText(
          'Netflix is still loading. Compatibility will be checked automatically when loading finishes.'
        )
      ).toBeInTheDocument()
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders key summary and speed settings without a ready status card', async () => {
    render(<PopupApp />)

    expect(await screen.findByText('Shortcut Override')).toBeInTheDocument()
    expect(screen.getByRole('main').firstElementChild).toHaveClass('p-3')
    expect(screen.getByRole('main').firstElementChild).not.toHaveClass('pr-[18px]')
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubRepository
    )
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    expect(screen.getByText('General settings')).toBeInTheDocument()
    expect(screen.queryByText('Netflix playback features are ready.')).not.toBeInTheDocument()
    await waitFor(() => expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Open a Netflix title to use shortcuts.')).not.toBeInTheDocument()
    expect(screen.queryByText('Shortcuts only run on Netflix watch pages.')).not.toBeInTheDocument()
    expect(screen.getByText('Space')).toBeInTheDocument()
    expect(screen.getByText('Space').closest('[data-slot="kbd"]')).toBeInTheDocument()
    const localeCombobox = screen.getByRole('combobox', { name: 'Language' })
    const themeCombobox = screen.getByRole('combobox', { name: 'Theme' })
    const enabledSwitch = screen.getByRole('switch', { name: 'Enable shortcut override' })
    expect(localeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(themeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(screen.getByLabelText('Lowest speed')).toHaveValue(0.25)
    expect(screen.getByLabelText('Highest speed')).toHaveValue(3)
    expect(screen.getByLabelText('Speed change')).toHaveValue(0.25)
    expect(screen.getByLabelText('Hold speed')).toHaveValue(2)
    expect(screen.getByRole('switch', { name: 'Space hold speed: Enabled' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(
      screen.getByRole('switch', { name: 'Space hold speed: Show speed hint' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Enabled info' })).not.toBeInTheDocument()
    const seekInput = screen.getByLabelText('Seconds per seek')
    expect(seekInput).toHaveValue(10)
    expect(seekInput).toHaveAttribute('max', '60')
    const speedSection = screen.getByText('Speed shortcuts').closest('section')
    expect(speedSection).not.toBeNull()
    expect(within(speedSection as HTMLElement).queryByLabelText('Seconds per seek')).not.toBeInTheDocument()
    const seekSection = screen.getByText('Seek shortcuts').closest('section')
    expect(seekSection).not.toBeNull()
    expect(within(seekSection as HTMLElement).getByLabelText('Seconds per seek')).toBe(
      seekInput
    )
    expect(screen.getByRole('button', { name: 'Enable shortcut override info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lowest speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Highest speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Speed change info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hold speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seconds per seek info' })).toBeInTheDocument()
    expect(localeCombobox).toHaveTextContent('Auto')
    expect(themeCombobox).toHaveTextContent('Auto')

    await openCompatibilityDiagnostics()
    expect(await screen.findByText('Netflix playback features are ready.')).toBeInTheDocument()
    const diagnosticsRegion = screen.getByRole('region', { name: 'Compatibility' })
    expect(diagnosticsRegion).toHaveClass('p-3')
    expect(diagnosticsRegion).not.toHaveClass('pr-10')
    expect(screen.getByText('Netflix player API')).toBeInTheDocument()
    expect(screen.getAllByText('Found')).toHaveLength(2)
  })

  it('persists quick setting toggles', async () => {
    render(<PopupApp />)

    const enabledSwitch = await screen.findByRole('switch', {
      name: 'Enable shortcut override',
    })
    fireEvent.click(enabledSwitch)

    await waitFor(() => {
      expect(enabledSwitch).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('persists popup theme changes', async () => {
    render(<PopupApp />)

    const themeCombobox = await screen.findByRole('combobox', { name: 'Theme' })
    fireEvent.click(themeCombobox)
    fireEvent.click(await screen.findByText('Dark'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
      expect(document.documentElement).toHaveClass('dark')
    })
  })

  it('persists popup language changes', async () => {
    render(<PopupApp />)

    const localeCombobox = await screen.findByRole('combobox', { name: 'Language' })
    fireEvent.click(localeCombobox)
    fireEvent.click(await screen.findByText('繁中'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    })
  })

  it('persists popup speed changes', async () => {
    render(<PopupApp />)

    const stepInput = await screen.findByLabelText('Speed change')
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)

    await waitFor(() => expect(stepInput).toHaveValue(0.35))
  })

  it('persists popup seek second changes', async () => {
    render(<PopupApp />)

    const seekInput = await screen.findByLabelText('Seconds per seek')
    fireEvent.change(seekInput, { target: { value: '20' } })
    fireEvent.blur(seekInput)

    await waitFor(() => expect(seekInput).toHaveValue(20))
  })

  it('opens the full options page', async () => {
    render(<PopupApp />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open options' }))
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('closes the Firefox popup after opening the full options page', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    const closePopup = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    render(<PopupApp />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open options' }))

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce()
    expect(closePopup).toHaveBeenCalledOnce()
  })

  it('requests Netflix focus restoration when the popup closes', async () => {
    render(<PopupApp />)
    await screen.findByRole('button', { name: 'Compatibility' })

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
      tabId: 1,
      windowId: 1,
    })
  })

  it('can restore focus when the popup closes before page detection finishes', async () => {
    const queryCallbacks: Array<(tabs: chrome.tabs.Tab[]) => void> = []
    vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
      queryCallbacks.push(callback)
    })
    render(<PopupApp />)

    expect(queryCallbacks).toHaveLength(1)
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(queryCallbacks).toHaveLength(1)

    act(() => {
      queryCallbacks[0]([
        {
          id: 17,
          windowId: 3,
          url: 'https://www.netflix.com/watch/123',
        } as chrome.tabs.Tab,
      ])
    })

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 3,
      })
    })
  })

  it('does not restore Netflix focus after opening GitHub', async () => {
    render(<PopupApp />)
    const githubLink = await screen.findByRole('link', {
      name: 'Open GitHub repository',
    })

    fireEvent.click(githubLink)
    act(() => window.dispatchEvent(new Event('pagehide')))

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('does not restore Netflix focus after opening another project', async () => {
    render(<PopupApp />)
    fireEvent.click(await screen.findByRole('combobox', { name: 'Other products' }))
    fireEvent.click(await screen.findByText('Stream Danmaku'))

    act(() => window.dispatchEvent(new Event('pagehide')))

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('shows a Netflix-only message outside Netflix', async () => {
    vi.mocked(chrome.tabs.query).mockImplementationOnce((_query, callback) => {
      callback([{ id: 1, url: 'https://example.com/' } as chrome.tabs.Tab])
    })

    render(<PopupApp />)

    expect(await screen.findByText('Shortcuts only run on Netflix watch pages.')).toBeInTheDocument()
    expect(screen.queryByText('Compatibility')).not.toBeInTheDocument()
  })

  it('shows compatibility warnings returned by the Netflix content script', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: false,
          playerApiFound: false,
          playerFound: false,
          pipSupported: true,
          pipActive: false,
          error: 'No page bridge response.',
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const retryingStatus = await screen.findByText(
      'The Netflix player is not ready yet. Retrying automatically…'
    )
    expect(retryingStatus.closest('div')?.querySelector('svg')).toHaveClass('animate-spin')
    expect(screen.getAllByText('Missing')).toHaveLength(2)
  })

  it('shows a stable compatibility warning when only Picture-in-Picture is unsupported', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: true,
          playerApiFound: true,
          playerFound: true,
          pipSupported: false,
          pipActive: false,
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const warningStatus = await screen.findByText('Some playback features may be unavailable.')
    expect(warningStatus.closest('div')?.querySelector('svg')).not.toHaveClass('animate-spin')
    expect(screen.queryByText(/Retrying automatically/)).not.toBeInTheDocument()
  })

  it('hides the page bridge row for Firefox fallback diagnostics', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: false,
          playerApiFound: true,
          playerFound: true,
          pipSupported: false,
          pipActive: false,
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    expect(await screen.findByText('Netflix player API')).toBeInTheDocument()
    expect(screen.queryByText('Page bridge')).not.toBeInTheDocument()
  })

  it('keeps a disabled animated compatibility control visible while checking', async () => {
    let resolveDiagnostics:
      | ((response: Record<string, unknown>) => void)
      | undefined
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        resolveDiagnostics =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
      }
    )

    render(<PopupApp />)

    const checkingButton = await screen.findByRole('button', {
      name: 'Checking compatibility…',
    })
    expect(checkingButton).toBeDisabled()
    expect(checkingButton.querySelector('svg')).toHaveClass('animate-spin')

    act(() => {
      resolveDiagnostics?.({
        contentScriptReady: true,
        settingsLoaded: true,
        enabled: true,
        videoFound: true,
        bridgeReady: true,
        playerApiFound: true,
        playerFound: true,
        pipSupported: true,
        pipActive: false,
      })
    })

    expect(await screen.findByRole('button', { name: 'Compatibility' })).toBeEnabled()
  })

  it('offers to reload Netflix when the content script is missing', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        Object.defineProperty(chrome.runtime, 'lastError', {
          configurable: true,
          value: {
            message: 'Could not establish connection. Receiving end does not exist.',
          },
        })
        callback?.(undefined as unknown as Record<string, unknown>)
        Object.defineProperty(chrome.runtime, 'lastError', {
          configurable: true,
          value: undefined,
        })
      }
    )

    render(<PopupApp />)
    const connectionAlert = await screen.findByRole('alert', {
      name: 'Extension not active',
    })
    expect(connectionAlert).toHaveTextContent(
      'Reload the Netflix tab to reconnect the extension.'
    )
    expect(
      screen.queryByRole('button', {
        name: 'Compatibility: Extension not active',
      })
    ).not.toBeInTheDocument()
    try {
      const closePopup = vi.spyOn(window, 'close').mockImplementation(() => undefined)
      expect(screen.queryByText(/Retrying automatically/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Copy diagnostics' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Reload Netflix' }))
      await act(async () => {
        window.dispatchEvent(new Event('pagehide'))
        await Promise.resolve()
      })
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1)
      expect(closePopup).toHaveBeenCalledOnce()
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 1,
        windowId: 1,
      })
      expect(screen.queryByRole('alert', { name: 'Extension not active' })).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Checking compatibility…' })
      ).toBeDisabled()
    } finally {
      Object.defineProperty(chrome.runtime, 'lastError', {
        configurable: true,
        value: undefined,
      })
    }
  })

  it('copies a privacy-safe compatibility report', async () => {
    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    fireEvent.click(await screen.findByRole('button', { name: 'Copy diagnostics' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Extension version: 0.4.1')
      )
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.not.stringContaining('https://www.netflix.com/watch/123')
    )
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('locks background scrolling while compatibility diagnostics are open', async () => {
    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const wheelWhileOpen = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })
    document.dispatchEvent(wheelWhileOpen)
    expect(wheelWhileOpen.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    const wheelAfterClose = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })
    document.dispatchEvent(wheelAfterClose)
    expect(wheelAfterClose.defaultPrevented).toBe(false)
  })

})
