import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { DEFAULT_SETTINGS } from '@/shared/shortcuts'
import { saveSettings } from '@/shared/storage'

describe('OptionsApp', () => {
  it('renders the extension name and speed step input defaults', async () => {
    render(<OptionsApp />)

    expect(await screen.findByText('Shortcut Override for Netflix')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubRepository
    )
    expect(screen.getByRole('combobox', { name: 'Other projects' })).toBeInTheDocument()
    expect(screen.getByText('General settings')).toBeInTheDocument()
    const localeCombobox = screen.getByRole('combobox', { name: 'Language' })
    const enabledSwitch = screen.getByRole('switch', { name: 'Enable shortcut override' })
    const hintsSwitch = screen.getByRole('switch', { name: 'Show media hints' })
    expect(localeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(enabledSwitch.compareDocumentPosition(hintsSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(screen.getByRole('button', { name: 'Enable shortcut override info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show media hints info' })).toBeInTheDocument()
    expect(screen.queryByText('Intercept configured playback shortcuts on Netflix watch pages.')).not.toBeInTheDocument()
    expect(screen.queryByText('Display a compact overlay after shortcut actions.')).not.toBeInTheDocument()
    expect(screen.queryByText('Record keys, disable individual actions, or reset defaults.')).not.toBeInTheDocument()
    expect(screen.queryByText('Set the range and step size for speed up/down shortcuts.')).not.toBeInTheDocument()
    expect(screen.queryByText('Set how far the rewind and forward shortcuts move playback.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset speed settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset seek settings' })).toBeInTheDocument()
    const stepInput = screen.getByLabelText('Each change')
    const holdInput = screen.getByLabelText('Space hold speed')
    const seekInput = screen.getByLabelText('Left / Right seconds')
    expect(stepInput).toHaveAttribute('type', 'number')
    expect(stepInput).toHaveAttribute('step', '0.05')
    expect(stepInput).toHaveValue(0.25)
    expect(holdInput).toHaveAttribute('min', '0.25')
    expect(holdInput).toHaveAttribute('step', '0.05')
    expect(holdInput).toHaveValue(2)
    expect(seekInput).toHaveAttribute('min', '1')
    expect(seekInput).toHaveAttribute('max', '60')
    expect(seekInput).toHaveValue(10)
  })

  it('persists step changes using 0.05 increments', async () => {
    render(<OptionsApp />)

    const stepInput = await screen.findByLabelText('Each change')
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)

    await waitFor(() => expect(stepInput).toHaveValue(0.35))
  })

  it('persists long-press Space speed changes', async () => {
    render(<OptionsApp />)

    const holdInput = await screen.findByLabelText('Space hold speed')
    fireEvent.change(holdInput, { target: { value: '0.5' } })
    fireEvent.blur(holdInput)

    await waitFor(() => expect(holdInput).toHaveValue(0.5))
  })

  it('persists Left / Right seek second changes', async () => {
    render(<OptionsApp />)

    const seekInput = await screen.findByLabelText('Left / Right seconds')
    fireEvent.change(seekInput, { target: { value: '15' } })
    fireEvent.blur(seekInput)

    await waitFor(() => expect(seekInput).toHaveValue(15))
  })

  it('persists language changes from the combobox', async () => {
    render(<OptionsApp />)

    const localeCombobox = await screen.findByRole('combobox', { name: 'Language' })
    fireEvent.click(localeCombobox)
    fireEvent.click(await screen.findByText('繁中'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    })
  })

  it('syncs external settings changes while open', async () => {
    render(<OptionsApp />)

    expect(await screen.findByRole('combobox', { name: 'Language' })).toHaveTextContent('EN')

    await saveSettings({
      ...DEFAULT_SETTINGS,
      enabled: false,
      locale: 'zh-TW',
      speed: {
        ...DEFAULT_SETTINGS.speed,
        step: 0.5,
      },
      seek: {
        seconds: 20,
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
      expect(screen.getByRole('switch', { name: '啟用快捷鍵覆寫' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
      expect(screen.getByLabelText('每次增減')).toHaveValue(0.5)
      expect(screen.getByLabelText('左右鍵秒數')).toHaveValue(20)
    })
  })

  it('allows speed number inputs to be cleared before entering a new value', async () => {
    render(<OptionsApp />)

    const maxInput = await screen.findByLabelText('Highest speed')

    fireEvent.change(maxInput, { target: { value: '' } })
    expect(maxInput).toHaveValue(null)

    fireEvent.change(maxInput, { target: { value: '4' } })
    expect(maxInput).toHaveValue(4)

    fireEvent.blur(maxInput)

    await waitFor(() => expect(maxInput).toHaveValue(4))
  })

  it('restores the saved speed value when an empty number input loses focus', async () => {
    render(<OptionsApp />)

    const maxInput = await screen.findByLabelText('Highest speed')

    fireEvent.change(maxInput, { target: { value: '' } })
    expect(maxInput).toHaveValue(null)

    fireEvent.blur(maxInput)

    await waitFor(() => expect(maxInput).toHaveValue(3))
  })

  it('resets all shortcut bindings without resetting global or speed settings', async () => {
    render(<OptionsApp />)

    const globalSwitch = await screen.findByRole('switch', {
      name: 'Enable shortcut override',
    })
    const playPauseSwitch = screen.getByRole('switch', {
      name: 'Play / Pause Enabled',
    })
    const stepInput = screen.getByLabelText('Each change')
    const holdInput = screen.getByLabelText('Space hold speed')
    const seekInput = screen.getByLabelText('Left / Right seconds')

    fireEvent.click(globalSwitch)
    fireEvent.click(playPauseSwitch)
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)
    fireEvent.change(holdInput, { target: { value: '2.5' } })
    fireEvent.blur(holdInput)
    fireEvent.change(seekInput, { target: { value: '15' } })
    fireEvent.blur(seekInput)

    await waitFor(() => {
      expect(globalSwitch).toHaveAttribute('aria-checked', 'false')
      expect(playPauseSwitch).toHaveAttribute('aria-checked', 'false')
      expect(stepInput).toHaveValue(0.35)
      expect(holdInput).toHaveValue(2.5)
      expect(seekInput).toHaveValue(15)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset all shortcuts' }))

    await waitFor(() => {
      expect(playPauseSwitch).toHaveAttribute('aria-checked', 'true')
      expect(globalSwitch).toHaveAttribute('aria-checked', 'false')
      expect(stepInput).toHaveValue(0.35)
      expect(holdInput).toHaveValue(2.5)
      expect(seekInput).toHaveValue(15)
    })
  })

  it('resets speed and seek settings independently', async () => {
    render(<OptionsApp />)

    const minInput = await screen.findByLabelText('Lowest speed')
    const maxInput = screen.getByLabelText('Highest speed')
    const stepInput = screen.getByLabelText('Each change')
    const holdInput = screen.getByLabelText('Space hold speed')
    const seekInput = screen.getByLabelText('Left / Right seconds')

    fireEvent.change(minInput, { target: { value: '0.5' } })
    fireEvent.blur(minInput)
    fireEvent.change(maxInput, { target: { value: '4' } })
    fireEvent.blur(maxInput)
    fireEvent.change(stepInput, { target: { value: '0.5' } })
    fireEvent.blur(stepInput)
    fireEvent.change(holdInput, { target: { value: '3' } })
    fireEvent.blur(holdInput)
    fireEvent.change(seekInput, { target: { value: '20' } })
    fireEvent.blur(seekInput)

    await waitFor(() => {
      expect(minInput).toHaveValue(0.5)
      expect(maxInput).toHaveValue(4)
      expect(stepInput).toHaveValue(0.5)
      expect(holdInput).toHaveValue(3)
      expect(seekInput).toHaveValue(20)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset speed settings' }))

    await waitFor(() => {
      expect(minInput).toHaveValue(0.25)
      expect(maxInput).toHaveValue(3)
      expect(stepInput).toHaveValue(0.25)
      expect(holdInput).toHaveValue(2)
      expect(seekInput).toHaveValue(20)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset seek settings' }))

    await waitFor(() => {
      expect(seekInput).toHaveValue(10)
    })
  })
})
