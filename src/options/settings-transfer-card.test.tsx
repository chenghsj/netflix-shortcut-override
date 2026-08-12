import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettingsTransferCard } from '@/options/settings-transfer-card'
import { getCopy } from '@/shared/i18n'
import {
  createSettingsBackup,
  serializeSettingsBackup,
} from '@/shared/settings-backup'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'

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

    render(
      <SettingsTransferCard
        copy={copy}
        locale="en"
        settings={{ ...DEFAULT_SETTINGS, enabled: false }}
        onImport={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Export settings' }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(JSON.parse(await blob.text())).toMatchObject({
      format: 'netflix-shortcut-override-settings',
      formatVersion: 1,
      exportedAt: '2026-08-12T03:04:05.000Z',
      extensionVersion: '0.4.1',
      settings: { enabled: false },
    })
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:settings')
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
