import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { PopupApp } from '@/popup/popup-app'
import { getSettings } from '@/shared/storage'

describe('shared subtitle activation', () => {
  it('synchronizes popup and Options without requesting permissions on disable', async () => {
    const options = render(<OptionsApp />)
    const popup = render(<PopupApp />)
    const name = 'Enable subtitle navigation shortcuts'
    const optionsToggle = await within(options.container).findByRole('switch', { name })
    const popupToggle = await within(popup.container).findByRole('switch', { name })
    fireEvent.click(popupToggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
    expect(optionsToggle).toHaveAttribute('aria-checked', 'true')
    expect(popupToggle).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(optionsToggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(false))
    expect(popupToggle).toHaveAttribute('aria-checked', 'false')
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
  })
})
