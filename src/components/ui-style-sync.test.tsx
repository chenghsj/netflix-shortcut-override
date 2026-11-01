import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { PopupApp } from '@/popup/popup-app'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'

describe('shared interface style preference', () => {
  it('persists across Options and popup and follows updates without altering brightness or shortcuts', async () => {
    await saveSettings({ ...structuredClone(DEFAULT_SETTINGS), theme: 'dark' })
    const options = render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('combobox', { name: 'Interface style' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Classic' }))
    await waitFor(async () => expect((await getSettings()).uiStyle).toBe('classic'))
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect(document.documentElement).toHaveClass('dark')
    expect((await getSettings()).bindings).toEqual(DEFAULT_SETTINGS.bindings)
    options.unmount()

    render(<PopupApp />)
    fireEvent.mouseDown(await screen.findByRole('tab', { name: 'Settings' }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole('button', { name: 'General settings' }))
    expect(await screen.findByRole('combobox', { name: 'Interface style' })).toHaveTextContent('Classic')
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
    fireEvent.click(screen.getByRole('combobox', { name: 'Interface style' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Neobrutalism' }))
    await waitFor(async () => expect((await getSettings()).uiStyle).toBe('neobrutalism'))
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'neobrutalism')
    expect(document.documentElement).toHaveClass('dark')

    await act(async () => { await saveSettings({ ...(await getSettings()), uiStyle: 'classic' }) })
    expect(screen.getByRole('combobox', { name: 'Interface style' })).toHaveTextContent('Classic')
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect((await getSettings()).bindings).toEqual(DEFAULT_SETTINGS.bindings)
  })
})
