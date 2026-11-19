import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsTransferCard } from '@/options/settings-transfer-card'
import { getCopy } from '@/shared/i18n'
import {
  createSettingsBackup,
  parseSettingsBackup,
  serializeSettingsBackup,
} from '@/shared/settings-backup'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { LOCALES } from '@/shared/shortcut-types'
import { SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'

const customSubtitleSettings = () => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.enabled = false
  settings.subtitleNavigation.enabled = true
  settings.subtitleNavigation.bindings.next.key = {
    code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: true, meta: false,
  }
  settings.subtitleNavigation.bindings.playback.enabled = false
  settings.bindings.mute.enabled = false
  return settings
}

const copy = getCopy('en')
const backup = createSettingsBackup(
  {
    ...DEFAULT_SETTINGS,
    enabled: false,
    locale: 'zh-TW',
    theme: 'dark',
    speed: { min: 0.5, max: 4, step: 0.5, preferred: 2.5 },
    holdSpeed: { enabled: true, speed: 3, showHint: false },
    seek: { seconds: 20 },
  },
  {
    extensionVersion: '0.5.1',
    exportedAt: new Date('2026-08-12T03:04:05.000Z'),
  }
)

const selectFile = (source: string, name = 'settings.json') => {
  const input = screen.getByLabelText('Import settings')
  fireEvent.change(input, {
    target: { files: [new File([source], name, { type: 'application/json' })] },
  })
  return input
}

describe('SettingsTransferCard', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it.each(LOCALES)('confirms restoring defaults and allows cancellation in %s', async locale => {
    const localizedCopy = getCopy(locale)
    const onReplaceSettings = vi.fn().mockResolvedValue(DEFAULT_SETTINGS)
    render(<SettingsTransferCard copy={localizedCopy} locale={locale} settings={backup.settings} onReplaceSettings={onReplaceSettings} />)
    const reset = screen.getByRole('button', { name: localizedCopy.resetDefaults })
    fireEvent.click(reset)
    let dialog = await screen.findByRole('dialog', { name: localizedCopy.resetDefaultsDialogTitle })
    expect(dialog).toHaveTextContent(localizedCopy.resetDefaultsDialogDesc)
    expect(within(dialog).getByRole('button', { name: localizedCopy.cancel })).toHaveFocus()
    expect(onReplaceSettings).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: localizedCopy.cancel }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(reset).toHaveFocus()
    expect(onReplaceSettings).not.toHaveBeenCalled()

    fireEvent.click(reset)
    dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: localizedCopy.resetDefaults }))
    expect(onReplaceSettings).toHaveBeenCalledExactlyOnceWith(DEFAULT_SETTINGS)
    expect(await screen.findByText(localizedCopy.resetDefaultsSuccess)).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent(localizedCopy.resetDefaultsSuccess)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps a pending reset open and shows a temporary success toast after a successful retry', async () => {
    let rejectReset!: (error: Error) => void
    const onReplaceSettings = vi.fn()
      .mockImplementationOnce(() => new Promise((_, reject) => { rejectReset = reject }))
      .mockResolvedValue(DEFAULT_SETTINGS)
    render(<SettingsTransferCard copy={copy} locale="en" settings={backup.settings} onReplaceSettings={onReplaceSettings} />)
    fireEvent.click(screen.getByRole('button', { name: copy.resetDefaults }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: copy.resetDefaults }))
    expect(within(dialog).getByRole('button', { name: copy.resettingDefaults })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: copy.cancel })).toBeDisabled()
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(dialog).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: copy.resettingDefaults }))
    expect(onReplaceSettings).toHaveBeenCalledOnce()

    rejectReset(new Error('Storage unavailable.'))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Storage unavailable.')
    expect(screen.queryByText(copy.resetDefaultsSuccess)).not.toBeInTheDocument()

    vi.useFakeTimers()
    await act(async () => fireEvent.click(within(dialog).getByRole('button', { name: copy.resetDefaults })))
    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent(copy.resetDefaultsSuccess)
    expect(onReplaceSettings).toHaveBeenCalledTimes(2)
    await act(() => vi.advanceTimersByTimeAsync(4999))
    expect(toast).toHaveTextContent(copy.resetDefaultsSuccess)
    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(toast).toBeEmptyDOMElement()
  })

  it('exposes only the visible import button as an accessible control', () => {
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onReplaceSettings={vi.fn()}
      />
    )

    expect(screen.getAllByRole('button', { name: 'Import settings' })).toHaveLength(1)
    const fileInput = screen.getByLabelText('Import settings')
    expect(fileInput).not.toBeVisible()
  })

  it('downloads the complete settings backup with a dated filename', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-12T03:04:05.000Z'))
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:settings')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const settings = customSubtitleSettings()

    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={settings}
        onReplaceSettings={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export settings' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    const source = await blob.text()
    expect(JSON.parse(source)).toMatchObject({
      format: 'netflix-shortcut-override-settings',
      formatVersion: 1,
      exportedAt: '2026-08-12T03:04:05.000Z',
      extensionVersion: '0.4.1',
      settings: { enabled: false, subtitleNavigation: settings.subtitleNavigation },
    })
    expect(parseSettingsBackup(source)).toMatchObject({ ok: true, value: { settings } })
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:settings')
  })

  it.each(LOCALES)('previews configured subtitle keys and separate counts in %s', async locale => {
    const localizedCopy = getCopy(locale)
    const subtitleCopy = SUBTITLE_NAVIGATION_COPY[locale]
    const settings = customSubtitleSettings()
    const onReplaceSettings = vi.fn().mockResolvedValue(settings)
    render(<SettingsTransferCard copy={localizedCopy} locale={locale} settings={DEFAULT_SETTINGS} onReplaceSettings={onReplaceSettings} />)
    fireEvent.change(screen.getByLabelText(localizedCopy.importSettings), {
      target: { files: [new File([serializeSettingsBackup(createSettingsBackup(settings, { extensionVersion: 'test' }))], 'settings.json')] },
    })
    const dialog = await screen.findByRole('dialog')
    const generalSummary = within(dialog).getByText(localizedCopy.backupEnabledShortcuts).nextElementSibling
    const subtitleSummary = within(dialog).getByText(subtitleCopy.title).nextElementSibling as HTMLElement
    expect(generalSummary).toHaveTextContent('22 / 23')
    expect(subtitleSummary).toHaveTextContent(localizedCopy.backupEnabled)
    expect(subtitleSummary).toHaveTextContent('2 / 4')
    expect(within(subtitleSummary).getAllByRole('listitem')).toHaveLength(4)
    const nextRow = within(subtitleSummary).getByText(subtitleCopy.next).closest('li') as HTMLElement
    expect(nextRow).toHaveTextContent(/Ctrl.*Shift.*N/)
    expect(nextRow).toHaveTextContent(localizedCopy.backupEnabled)
    const playbackRow = within(subtitleSummary).getByText(subtitleCopy.playback).closest('li')
    expect(playbackRow).toHaveTextContent(localizedCopy.backupDisabled)
    expect(onReplaceSettings).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: localizedCopy.confirmImport }))
    await waitFor(() => expect(onReplaceSettings).toHaveBeenCalledWith(settings))
  })

  it('shows a disabled subtitle master without hiding retained keys or row counts', async () => {
    const settings = customSubtitleSettings()
    settings.subtitleNavigation.enabled = false
    const onReplaceSettings = vi.fn()
    render(<SettingsTransferCard copy={copy} locale="en" settings={DEFAULT_SETTINGS} onReplaceSettings={onReplaceSettings} />)
    selectFile(serializeSettingsBackup(createSettingsBackup(settings, { extensionVersion: 'test' })))
    const dialog = await screen.findByRole('dialog')
    const summary = within(dialog).getByText('Subtitle navigation').nextElementSibling as HTMLElement
    expect(summary).toHaveTextContent('Disabled · enabled keys: 2 / 4')
    expect(within(summary).getAllByRole('listitem')).toHaveLength(4)
    expect(summary).toHaveTextContent(/Ctrl.*Shift.*N/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onReplaceSettings).not.toHaveBeenCalled()
  })

  it('previews a backup and cancels without importing', async () => {
    const onReplaceSettings = vi.fn()
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onReplaceSettings={onReplaceSettings}
      />
    )

    const input = selectFile(serializeSettingsBackup(backup))
    const dialog = await screen.findByRole('dialog')
    expect(input).toHaveValue('')
    expect(dialog).toHaveTextContent('Aug 12, 2026')
    expect(dialog).toHaveTextContent('0.5.1')
    expect(dialog).toHaveTextContent('繁體中文 · Dark')
    expect(dialog).toHaveTextContent('Preferred 2.5x · range 0.5x–4x · step 0.5x')
    expect(dialog).toHaveTextContent('20 seconds per seek')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onReplaceSettings).not.toHaveBeenCalled()
  })

  it('reserves the settings transfer while reading and previewing a backup', async () => {
    const onReplaceSettings = vi.fn()
    render(<SettingsTransferCard copy={copy} locale="en" settings={DEFAULT_SETTINGS} onReplaceSettings={onReplaceSettings} />)
    const file = new File([], 'settings.json')
    let finishRead!: (source: string) => void
    vi.spyOn(file, 'text').mockReturnValue(new Promise(resolve => { finishRead = resolve }))
    const reset = screen.getByRole('button', { name: copy.resetDefaults })
    const input = screen.getByLabelText(copy.importSettings)

    fireEvent.change(input, { target: { files: [file] } })
    expect(reset).toBeDisabled()
    fireEvent.click(reset)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await act(async () => finishRead(serializeSettingsBackup(backup)))
    const dialog = screen.getByRole('dialog', { name: copy.importDialogTitle })
    expect(reset).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: copy.cancel }))
    expect(reset).toBeEnabled()
    fireEvent.click(reset)
    expect(screen.getByRole('dialog', { name: copy.resetDefaultsDialogTitle })).toBeVisible()
    expect(input).toBeDisabled()
    expect(onReplaceSettings).not.toHaveBeenCalled()
  })

  it('imports after confirmation and reports success', async () => {
    const onReplaceSettings = vi.fn().mockResolvedValue(backup.settings)
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onReplaceSettings={onReplaceSettings}
      />
    )

    selectFile(serializeSettingsBackup(backup))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace settings' }))

    await waitFor(() => expect(onReplaceSettings).toHaveBeenCalledWith(backup.settings))
    expect(await screen.findByText('Settings imported successfully.')).toHaveAttribute('role', 'status')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the confirmation open when persistence fails', async () => {
    const onReplaceSettings = vi.fn().mockRejectedValue(new Error('Storage unavailable.'))
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onReplaceSettings={onReplaceSettings}
      />
    )

    selectFile(serializeSettingsBackup(backup))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace settings' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Settings could not be imported: Storage unavailable.'
    )
    expect(dialog).toBeInTheDocument()
  })

  it('shows parse errors and allows the same file to be selected again', async () => {
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onReplaceSettings={vi.fn()}
      />
    )

    const input = selectFile('{', 'broken.json')
    expect(await screen.findByRole('alert')).toHaveTextContent('This file is not valid JSON.')
    expect(input).toHaveValue('')

    fireEvent.change(input, {
      target: {
        files: [new File([serializeSettingsBackup(backup)], 'broken.json')],
      },
    })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })
})
