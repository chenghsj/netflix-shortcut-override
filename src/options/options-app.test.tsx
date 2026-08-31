import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { createSettingsBackup, serializeSettingsBackup } from '@/shared/settings-backup'
import { getSettings, saveSettings } from '@/shared/storage'

describe('OptionsApp', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the extension name and speed step input defaults', async () => {
    render(<OptionsApp />)

    expect(await screen.findByText('Shortcut Override for Netflix')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubRepository
    )
    expect(
      screen.getByRole('link', { name: 'Rate this extension in the extension store' })
    ).toHaveAttribute('href', EXTERNAL_LINKS.shortcutOverrideChromeWebStore)
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    expect(screen.getByText('General settings')).toBeInTheDocument()
    const localeCombobox = screen.getByRole('combobox', { name: 'Language' })
    const themeCombobox = screen.getByRole('combobox', { name: 'Theme' })
    const enabledSwitch = screen.getByRole('switch', { name: 'Enable shortcut override' })
    expect(localeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(themeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(themeCombobox).toHaveTextContent('Auto')
    const enabledInfo = screen.getByRole('button', { name: 'Enable shortcut override info' })
    expect(enabledInfo).toBeInTheDocument()
    fireEvent.focus(enabledInfo)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'When off, all extension shortcuts are disabled.'
    )
    const pictureInPictureInfo = screen.getByRole('button', { name: 'Picture-in-Picture info' })
    expect(pictureInPictureInfo).toBeInTheDocument()
    fireEvent.focus(pictureInPictureInfo)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Picture-in-Picture is a separate window, so Netflix native shortcuts cannot run there. Only extension shortcuts enabled on this page can be used in Picture-in-Picture.'
    )
    expect(
      screen.queryByText('When disabled, every key is handled by Netflix, including Space-hold speed.')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Record keys, disable individual actions, or reset defaults.')).not.toBeInTheDocument()
    expect(screen.queryByText('Set the range and step size for speed up/down shortcuts.')).not.toBeInTheDocument()
    expect(screen.queryByText('Set how far the rewind and forward shortcuts move playback.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset speed settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset seek settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset Play / Pause hold speed' })).toBeInTheDocument()
    const subtitleRow = screen.getByText('Toggle subtitles').closest('tr')
    expect(subtitleRow).not.toBeNull()
    expect(within(subtitleRow as HTMLElement).getByText('C')).toBeInTheDocument()
    const stepInput = screen.getByLabelText('Speed adjustment amount')
    const preferredInput = screen.getByLabelText('Preferred speed')
    const holdInput = screen.getByLabelText('Hold speed')
    const seekInput = screen.getByLabelText('Seconds per seek')
    expect(stepInput).toHaveAttribute('type', 'number')
    expect(stepInput).toHaveAttribute('step', '0.05')
    expect(stepInput).toHaveValue(0.25)
    expect(preferredInput).toHaveValue(1.5)
    expect(holdInput).toHaveAttribute('min', '0.25')
    expect(holdInput).toHaveAttribute('step', '0.05')
    expect(holdInput).toHaveValue(2)
    const holdSpeedInfo = screen.getByRole('button', { name: 'Hold speed info' })
    fireEvent.focus(holdSpeedInfo)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Hold the configured Play / Pause shortcut to temporarily use this speed. Release it to restore the previous speed and playback state. Range 0.25x-4.0x.'
    )
    expect(screen.getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(
      screen.getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Enabled info' })).not.toBeInTheDocument()
    expect(seekInput).toHaveAttribute('min', '1')
    expect(seekInput).toHaveAttribute('max', '60')
    expect(seekInput).toHaveValue(10)
    const speedCard = screen.getByText('Playback speed').closest('[data-slot="card"]')
    expect(speedCard).not.toBeNull()
    expect(within(speedCard as HTMLElement).queryByLabelText('Seconds per seek')).not.toBeInTheDocument()
    const seekCard = screen.getByText('Seek shortcuts').closest('[data-slot="card"]')
    expect(seekCard).not.toBeNull()
    expect(within(seekCard as HTMLElement).getByLabelText('Seconds per seek')).toBe(
      seekInput
    )
    const holdSpeedCard = screen
      .getByText('Play / Pause hold speed')
      .closest('[data-slot="card"]')
    const backupCard = screen.getByText('Backup and restore').closest('[data-slot="card"]')
    expect(holdSpeedCard).not.toBeNull()
    expect(backupCard).not.toBeNull()
    expect(backupCard?.parentElement).toBe(holdSpeedCard?.parentElement)
    expect(holdSpeedCard?.compareDocumentPosition(backupCard as HTMLElement)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('shows which Netflix keys an enabled remapped shortcut replaces', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          ...DEFAULT_SETTINGS.bindings.playPause,
          key: { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false },
        },
        toggleSubtitles: {
          ...DEFAULT_SETTINGS.bindings.toggleSubtitles,
          key: { code: 'KeyV', key: 'v', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })
    render(<OptionsApp />)

    const playPauseRow = (await screen.findByText('Play / Pause (hold for speed)')).closest('tr')
    const subtitleRow = screen.getByText('Toggle subtitles').closest('tr')
    expect(playPauseRow).not.toBeNull()
    expect(subtitleRow).not.toBeNull()
    expect(
      within(playPauseRow as HTMLElement).getByText('Replaces Netflix: Space')
    ).toBeInTheDocument()
    expect(
      within(subtitleRow as HTMLElement).getByText('Replaces Netflix: C')
    ).toBeInTheDocument()

    fireEvent.click(
      within(playPauseRow as HTMLElement).getByRole('button', { name: /^Edit / })
    )
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Saving will disable the Netflix keys: Space'
    )
  })

  it('shows Picture-in-Picture as off and disabled on Firefox', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    render(<OptionsApp />)

    const pipSwitch = await screen.findByRole('switch', { name: 'Picture-in-Picture Enabled' })
    expect(pipSwitch).toBeDisabled()
    expect(pipSwitch).toHaveAttribute('aria-checked', 'false')

    const pictureInPictureInfo = screen.getByRole('button', { name: 'Picture-in-Picture info' })
    fireEvent.focus(pictureInPictureInfo)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Firefox does not support the subtitle-preserving Picture-in-Picture window used by this extension.'
    )
  })

  it('does not reserve the Firefox PiP key when recording another shortcut', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    render(<OptionsApp />)

    fireEvent.click((await screen.findAllByRole('button', { name: /^Edit / }))[0])
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, {
      code: 'KeyP',
      key: 'P',
      shiftKey: true,
    })

    expect(dialog).toHaveTextContent('No conflict detected.')
    expect(within(dialog).getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it('persists step changes using 0.05 increments', async () => {
    render(<OptionsApp />)

    const stepInput = await screen.findByLabelText('Speed adjustment amount')
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)

    await waitFor(() => expect(stepInput).toHaveValue(0.35))
  })

  it('persists numeric changes when dragging an input label', async () => {
    render(<OptionsApp />)

    const label = await screen.findByText('Speed adjustment amount')
    const stepInput = screen.getByLabelText('Speed adjustment amount')
    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 108, pointerId: 1 })
    fireEvent.pointerUp(label, { clientX: 108, pointerId: 1 })

    await waitFor(async () => {
      expect(stepInput).toHaveValue(0.3)
      expect((await getSettings()).speed.step).toBe(0.3)
    })
  })

  it('persists preferred speed independently from the step range', async () => {
    render(<OptionsApp />)

    const preferredInput = await screen.findByLabelText('Preferred speed')
    fireEvent.change(preferredInput, { target: { value: '3.35' } })
    fireEvent.blur(preferredInput)

    await waitFor(() => expect(preferredInput).toHaveValue(3.35))
  })

  it('restores and clamps preferred-speed input values', async () => {
    render(<OptionsApp />)

    const preferredInput = await screen.findByLabelText('Preferred speed')
    fireEvent.change(preferredInput, { target: { value: '' } })
    fireEvent.blur(preferredInput)
    await waitFor(() => expect(preferredInput).toHaveValue(1.5))

    fireEvent.change(preferredInput, { target: { value: '8' } })
    fireEvent.blur(preferredInput)
    await waitFor(() => expect(preferredInput).toHaveValue(4))

    fireEvent.change(preferredInput, { target: { value: '0.1' } })
    fireEvent.blur(preferredInput)
    await waitFor(() => expect(preferredInput).toHaveValue(0.25))
  })

  it('persists long-press play/pause speed changes', async () => {
    render(<OptionsApp />)

    const holdInput = await screen.findByLabelText('Hold speed')
    fireEvent.change(holdInput, { target: { value: '0.5' } })
    fireEvent.blur(holdInput)

    await waitFor(() => expect(holdInput).toHaveValue(0.5))
  })

  it('persists seek interval changes', async () => {
    render(<OptionsApp />)

    const seekInput = await screen.findByLabelText('Seconds per seek')
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

  it('persists the hold-speed hint setting', async () => {
    render(<OptionsApp />)

    const hintSwitch = await screen.findByRole('switch', {
      name: 'Play / Pause hold speed: Show speed hint',
    })
    fireEvent.click(hintSwitch)

    await waitFor(() => expect(hintSwitch).toHaveAttribute('aria-checked', 'false'))
  })

  it('persists theme changes from the combobox', async () => {
    render(<OptionsApp />)

    const themeCombobox = await screen.findByRole('combobox', { name: 'Theme' })
    fireEvent.click(themeCombobox)
    fireEvent.click(await screen.findByText('Dark'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
      expect(document.documentElement).toHaveClass('dark')
    })
  })

  it('uses the detected browser language when no settings exist yet', async () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('zh-TW')
    render(<OptionsApp />)

    expect(await screen.findByRole('combobox', { name: '語言' })).toHaveTextContent('自動')
  })

  it('syncs external settings changes while open', async () => {
    render(<OptionsApp />)

    expect(await screen.findByRole('combobox', { name: 'Language' })).toHaveTextContent('Auto')

    await act(async () => {
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
    })

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
      expect(screen.getByRole('switch', { name: '啟用快捷鍵覆寫' })).toHaveAttribute(
        'aria-checked',
        'false'
      )
      expect(screen.getByLabelText('倍速調整幅度')).toHaveValue(0.5)
      expect(screen.getByLabelText('每次跳轉秒數')).toHaveValue(20)
    })
  })

  it('imports a complete backup and synchronizes all form drafts', async () => {
    render(<OptionsApp />)
    const importedSettings = {
      ...DEFAULT_SETTINGS,
      enabled: false,
      locale: 'zh-TW' as const,
      theme: 'dark' as const,
      speed: {
        min: 0.5,
        max: 4,
        step: 0.5,
        preferred: 2.5,
      },
      holdSpeed: { enabled: true, speed: 3, showHint: false },
      seek: { seconds: 20 },
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        mute: { ...DEFAULT_SETTINGS.bindings.mute, enabled: false },
      },
    }
    const backup = createSettingsBackup(importedSettings, {
      extensionVersion: '0.5.1',
      exportedAt: new Date('2026-08-12T03:04:05.000Z'),
    })
    const input = await screen.findByLabelText('Import settings')

    fireEvent.change(input, {
      target: {
        files: [new File([serializeSettingsBackup(backup)], 'settings.json')],
      },
    })
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace settings' }))

    expect(await screen.findByRole('status')).toHaveTextContent('設定已成功匯入。')
    expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    expect(screen.getByRole('combobox', { name: '主題' })).toHaveTextContent('深色')
    expect(screen.getByRole('switch', { name: '啟用快捷鍵覆寫' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    expect(screen.getByLabelText('常用倍速')).toHaveValue(2.5)
    expect(screen.getByLabelText('倍速調整幅度')).toHaveValue(0.5)
    expect(screen.getByLabelText('每次跳轉秒數')).toHaveValue(20)
    expect(screen.getByLabelText('長按倍速')).toHaveValue(3)
    expect(screen.getByRole('switch', { name: '靜音 啟用' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
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
      name: 'Play / Pause (hold for speed) Enabled',
    })
    const holdSpeedEnabledLabel = screen.getByText('Enabled', {
      selector: 'label[for="enable-hold-speed"]',
    })
    const holdSpeedHintLabel = screen.getByText('Show speed hint', {
      selector: 'label[for="show-hold-speed-hint"]',
    })
    const stepInput = screen.getByLabelText('Speed adjustment amount')
    const holdInput = screen.getByLabelText('Hold speed')
    const seekInput = screen.getByLabelText('Seconds per seek')

    fireEvent.click(globalSwitch)
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)
    fireEvent.change(holdInput, { target: { value: '2.5' } })
    fireEvent.blur(holdInput)
    fireEvent.change(seekInput, { target: { value: '15' } })
    fireEvent.blur(seekInput)
    fireEvent.click(playPauseSwitch)

    await waitFor(() => {
      expect(globalSwitch).toHaveAttribute('aria-checked', 'false')
      expect(playPauseSwitch).toHaveAttribute('aria-checked', 'false')
      expect(holdInput).toBeDisabled()
      expect(holdSpeedEnabledLabel).toHaveAttribute('aria-disabled', 'true')
      expect(holdSpeedHintLabel).toHaveAttribute('aria-disabled', 'true')
      expect(stepInput).toHaveValue(0.35)
      expect(holdInput).toHaveValue(2.5)
      expect(seekInput).toHaveValue(15)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset all shortcuts' }))

    await waitFor(() => {
      expect(playPauseSwitch).toHaveAttribute('aria-checked', 'true')
      expect(holdInput).not.toBeDisabled()
      expect(holdSpeedEnabledLabel).toHaveAttribute('aria-disabled', 'false')
      expect(holdSpeedHintLabel).toHaveAttribute('aria-disabled', 'false')
      expect(globalSwitch).toHaveAttribute('aria-checked', 'false')
      expect(stepInput).toHaveValue(0.35)
      expect(holdInput).toHaveValue(2.5)
      expect(seekInput).toHaveValue(15)
    })
  })

  it('resets speed, seek, and hold-speed settings independently', async () => {
    render(<OptionsApp />)

    const minInput = await screen.findByLabelText('Lowest speed')
    const maxInput = screen.getByLabelText('Highest speed')
    const stepInput = screen.getByLabelText('Speed adjustment amount')
    const preferredInput = screen.getByLabelText('Preferred speed')
    const holdInput = screen.getByLabelText('Hold speed')
    const seekInput = screen.getByLabelText('Seconds per seek')

    fireEvent.change(minInput, { target: { value: '0.5' } })
    fireEvent.blur(minInput)
    fireEvent.change(maxInput, { target: { value: '4' } })
    fireEvent.blur(maxInput)
    fireEvent.change(stepInput, { target: { value: '0.5' } })
    fireEvent.blur(stepInput)
    fireEvent.change(preferredInput, { target: { value: '2.5' } })
    fireEvent.blur(preferredInput)
    fireEvent.change(holdInput, { target: { value: '3' } })
    fireEvent.blur(holdInput)
    fireEvent.change(seekInput, { target: { value: '20' } })
    fireEvent.blur(seekInput)

    await waitFor(() => {
      expect(minInput).toHaveValue(0.5)
      expect(maxInput).toHaveValue(4)
      expect(stepInput).toHaveValue(0.5)
      expect(preferredInput).toHaveValue(2.5)
      expect(holdInput).toHaveValue(3)
      expect(seekInput).toHaveValue(20)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset speed settings' }))

    await waitFor(() => {
      expect(minInput).toHaveValue(0.25)
      expect(maxInput).toHaveValue(3)
      expect(stepInput).toHaveValue(0.25)
      expect(preferredInput).toHaveValue(1.5)
      expect(holdInput).toHaveValue(3)
      expect(seekInput).toHaveValue(20)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset seek settings' }))

    await waitFor(() => {
      expect(seekInput).toHaveValue(10)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reset Play / Pause hold speed' }))

    await waitFor(() => {
      expect(holdInput).toHaveValue(2)
    })

  })

  it('restores the recorder draft to the saved shortcut before saving', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          enabled: true,
          key: { code: 'KeyP', key: 'p', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })

    render(<OptionsApp />)

    expect(await screen.findByTitle('P')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /^Edit / })[0])

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByTitle('P')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { code: 'KeyQ', key: 'q' })

    expect(within(dialog).getByTitle('Q')).toBeInTheDocument()

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Restore Play / Pause (hold for speed)',
      })
    )

    expect(within(dialog).getByTitle('P')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByTitle('P')).toBeInTheDocument()
    })
  })
})
