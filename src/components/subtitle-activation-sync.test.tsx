import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { PopupApp } from '@/popup/popup-app'
import { getSettings } from '@/shared/storage'

describe('shared subtitle activation', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reflects Options activation in the popup reference without adding another subtitle switch', async () => {
    const options = render(<OptionsApp />)
    fireEvent.click(await within(options.container).findByRole('button', { name: 'Subtitles' }))
    const popup = render(<PopupApp />)
    const name = 'Enable subtitle navigation shortcuts'
    const optionsToggle = await within(options.container).findByRole('switch', { name })
    fireEvent.click(await within(popup.container).findByRole('combobox', { name: 'Shortcuts and settings' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Subtitles' }))
    const reference = await within(popup.container).findByRole('region', { name: 'Sentence jumps and replay' })
    expect(within(popup.container).queryByRole('switch', { name })).not.toBeInTheDocument()
    expect(within(reference).getAllByText('Disabled')).toHaveLength(2)
    fireEvent.click(optionsToggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
    expect(optionsToggle).toHaveAttribute('aria-checked', 'true')
    expect(within(reference).getAllByText('Disabled')).toHaveLength(1)
    expect(within(reference).getByText('Previous subtitle')).toBeVisible()
    fireEvent.click(optionsToggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(false))
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
  })

  it('cancels pending Options activation when the popup turns the extension off', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    const options = render(<OptionsApp />)
    fireEvent.click(await within(options.container).findByRole('button', { name: 'Subtitles' }))
    const popup = render(<PopupApp />)
    const optionsToggle = await within(options.container).findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    const globalToggle = await within(popup.container).findByRole('switch', { name: 'Enable extension' })
    fireEvent.click(optionsToggle)
    expect(optionsToggle).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(globalToggle)
    await waitFor(async () => expect((await getSettings()).enabled).toBe(false))
    fireEvent.click(globalToggle)
    await waitFor(async () => expect((await getSettings()).enabled).toBe(true))
    await act(async () => { approve(true) })
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    expect(optionsToggle).not.toBeChecked()
    expect(optionsToggle).toHaveAttribute('aria-busy', 'false')
  })
})
