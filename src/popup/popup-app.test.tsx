import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { PopupApp } from '@/popup/popup-app'
import { EXTERNAL_LINKS } from '@/shared/external-links'

describe('PopupApp', () => {
  it('renders key summary and speed settings without a ready status card', async () => {
    render(<PopupApp />)

    expect(await screen.findByText('Shortcut Override')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubRepository
    )
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    expect(screen.getByText('General settings')).toBeInTheDocument()
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
    expect(screen.getByLabelText('Each change')).toHaveValue(0.25)
    expect(screen.getByLabelText('Hold speed')).toHaveValue(2)
    expect(screen.getByRole('switch', { name: 'Space hold speed: Enabled' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(screen.queryByRole('button', { name: 'Enabled info' })).not.toBeInTheDocument()
    const seekInput = screen.getByLabelText('Seek interval (seconds)')
    expect(seekInput).toHaveValue(10)
    expect(seekInput).toHaveAttribute('max', '60')
    const speedSection = screen.getByText('Speed shortcuts').closest('section')
    expect(speedSection).not.toBeNull()
    expect(within(speedSection as HTMLElement).getByLabelText('Seek interval (seconds)')).toBe(
      seekInput
    )
    expect(screen.queryByText('Seek shortcuts')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enable shortcut override info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lowest speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Highest speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Each change info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hold speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seek interval (seconds) info' })).toBeInTheDocument()
    expect(localeCombobox).toHaveTextContent('EN')
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

    const stepInput = await screen.findByLabelText('Each change')
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)

    await waitFor(() => expect(stepInput).toHaveValue(0.35))
  })

  it('persists popup seek second changes', async () => {
    render(<PopupApp />)

    const seekInput = await screen.findByLabelText('Seek interval (seconds)')
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
  })
})
