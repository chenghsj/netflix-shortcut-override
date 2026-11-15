import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResetButton } from './reset-button'
import { TooltipProvider } from '@/components/app-ui/tooltip'
import { getCopy } from '@/shared/i18n'
import { RESET_CONFIRMATION_COPY, RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { LOCALES } from '@/shared/shortcut-types'

describe('reset confirmation', () => {
  it.each(LOCALES)('asks briefly in a non-modal popover in %s before resetting', async locale => {
    const copy = getCopy(locale)
    const onReset = vi.fn()
    render(<ResetButton locale={locale} label={copy.resetAll} description={RESET_SCOPE_COPY[locale].generalShortcuts} onClick={onReset}>{copy.reset}</ResetButton>, { wrapper: TooltipProvider })
    const trigger = screen.getByRole('button', { name: copy.resetAll })
    fireEvent.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: copy.resetAll })
    expect(within(dialog).getByText(RESET_CONFIRMATION_COPY[locale])).toBeVisible()
    expect(within(dialog).queryByText(RESET_SCOPE_COPY[locale].generalShortcuts)).not.toBeInTheDocument()
    expect(dialog).not.toHaveAttribute('aria-modal', 'true')
    expect(document.querySelector('[data-slot="dialog-overlay"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: copy.resetAll })).toBe(trigger)
    expect(within(dialog).getByRole('button', { name: copy.cancel })).toHaveFocus()
    expect(onReset).not.toHaveBeenCalled()

    fireEvent.click(within(dialog).getByRole('button', { name: copy.reset }))
    await waitFor(() => expect(onReset).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it.each(['cancel', 'escape'])('dismisses an icon reset with %s without changing settings', async dismissal => {
    const onReset = vi.fn()
    render(<ResetButton locale="en" label="Reset Mute" description={RESET_SCOPE_COPY.en.binding} iconOnly onClick={onReset} />, { wrapper: TooltipProvider })
    const trigger = screen.getByRole('button', { name: 'Reset Mute' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Reset Mute' })
    if (dismissal === 'cancel') fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    else fireEvent.keyDown(within(dialog).getByRole('button', { name: 'Cancel' }), { key: 'Escape', code: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onReset).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('respects disabled state before opening and while confirmation is open', async () => {
    const onReset = vi.fn()
    const props = { locale: 'en' as const, label: 'Reset Mute', description: RESET_SCOPE_COPY.en.binding, onClick: onReset }
    const { rerender } = render(<ResetButton {...props} disabled />, { wrapper: TooltipProvider })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mute' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<ResetButton {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mute' }))
    const dialog = await screen.findByRole('dialog')
    rerender(<ResetButton {...props} disabled />)
    const confirm = within(dialog).getByRole('button', { name: 'Reset' })
    expect(confirm).toBeDisabled()
    fireEvent.click(confirm)
    expect(onReset).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('lets users return to the page and dismiss without resetting', async () => {
    const onReset = vi.fn()
    render(<>
      <ResetButton locale="en" label="Reset Mute" description={RESET_SCOPE_COPY.en.binding} onClick={onReset} />
      <button type="button">Other setting</button>
    </>, { wrapper: TooltipProvider })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Mute' }))
    await screen.findByRole('dialog', { name: 'Reset Mute' })
    const outside = screen.getByRole('button', { name: 'Other setting' })
    act(() => outside.focus())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(outside).toHaveFocus()
    expect(onReset).not.toHaveBeenCalled()
  })
})
