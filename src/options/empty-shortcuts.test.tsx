import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { OptionsApp } from './options-app'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'

describe('optional shortcut keys', () => {
  it.each([
    ['Playback', 'Play / Pause', 'playPause'],
    ['Playback speed', 'Set preferred speed', 'setPreferredSpeed'],
    ['Subtitles', 'Cycle subtitle size', 'cycleSubtitleSize'],
    ['Subtitles', 'Previous subtitle', 'previous'],
  ] as const)('clears, saves and reopens a key in %s', async (category, label, action) => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: category }))
    if (action === 'previous') {
      fireEvent.click(screen.getByRole('switch', { name: 'Enable subtitle navigation shortcuts' }))
      await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
    }
    const edit = screen.getByRole('button', { name: `Edit ${label}` })
    fireEvent.click(edit)
    let dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut' }))
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const settings = await getSettings()
    const binding = action === 'previous' ? settings.subtitleNavigation.bindings.previous : settings.bindings[action]
    expect(binding).toEqual({ enabled: true, key: null })
    expect(edit.closest('tr')).toHaveTextContent('Not set')
    fireEvent.click(edit)
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: 'Clear shortcut' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('keeps clearing local until saved and can restore the saved key', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Play / Pause' }))
    let dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut' }))
    expect((await getSettings()).bindings.playPause.key).toEqual(DEFAULT_SETTINGS.bindings.playPause.key)
    const restore = within(dialog).getByRole('button', { name: 'Undo edits' })
    expect(restore).toBeEnabled()
    fireEvent.click(restore)
    expect(within(dialog).getByTitle('Space')).toBeVisible()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Edit Play / Pause' }))
    dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByTitle('Space')).toBeVisible()
  })

  it('saves either or both directions of a seek pair without a key', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Seeking and navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Forward / Rewind 10 seconds' }))
    let dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut: Rewind' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.seekBackward.key).toBeNull()
    expect((await getSettings()).bindings.seekForward.key).toEqual(DEFAULT_SETTINGS.bindings.seekForward.key)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Forward / Rewind 10 seconds' }))
    dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut: Forward' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.seekForward.key).toBeNull()
    fireEvent.click(screen.getByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await getSettings()).bindings.seekBackward).toEqual({ enabled: true, key: null })
  })

  it('creates a percentage shortcut without a key and can assign one later', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Seeking and navigation' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add percentage shortcut' }))
    let dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const settings = await getSettings()
    const id = settings.seekShortcuts[0].id
    expect(settings.bindings[id]).toEqual({ enabled: true, key: null })
    fireEvent.click(screen.getByRole('button', { name: 'Edit 50%' }))
    dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Key' }), { code: 'Digit5', key: '5' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings[id].key).toMatchObject({ code: 'Digit5' })
  })

  it('keeps custom subtitle size shortcuts when their keys are cleared', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
    settings.bindings['subtitle-size:custom'] = { enabled: false, key: settings.bindings.mute.key }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(screen.getByRole('button', { name: /Edit.*150%/ }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear shortcut' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).subtitleSizeShortcuts).toEqual(settings.subtitleSizeShortcuts)
    expect((await getSettings()).bindings['subtitle-size:custom']).toEqual({ enabled: false, key: null })
  })
})
