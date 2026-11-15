import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { PopupApp } from '@/popup/popup-app'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'

describe('shared interface style preference', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('data-ui-style')
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
  })

  it.each([
    { name: 'Options', App: OptionsApp, uiStyle: 'classic' },
    { name: 'Options', App: OptionsApp, uiStyle: 'markdown' },
    { name: 'popup', App: PopupApp, uiStyle: 'classic' },
    { name: 'popup', App: PopupApp, uiStyle: 'markdown' },
  ] as const)('does not apply the default style while $name loads the saved $uiStyle appearance', async ({ App, uiStyle }) => {
    await saveSettings({ ...structuredClone(DEFAULT_SETTINGS), uiStyle, theme: 'dark' })
    const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()!
    const pendingReads: Array<() => void> = []
    vi.mocked(chrome.storage.sync.get).mockImplementation((keys, callback) => {
      originalGet(keys, values => pendingReads.push(() => callback?.(values)))
      return Promise.resolve({})
    })
    document.documentElement.removeAttribute('data-ui-style')
    document.documentElement.classList.remove('dark')

    const view = render(<App />)
    try {
      expect(document.documentElement).not.toHaveAttribute('data-ui-style')
      await act(async () => { pendingReads.splice(0).forEach(release => release()) })
      expect(document.documentElement).toHaveAttribute('data-ui-style', uiStyle)
      expect(document.documentElement).toHaveClass('dark')
      expect(document.documentElement.style.colorScheme).toBe('dark')
    } finally {
      view.unmount()
      vi.mocked(chrome.storage.sync.get).mockImplementation(originalGet)
      await act(async () => { pendingReads.splice(0).forEach(release => release()) })
    }
  })

  it('persists across Options and popup and follows updates without altering brightness or shortcuts', async () => {
    await saveSettings({ ...structuredClone(DEFAULT_SETTINGS), theme: 'dark' })
    const options = render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'General settings' }))
    fireEvent.click(await screen.findByRole('combobox', { name: 'Interface style' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Classic' }))
    await waitFor(async () => expect((await getSettings()).uiStyle).toBe('classic'))
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect(document.documentElement).toHaveClass('dark')
    expect((await getSettings()).bindings).toEqual(DEFAULT_SETTINGS.bindings)
    options.unmount()

    render(<PopupApp />)
    await screen.findByRole('region', { name: 'Shortcuts' })
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.queryByRole('combobox', { name: 'Interface style' })).not.toBeInTheDocument()
    await act(async () => { await saveSettings({ ...(await getSettings()), uiStyle: 'neobrutalism' }) })
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'neobrutalism')
    expect(document.documentElement).toHaveClass('dark')
    await act(async () => { await saveSettings({ ...(await getSettings()), uiStyle: 'classic' }) })
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect((await getSettings()).bindings).toEqual(DEFAULT_SETTINGS.bindings)
  })
})
