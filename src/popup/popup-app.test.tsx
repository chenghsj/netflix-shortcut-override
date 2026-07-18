import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PopupApp } from '@/popup/popup-app'
import { EXTERNAL_LINKS } from '@/shared/external-links'

const openCompatibilityDiagnostics = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Compatibility' }))
}

describe('PopupApp', () => {
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
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()
    expect(screen.queryByText('Open a Netflix title to use shortcuts.')).not.toBeInTheDocument()
    expect(screen.queryByText('Shortcuts only run on Netflix watch pages.')).not.toBeInTheDocument()
    expect(screen.getByText('Space')).toBeInTheDocument()
    expect(screen.getByText('Space').closest('[data-slot="kbd"]')).toBeInTheDocument()
    const localeCombobox = screen.getByRole('combobox', { name: 'Language' })
    const enabledSwitch = screen.getByRole('switch', { name: 'Enable shortcut override' })
    expect(localeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
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
    expect(localeCombobox).toHaveTextContent('EN')

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

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce()
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
    vi.mocked(chrome.tabs.sendMessage).mockImplementationOnce(
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
    vi.mocked(chrome.tabs.sendMessage).mockImplementationOnce(
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

  it('copies a privacy-safe compatibility report', async () => {
    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    fireEvent.click(await screen.findByRole('button', { name: 'Copy diagnostics' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Extension version: 0.3.1')
      )
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.not.stringContaining('https://www.netflix.com/watch/123')
    )
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('stops compatibility diagnostics after playback is ready', async () => {
    render(<PopupApp />)
    const diagnosticsButton = await screen.findByRole('button', { name: 'Compatibility' })

    vi.useFakeTimers()
    try {
      fireEvent.click(diagnosticsButton)
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(4_000)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('retries unresolved diagnostics and stops when the dialog closes', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: false,
          bridgeReady: true,
          playerApiFound: false,
          playerFound: false,
          pipSupported: true,
          pipActive: false,
        })
      }
    )

    render(<PopupApp />)
    const diagnosticsButton = await screen.findByRole('button', { name: 'Compatibility' })

    vi.useFakeTimers()
    try {
      fireEvent.click(diagnosticsButton)
      await vi.advanceTimersByTimeAsync(0)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(2_000)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
      fireEvent.click(screen.getByRole('button', { name: 'Close' }))
      await vi.advanceTimersByTimeAsync(4_000)
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
