import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
import { SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'

const customSubtitleSettings = () => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.enabled = false
  settings.subtitlePractice.enabled = true
  settings.subtitlePractice.bindings.next.key = {
    code: 'KeyN', key: 'n', ctrl: true, alt: false, shift: true, meta: false,
  }
  settings.subtitlePractice.bindings.playback.enabled = false
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

  it('exposes only the visible import button as an accessible control', () => {
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onImport={vi.fn()}
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
        onImport={vi.fn()}
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
      settings: { enabled: false, subtitlePractice: settings.subtitlePractice },
    })
    expect(parseSettingsBackup(source)).toMatchObject({ ok: true, value: { settings } })
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:settings')
  })

  it.each(LOCALES)('previews configured subtitle keys and separate counts in %s', async locale => {
    const localizedCopy = getCopy(locale)
    const subtitleCopy = SUBTITLE_PRACTICE_COPY[locale]
    const settings = customSubtitleSettings()
    const onImport = vi.fn().mockResolvedValue(settings)
    render(<SettingsTransferCard copy={localizedCopy} locale={locale} settings={DEFAULT_SETTINGS} onImport={onImport} />)
    fireEvent.change(screen.getByLabelText(localizedCopy.importSettings), {
      target: { files: [new File([serializeSettingsBackup(createSettingsBackup(settings, { extensionVersion: 'test' }))], 'settings.json')] },
    })
    const dialog = await screen.findByRole('dialog')
    const generalSummary = within(dialog).getByText(localizedCopy.backupEnabledShortcuts).nextElementSibling
    const subtitleSummary = within(dialog).getByText(subtitleCopy.title).nextElementSibling as HTMLElement
    expect(generalSummary).toHaveTextContent('13 / 14')
    expect(subtitleSummary).toHaveTextContent(localizedCopy.backupEnabled)
    expect(subtitleSummary).toHaveTextContent('3 / 4')
    expect(within(subtitleSummary).getAllByRole('listitem')).toHaveLength(4)
    const nextRow = within(subtitleSummary).getByText(subtitleCopy.next).closest('li') as HTMLElement
    expect(nextRow).toHaveTextContent(/Ctrl.*Shift.*N/)
    expect(nextRow).toHaveTextContent(localizedCopy.backupEnabled)
    const playbackRow = within(subtitleSummary).getByText(subtitleCopy.playback).closest('li')
    expect(playbackRow).toHaveTextContent(localizedCopy.backupDisabled)
    expect(onImport).not.toHaveBeenCalled()
    fireEvent.click(within(dialog).getByRole('button', { name: localizedCopy.confirmImport }))
    await waitFor(() => expect(onImport).toHaveBeenCalledWith(settings))
  })

  it('shows a disabled subtitle master without hiding retained keys or row counts', async () => {
    const settings = customSubtitleSettings()
    settings.subtitlePractice.enabled = false
    const onImport = vi.fn()
    render(<SettingsTransferCard copy={copy} locale="en" settings={DEFAULT_SETTINGS} onImport={onImport} />)
    selectFile(serializeSettingsBackup(createSettingsBackup(settings, { extensionVersion: 'test' })))
    const dialog = await screen.findByRole('dialog')
    const summary = within(dialog).getByText('Subtitle navigation').nextElementSibling as HTMLElement
    expect(summary).toHaveTextContent('Disabled · enabled keys: 3 / 4')
    expect(within(summary).getAllByRole('listitem')).toHaveLength(4)
    expect(summary).toHaveTextContent(/Ctrl.*Shift.*N/)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(onImport).not.toHaveBeenCalled()
  })

  it('previews a backup and cancels without importing', async () => {
    const onImport = vi.fn()
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onImport={onImport}
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
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports after confirmation and reports success', async () => {
    const onImport = vi.fn().mockResolvedValue(backup.settings)
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onImport={onImport}
      />
    )

    selectFile(serializeSettingsBackup(backup))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Replace settings' }))

    await waitFor(() => expect(onImport).toHaveBeenCalledWith(backup.settings))
    expect(await screen.findByRole('status')).toHaveTextContent('Settings imported successfully.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the confirmation open when persistence fails', async () => {
    const onImport = vi.fn().mockRejectedValue(new Error('Storage unavailable.'))
    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={DEFAULT_SETTINGS}
        onImport={onImport}
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
        onImport={vi.fn()}
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
