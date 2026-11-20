import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { SUBTITLE_ACTIVATION_COPY } from '@/options/subtitle-activation-copy'
import { OPTIONS_SECTION_COPY } from '@/shared/options-navigation'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { LOCALES, type ShortcutSettings } from '@/shared/shortcut-types'
import { getCopy } from '@/shared/i18n'
import { SPEED_SHORTCUT_COPY } from '@/options/speed-shortcut-copy'
import { createSettingsBackup, serializeSettingsBackup } from '@/shared/settings-backup'
import { fitsSettingsStorageLimit, getSettings, saveSettings } from '@/shared/storage'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'

const recordEligibleUpgrade = () => subtitleNavigationAnnouncement.recordInstall(
  { reason: 'update', previousVersion: '0.6.2' } as chrome.runtime.InstalledDetails, '0.6.3',
)

function focusAsKeyboard(element: HTMLElement) {
  const matches = element.matches.bind(element)
  vi.spyOn(element, 'matches').mockImplementation(selector =>
    selector === ':focus-visible' ? true : matches(selector),
  )
  act(() => element.focus())
}

async function selectShortcutCategory(name: string) {
  const category = ['Subtitle language and size', 'Sentence jumps and replay'].includes(name) ? 'Subtitles'
    : ['字幕切換與大小', '逐句跳轉與重播'].includes(name) ? '字幕' : name
  fireEvent.click(await screen.findByRole('button', { name: category }))
}

async function confirmReset() {
  const dialog = await screen.findByRole('dialog', { name: /^Reset / })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Reset' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Reset / })).not.toBeInTheDocument())
}

async function setSeekInterval(value: number) {
  await selectShortcutCategory('Seeking and navigation')
  const relative = await screen.findByRole('group', { name: 'Forward / Rewind' })
  fireEvent.click(within(relative).getByRole('button', { name: /^Edit Forward \/ Rewind/ }))
  const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
  fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: String(value) } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

async function selectSpeedSettings() {
  await selectShortcutCategory('Playback speed')
  return screen.findByRole('group', { name: 'Range and step' })
}

async function openHoldControls() {
  await selectShortcutCategory('Playback')
  const toggle = screen.queryByRole('button', { name: 'Play / Pause' })
  if (toggle?.getAttribute('aria-expanded') === 'false') fireEvent.click(toggle)
  return screen.findByRole('row', { name: 'Play / Pause hold speed' })
}

async function openHoldSettings() {
  await openHoldControls()
  fireEvent.click(screen.getByRole('button', { name: 'Edit Play / Pause hold speed' }))
  return within(await screen.findByRole('dialog', { name: 'Play / Pause hold speed' })).getByLabelText('Hold speed')
}

async function saveHoldSettings() {
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

async function openPreferredSpeed() {
  await selectShortcutCategory('Playback speed')
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Set preferred speed' }))
  return screen.findByRole('dialog', { name: 'Preferred speed' })
}

describe('OptionsApp', () => {
  it('labels an existing Markdown selection correctly and hides it after changing away', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, uiStyle: 'markdown' })
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    const style = await screen.findByRole('combobox', { name: 'Interface style' })
    expect(style).toHaveTextContent('Markdown')
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'markdown')
    fireEvent.click(style)
    fireEvent.click(await screen.findByRole('option', { name: 'Classic' }))
    await waitFor(async () => expect((await getSettings()).uiStyle).toBe('classic'))
    expect(style).toHaveTextContent('Classic')
    fireEvent.click(style)
    expect(screen.queryByRole('option', { name: 'Markdown' })).not.toBeInTheDocument()
  })

  it.each(['primary', 'additional'] as const)('records CapsLock in the %s shortcut field', async field => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Next episode' }))
    const dialog = screen.getByRole('dialog')
    if (field === 'additional') fireEvent.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    const areas = within(dialog).getAllByRole('group', { name: 'Record shortcut' })
    fireEvent.keyDown(areas[field === 'additional' ? 1 : 0], { key: 'CapsLock', code: 'CapsLock' })
    expect(areas[field === 'additional' ? 1 : 0]).toHaveTextContent('Caps')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const binding = (await getSettings()).bindings.nextEpisode
    expect(field === 'additional' ? binding.additionalKeys?.[0] : binding.key).toMatchObject({ code: 'CapsLock', key: 'CapsLock' })
  })

  it.each([
    { code: 'KeyG', key: 'ㄕ', label: 'G', recorded: 'g' },
    { code: 'KeyG', key: 'き', label: 'G', recorded: 'g' },
    { code: 'KeyG', key: 'ㅎ', label: 'G', recorded: 'g' },
    { code: 'Semicolon', key: 'ㄤ', label: ';', recorded: ';' },
  ])('displays $label and saves it when recording $key', async ({ code, key, label, recorded }) => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Next episode' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    const area = within(dialog).getAllByRole('group', { name: 'Record shortcut' })[1]
    fireEvent.keyDown(area, { code, key })

    expect(within(area).getByTitle(label)).toBeVisible()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.nextEpisode.additionalKeys?.[0]).toMatchObject({ code, key: recorded })
  })

  it.each([
    { action: 'nextEpisode', label: 'Next episode', mediaKey: 'MediaTrackNext' },
    { action: 'previousEpisode', label: 'Previous episode', mediaKey: 'MediaTrackPrevious' },
  ] as const)('records $mediaKey as an additional $label shortcut', async ({ action, label, mediaKey }) => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('button', { name: `Edit ${label}` }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('data-size', 'compact')
    expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    const areas = within(dialog).getAllByRole('group', { name: 'Record shortcut' })
    expect(areas).toHaveLength(2)
    fireEvent.keyDown(areas[1], { key: mediaKey, code: '' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    expect(within(dialog).getAllByRole('group', { name: 'Record shortcut' })).toHaveLength(3)
    expect(within(dialog).getByRole('button', { name: 'Add shortcut' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove shortcut 3' }))
    expect(within(dialog).getByRole('button', { name: 'Add shortcut' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const binding = (await getSettings()).bindings[action]
    expect(binding.key).toEqual(DEFAULT_SETTINGS.bindings[action].key)
    expect(binding.additionalKeys).toEqual([{ code: mediaKey, key: mediaKey, ctrl: false, alt: false, shift: false, meta: false }])
    fireEvent.click(screen.getByRole('button', { name: `Edit ${label}` }))
    expect(within(screen.getByRole('dialog')).getAllByRole('group', { name: 'Record shortcut' })).toHaveLength(2)
  })

  it('lists every occupied key before enabling a shortcut with multiple conflicts', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextEpisode = {
      enabled: false, key: settings.bindings.mute.key,
      additionalKeys: [settings.bindings.fullscreen.key!],
    }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('switch', { name: 'Next episode Enabled' }))
    expect(await screen.findByRole('dialog', { name: /M · F.*Mute.*Fullscreen/ })).toBeVisible()
  })

  it('removes, restores and cancels extra shortcut drafts, and rejects duplicates and occupied keys', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextEpisode.additionalKeys = [{ code: 'MediaTrackNext', key: 'MediaTrackNext', ctrl: false, alt: false, shift: false, meta: false }]
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Next episode' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove shortcut 2' }))
    expect(within(dialog).getAllByRole('group', { name: 'Record shortcut' })).toHaveLength(1)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo edits' }))
    expect(within(dialog).getAllByRole('group', { name: 'Record shortcut' })).toHaveLength(2)
    const extra = within(dialog).getAllByRole('group', { name: 'Record shortcut' })[1]
    fireEvent.keyDown(extra, { code: 'KeyN', key: 'N', shiftKey: true })
    expect(extra).toHaveAccessibleDescription('This key is already recorded here.')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.keyDown(extra, { code: 'KeyM', key: 'm' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add shortcut' }))
    const [first, second, third] = within(dialog).getAllByRole('group', { name: 'Record shortcut' })
    fireEvent.keyDown(third, { code: 'KeyC', key: 'c' })
    expect(first).not.toHaveAttribute('aria-invalid')
    expect(second).toHaveAccessibleDescription('This shortcut is already used by Mute.')
    expect(third).toHaveAccessibleDescription('This shortcut is already used by Toggle subtitles.')
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Clear shortcut' })[0])
    expect(within(dialog).getByText('This shortcut is already used by Mute.')).toBeVisible()
    expect(within(dialog).getByText('This shortcut is already used by Toggle subtitles.')).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).bindings.nextEpisode).toEqual(settings.bindings.nextEpisode)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Next episode' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove shortcut 1' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.nextEpisode).toEqual({ enabled: true, key: settings.bindings.nextEpisode.additionalKeys![0] })
  })

  it('saves extra seek keys with the value and keeps them when toggling the pair', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const pair = await screen.findByRole('group', { name: 'Forward / Rewind' })
    fireEvent.click(within(pair).getByRole('button', { name: /^Edit Forward \/ Rewind/ }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Add shortcut' })[0])
    fireEvent.keyDown(within(dialog).getAllByRole('group', { name: 'Forward' })[1], { code: 'F20', key: 'F20' })
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '15' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const saved = await getSettings()
    expect(saved.seek.seconds).toBe(15)
    expect(saved.bindings.seekForward.additionalKeys?.[0].code).toBe('F20')
    fireEvent.click(within(pair).getByRole('switch'))
    await waitFor(async () => expect((await getSettings()).bindings.seekForward.enabled).toBe(false))
    expect((await getSettings()).bindings.seekForward.additionalKeys).toEqual(saved.bindings.seekForward.additionalKeys)
  })
  it('expands hold settings from Play / Pause and restores the collapsed state after search', async () => {
    render(<OptionsApp />)
    const controls = await openHoldControls()
    const toggle = screen.getByRole('button', { name: 'Play / Pause' })
    const before = await getSettings()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const table = screen.getByRole('table', { name: 'Play / Pause hold speed' })
    expect(toggle).toHaveAttribute('aria-controls', table.closest('tr')!.id)
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(controls).not.toBeVisible()
    expect(table).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Reset Play / Pause' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Play / Pause Enabled' })).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Show speed hint' } })
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Play / Pause' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('row', { name: 'Play / Pause hold speed' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Play / Pause' }))
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    expect(await getSettings()).toEqual(before)
  })

  it('uses a collapsible nested table for preferred speeds and expands it when adding', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback speed')
    const group = screen.getByRole('group', { name: 'Preferred speed' })
    const nested = within(group).getByRole('table', { name: 'Preferred speed' })
    expect(nested).toHaveAttribute('data-nested', 'true')
    expect(within(nested).getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Speed', 'Key', 'Enabled', 'Action'])
    fireEvent.click(within(group).getByRole('button', { name: 'Preferred speed' }))
    expect(nested).not.toBeVisible()
    fireEvent.click(within(group).getByRole('button', { name: 'Add preferred speed' }))
    const dialog = await screen.findByRole('dialog', { name: 'Preferred speed' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(nested).toBeVisible())
    fireEvent.click(within(group).getByRole('button', { name: 'Preferred speed' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '1.5' } })
    expect(screen.getByRole('table', { name: 'Preferred speed' })).toBeVisible()
  })
  it('adds two preferred speeds, edits and disables them independently, then removes a group', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback speed')
    for (const [speed, code, key] of [['2', 'Digit2', '2'], ['5', 'Digit3', '3']]) {
      fireEvent.click(screen.getByRole('button', { name: 'Add preferred speed' }))
      const dialog = await screen.findByRole('dialog', { name: 'Preferred speed' })
      fireEvent.change(within(dialog).getByLabelText('Speed'), { target: { value: speed } })
      fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Key' }), { code, key })
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
    await waitFor(async () => expect((await getSettings()).preferredSpeedShortcuts.map(item => item.speed)).toEqual([2, 5]))
    fireEvent.click(within(screen.getByRole('row', { name: 'Set preferred speed · 2×' })).getByRole('switch'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Set preferred speed · 2×' }))
    const dialog = await screen.findByRole('dialog', { name: 'Preferred speed' })
    fireEvent.change(within(dialog).getByLabelText('Speed'), { target: { value: '2.5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.preferredSpeedShortcuts.map(item => item.speed)).toEqual([2.5, 5])
      expect(saved.bindings[saved.preferredSpeedShortcuts[0].id].enabled).toBe(false)
      expect(saved.speed.preferred).toBe(1.5)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Remove preferred speed 2.5×' }))
    let confirmation = await screen.findByRole('dialog', { name: 'Remove preferred speed 2.5×' })
    const beforeDelete = await getSettings()
    expect(beforeDelete.preferredSpeedShortcuts.map(item => item.speed)).toEqual([2.5, 5])
    expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await getSettings()).toEqual(beforeDelete)
    fireEvent.click(screen.getByRole('button', { name: 'Remove preferred speed 2.5×' }))
    confirmation = await screen.findByRole('dialog', { name: 'Remove preferred speed 2.5×' })
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.preferredSpeedShortcuts.map(item => item.speed)).toEqual([5])
      expect(Object.keys(saved.bindings).filter(action => action.startsWith('preferred-speed:'))).toHaveLength(1)
    })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '5' } })
    expect(screen.getByRole('button', { name: 'Edit Set preferred speed · 5×' })).toBeVisible()
  })

  it('cancels new preferred speeds, blocks key conflicts and rejects stale custom speed edits', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2 }]
    settings.bindings['preferred-speed:custom'] = { enabled: true, key: { ...settings.bindings.mute.key, code: 'KeyQ', key: 'q' } }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Playback speed')
    fireEvent.click(screen.getByRole('button', { name: 'Add preferred speed' }))
    const newDialog = await screen.findByRole('dialog', { name: 'Preferred speed' })
    fireEvent.keyDown(within(newDialog).getByRole('group', { name: 'Key' }), { code: 'KeyQ', key: 'q' })
    expect(within(newDialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(newDialog).toHaveTextContent('Set preferred speed · 2×')
    fireEvent.click(within(newDialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).preferredSpeedShortcuts).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Edit Set preferred speed · 2×' }))
    const dialog = await screen.findByRole('dialog', { name: 'Preferred speed' })
    fireEvent.change(within(dialog).getByLabelText('Speed'), { target: { value: '2.5' } })
    await act(async () => { await saveSettings({ ...settings, preferredSpeedShortcuts: [{ id: 'preferred-speed:custom', speed: 3 }] }) })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(dialog).toHaveTextContent('Settings changed. Reopen this editor.')
  })

  it.each(['Playback', 'Seeking and navigation', 'Subtitle language and size', 'Volume and audio', 'Playback speed', 'Sentence jumps and replay'])(
    'displays static keys and keeps a visible edit button in the Actions column for %s shortcuts', async category => {
      if (category === 'Subtitle language and size') {
        const settings = structuredClone(DEFAULT_SETTINGS)
        settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
        settings.bindings['subtitle-size:custom'] = { enabled: true, key: { ...settings.bindings.mute.key, code: 'KeyZ', key: 'z' } }
        await saveSettings(settings)
      }
      render(<OptionsApp />)
      await selectShortcutCategory(category)
      const table = screen.getByRole('table', { name: category })
      const rows = within(table).getAllByRole('row').filter(row => row.closest('table') === table)
      const edits = rows.flatMap(row => {
        const cells = Array.from(row.children).filter(cell => cell.tagName === 'TD')
        if (cells.length !== 4) return []
        expect(within(cells[1] as HTMLElement).queryByRole('button')).not.toBeInTheDocument()
        const edit = within(cells[3] as HTMLElement).getByRole('button', { name: /^Edit / })
        expect(edit).toBeVisible()
        expect(edit.querySelector('svg')).toHaveClass('lucide-pencil')
        return [edit]
      })
      expect(edits.length).toBeGreaterThan(0)
      const row = edits[0].closest('tr')!
      const key = row.children[1].querySelector('kbd')!
      fireEvent.click(key)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      fireEvent.click(edits[0])
      const dialog = await screen.findByRole('dialog')
      expect(dialog).toBeVisible()
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await waitFor(() => expect(edits[0]).toHaveFocus())
      fireEvent.click(edits[0])
      expect(await screen.findByRole('dialog')).toBeVisible()
    },
  )

  it('keeps an oversized seek draft open until enough storage is available', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    for (let index = 0; index < 12; index += 1) {
      const id = `seek:00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as const
      settings.seekShortcuts.push({ id, kind: 'relative', value: index + 1 })
      for (const direction of ['backward', 'forward'] as const) {
        settings.bindings[`${id}-${direction}`] = {
          enabled: true,
          key: { code: `F${index + 1}`, key: `F${index + 1}`, ctrl: false, alt: false, shift: direction === 'forward', meta: false },
        }
      }
      if (!fitsSettingsStorageLimit(settings)) {
        settings.seekShortcuts.pop()
        delete settings.bindings[`${id}-backward`]
        delete settings.bindings[`${id}-forward`]
        break
      }
    }
    const capacity = settings.seekShortcuts.length
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Add seek pair' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '17' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyL', key: 'l' })
    const save = within(dialog).getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Settings storage is full')
    vi.mocked(chrome.storage.sync.set).mockClear()
    fireEvent.click(save)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(await getSettings()).toEqual(settings)
    expect(dialog).toBeInTheDocument()

    const removed = settings.seekShortcuts.pop()!
    delete settings.bindings[`${removed.id}-backward`]
    delete settings.bindings[`${removed.id}-forward`]
    await act(async () => { await saveSettings(settings) })
    expect(save).toBeEnabled()
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByLabelText('Seconds')).toHaveValue(17)
    fireEvent.click(save)
    await waitFor(async () => expect((await getSettings()).seekShortcuts).toHaveLength(capacity))
    expect((await getSettings()).seekShortcuts.at(-1)?.value).toBe(17)
  })

  it('opens the original modal from header Add with a number and both seek keys, without adding an incomplete row', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const relative = await screen.findByRole('group', { name: 'Forward / Rewind' })
    const section = within(relative).getByRole('button', { name: 'Forward / Rewind' })
    const add = within(relative).getByRole('button', { name: 'Add seek pair' })
    expect(add).toHaveTextContent('Add')
    expect(within(relative).queryByRole('spinbutton')).not.toBeInTheDocument()
    fireEvent.click(section)
    expect(add).toBeVisible()
    fireEvent.click(add)
    expect(section).toHaveAttribute('aria-expanded', 'true')
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    const seconds = within(dialog).getByLabelText('Seconds')
    expect(seconds).toHaveFocus()
    fireEvent.change(seconds, { target: { value: '17' } })
    fireEvent.keyDown(seconds, { code: 'Digit2', key: '2' })
    expect(within(dialog).getByRole('group', { name: 'Rewind' })).toHaveTextContent('Set shortcut')
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    expect((await getSettings()).seekShortcuts).toEqual([])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).seekShortcuts).toEqual([])
    await waitFor(() => expect(add).toHaveFocus())
    fireEvent.click(add)
    expect(within(await screen.findByRole('dialog')).getByLabelText('Seconds')).toHaveValue(10)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('sets percentage and key in one modal and validates the complete entry before saving', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Add percentage shortcut' }))
    let dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    const progress = within(dialog).getByLabelText('Video progress (%)')
    fireEvent.change(progress, { target: { value: '37' } })
    expect(within(dialog).queryByText('Key', { selector: 'label' })).not.toBeInTheDocument()
    const keyField = within(dialog).getByRole('group', { name: 'Key' })
    fireEvent.keyDown(keyField, { code: 'ArrowRight', key: 'ArrowRight' })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Forward')
    fireEvent.keyDown(keyField, { code: 'Digit5', key: '5' })
    fireEvent.change(progress, { target: { value: '101' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(progress, { target: { value: '37' } })
    expect(within(dialog).queryByText('No conflict detected.')).not.toBeInTheDocument()
    expect((await getSettings()).seekShortcuts).toEqual([])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seekShortcuts).toHaveLength(1))
    const shortcut = (await getSettings()).seekShortcuts[0]
    expect(shortcut).toMatchObject({ kind: 'percentage', value: 37 })
    expect((await getSettings()).bindings[shortcut.id]).toMatchObject({ enabled: true, key: { code: 'Digit5' } })
    expect(screen.queryByRole('spinbutton', { name: '37%' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit 37%' }))
    dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    fireEvent.change(within(dialog).getByLabelText('Video progress (%)'), { target: { value: '63' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Key' }), { code: 'Digit6', key: '6' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seekShortcuts[0].value).toBe(63))
    expect((await getSettings()).bindings[shortcut.id].key?.code).toBe('Digit6')
    fireEvent.click(screen.getByRole('switch', { name: '63% Enabled' }))
    await waitFor(async () => expect((await getSettings()).bindings[shortcut.id].enabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Remove 63%' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Remove 63%' })
    expect((await getSettings()).bindings[shortcut.id]).toBeDefined()
    fireEvent.keyDown(within(confirmation).getByRole('button', { name: 'Cancel' }), { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings[shortcut.id]).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Remove 63%' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Remove 63%' })).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect((await getSettings()).bindings[shortcut.id]).toBeUndefined())
  })

  it('saves a seek pair atomically, supports swapping its keys, and uses one switch for both directions', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const relative = await screen.findByRole('group', { name: 'Forward / Rewind' })
    fireEvent.click(within(relative).getByRole('button', { name: 'Add seek pair' }))
    let dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    const seconds = within(dialog).getByLabelText('Seconds')
    expect(seconds).toHaveAttribute('max', '300')
    fireEvent.change(seconds, { target: { value: '301' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.change(seconds, { target: { value: '300' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyJ', key: 'j' })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getAllByRole('alert')).toHaveLength(2)
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyL', key: 'l' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seekShortcuts).toHaveLength(1))
    const shortcut = (await getSettings()).seekShortcuts[0]
    const backward = `${shortcut.id}-backward` as const, forward = `${shortcut.id}-forward` as const
    let row = within(relative).getByRole('row', { name: 'Forward / Rewind 300 seconds' })
    expect(within(relative).getAllByRole('table')).toHaveLength(1)
    expect(within(row).getAllByRole('switch')).toHaveLength(1)
    fireEvent.click(within(row).getByRole('switch'))
    await waitFor(async () => expect([(await getSettings()).bindings[backward].enabled, (await getSettings()).bindings[forward].enabled]).toEqual([false, false]))
    fireEvent.click(within(row).getByRole('switch'))
    await waitFor(async () => expect([(await getSettings()).bindings[backward].enabled, (await getSettings()).bindings[forward].enabled]).toEqual([true, true]))
    fireEvent.click(within(row).getByRole('button', { name: 'Edit Forward / Rewind 300 seconds' }))
    dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '20' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyL', key: 'l' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyJ', key: 'j' })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seekShortcuts[0].value).toBe(20))
    expect((await getSettings()).bindings[backward].key?.code).toBe('KeyL')
    expect((await getSettings()).bindings[forward].key?.code).toBe('KeyJ')
    row = screen.getByRole('row', { name: 'Forward / Rewind 20 seconds' })
    fireEvent.click(within(row).getByRole('button', { name: 'Remove Forward / Rewind 20 seconds' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Remove Forward / Rewind 20 seconds' })
    expect((await getSettings()).bindings[backward]).toBeDefined()
    expect((await getSettings()).bindings[forward]).toBeDefined()
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect((await getSettings()).bindings[backward]).toBeUndefined())
    expect((await getSettings()).bindings[forward]).toBeUndefined()
  })

  it('drags modal seconds within the range and only persists on Save', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Forward / Rewind 10 seconds' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    const label = within(dialog).getByText('Seconds', { selector: 'label' })
    const input = within(dialog).getByLabelText('Seconds')
    expect(input).toHaveAttribute('max', '300')
    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 124, pointerId: 1 })
    expect(input).toHaveValue(13)
    fireEvent.pointerCancel(label, { pointerId: 1 })
    expect(input).toHaveValue(10)
    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 2 })
    fireEvent.pointerMove(label, { clientX: 3000, pointerId: 2 })
    expect(input).toHaveValue(300)
    fireEvent.pointerMove(label, { clientX: -1000, pointerId: 2 })
    expect(input).toHaveValue(1)
    fireEvent.pointerMove(label, { clientX: 116, pointerId: 2 })
    fireEvent.pointerUp(label, { clientX: 116, pointerId: 2 })
    expect(input).toHaveValue(12)
    expect((await getSettings()).seek.seconds).toBe(10)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seek.seconds).toBe(12))
    expect((await getSettings()).bindings.seekBackward).toEqual(DEFAULT_SETTINGS.bindings.seekBackward)
    expect((await getSettings()).bindings.seekForward).toEqual(DEFAULT_SETTINGS.bindings.seekForward)
  })

  it('keeps edits local until Save and restores number and both keys together', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const edit = await screen.findByRole('button', { name: 'Edit Forward / Rewind 10 seconds' })
    fireEvent.click(edit)
    let dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '20' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyL', key: 'l' })
    expect((await getSettings()).seek.seconds).toBe(10)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo edits' }))
    expect(within(dialog).getByLabelText('Seconds')).toHaveValue(10)
    expect(within(dialog).getByRole('group', { name: 'Rewind' })).toHaveTextContent('←')
    expect(within(dialog).getByRole('group', { name: 'Forward' })).toHaveTextContent('→')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '20' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).seek.seconds).toBe(10)
    fireEvent.click(edit)
    dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '301' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  })

  it('checks both pair keys on enable and transfers conflicting keys only after confirmation', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekBackward.enabled = false
    settings.bindings.seekForward.enabled = false
    settings.bindings.seekBackward.key = settings.bindings.mute.key
    settings.bindings.seekForward.key = settings.bindings.fullscreen.key
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const toggle = await screen.findByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' })
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    expect((await getSettings()).bindings.mute.enabled).toBe(true)
    expect((await getSettings()).bindings.fullscreen.enabled).toBe(true)
    const popover = screen.getByRole('dialog')
    expect(within(popover).getByRole('link', { name: 'Mute' })).toHaveAttribute('href', '#volume')
    expect(within(popover).getByRole('link', { name: 'Fullscreen' })).toHaveAttribute('href', '#playback')
    fireEvent.click(within(popover).getByRole('button', { name: 'Use this key' }))
    await waitFor(async () => expect((await getSettings()).bindings.seekForward.enabled).toBe(true))
    expect((await getSettings()).bindings.seekBackward.enabled).toBe(true)
    expect((await getSettings()).bindings.mute.enabled).toBe(false)
    expect((await getSettings()).bindings.fullscreen.enabled).toBe(false)
  })

  it('clears search and focuses a collapsed seek row when following its conflict link', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekForward.enabled = true
    settings.bindings.mute = { enabled: false, key: settings.bindings.seekForward.key }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Forward / Rewind', expanded: true }))
    expect(screen.queryByRole('row', { name: 'Forward / Rewind 10 seconds' })).not.toBeInTheDocument()

    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'Mute' } })
    fireEvent.click(await screen.findByRole('switch', { name: 'Mute Enabled' }))
    const popover = await screen.findByRole('dialog')
    expect(popover).toHaveTextContent(/This will disable .*Rewind.*Forward/)
    expect(within(popover).getAllByRole('link')).toHaveLength(1)
    fireEvent.click(within(popover).getByRole('link', { name: 'Forward' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(search).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Forward / Rewind', expanded: true })).toBeVisible()
    expect(screen.getByRole('row', { name: 'Forward / Rewind 10 seconds' })).toHaveFocus()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' })
    expect(await getSettings()).toEqual(saved)
  })

  it('dismisses pair conflicts permanently after another view updates settings', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekBackward = { ...settings.bindings.seekBackward, enabled: false, key: settings.bindings.mute.key }
    settings.bindings.seekForward.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('This will disable Mute')

    await act(async () => { await saveSettings({ ...settings, seek: { seconds: 20 } }) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await getSettings()).bindings.seekBackward.enabled).toBe(false)
    expect((await getSettings()).bindings.mute.enabled).toBe(true)

    fireEvent.click(screen.getByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('This will disable Mute')
    await act(async () => { await saveSettings({ ...settings, theme: 'dark' }) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('changes both keys in the pair conflict modal before enabling and preserves other shortcuts', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekBackward = { ...settings.bindings.seekBackward, enabled: false, key: settings.bindings.mute.key }
    settings.bindings.seekForward = { ...settings.bindings.seekForward, enabled: false, key: settings.bindings.fullscreen.key }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change key' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    expect(within(dialog).getByLabelText('Seconds')).toHaveValue(10)
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '15' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyL', key: 'l' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).bindings.seekBackward.enabled).toBe(true))
    const saved = await getSettings()
    expect(saved.seek.seconds).toBe(15)
    expect(saved.bindings.seekForward.enabled).toBe(true)
    expect(saved.bindings.mute.enabled).toBe(true)
    expect(saved.bindings.fullscreen.enabled).toBe(true)
  })

  it('preserves a disabled pair when saving its number and both keys', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekBackward.enabled = false
    settings.bindings.seekForward.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Forward / Rewind 10 seconds' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '15' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Rewind' }), { code: 'KeyJ', key: 'j' })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Forward' }), { code: 'KeyL', key: 'l' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seek.seconds).toBe(15))
    expect((await getSettings()).bindings.seekBackward.enabled).toBe(false)
    expect((await getSettings()).bindings.seekForward.enabled).toBe(false)
  })

  it('rejects stale modal saves after settings change in another view', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Forward / Rewind 10 seconds' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Seconds'), { target: { value: '20' } })
    await act(async () => { await saveSettings({ ...DEFAULT_SETTINGS, seek: { seconds: 15 } }) })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/settings changed/i)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).seek.seconds).toBe(15)
  })

  it('includes custom rows in key transfer with builtin bindings', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:percent', kind: 'percentage', value: 25 }]
    settings.bindings['seek:percent'] = { enabled: false, key: settings.bindings.seekForward.key }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const toggle = await screen.findByRole('switch', { name: '25% Enabled' })
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    fireEvent.click(await screen.findByRole('button', { name: 'Use this key' }))
    await waitFor(async () => {
      const next = await getSettings()
      expect(next.bindings['seek:percent'].enabled).toBe(true)
      expect(next.bindings.seekForward.enabled).toBe(false)
      expect(next.bindings.seekBackward.enabled).toBe(false)
    })
  })

  it('shows one category at a time and keeps navigation out of saved settings', async () => {
    render(<OptionsApp />)
    const playback = await screen.findByRole('button', { name: 'Playback' })
    expect(playback).toHaveAttribute('aria-current', 'page')
    const breadcrumb = screen.getByRole('navigation', { name: 'Shortcuts' })
    expect(within(breadcrumb).getByRole('link', { name: 'Playback' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('table', { name: 'Playback' })).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Volume up Enabled' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add seek pair' })).not.toBeInTheDocument()
    const before = await getSettings()
    vi.mocked(chrome.storage.sync.set).mockClear()
    await selectShortcutCategory('Volume and audio')
    expect(within(breadcrumb).getByRole('link', { name: 'Volume and audio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('switch', { name: 'Volume up Enabled' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Next audio language Enabled' })).toBeChecked()
    expect(screen.queryByRole('table', { name: 'Playback' })).not.toBeInTheDocument()
    await selectShortcutCategory('Subtitle language and size')
    expect(screen.getByRole('switch', { name: 'Next subtitle language Enabled' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Cycle subtitle size Enabled' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Add subtitle size shortcut' })).not.toBeInTheDocument()
    const favorites = screen.getByRole('button', { name: 'Favorite subtitles' })
    expect(favorites).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(favorites)
    expect(favorites).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(favorites)
    expect(favorites).toHaveAttribute('aria-expanded', 'true')
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(await getSettings()).toEqual(before)
  })

  it('searches across categories by action, physical key and modifiers, then restores the selected category', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Volume and audio')
    const search = screen.getByRole('searchbox', { name: 'Search settings, actions or keys…' })
    fireEvent.change(search, { target: { value: 'subtitle' } })
    expect(within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'Search results' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Edit Toggle subtitles' })).toBeVisible()
    expect(screen.queryByRole('switch', { name: 'Volume up Enabled' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'shift+KeyP' } })
    expect(screen.getByRole('button', { name: 'Edit Previous episode' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Next episode' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'Space' } })
    expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    fireEvent.change(search, { target: { value: 'no-such-shortcut' } })
    expect(screen.getByRole('status')).toHaveTextContent('No settings or shortcuts found')
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Volume and audio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('switch', { name: 'Volume up Enabled' })).toBeVisible()
    fireEvent.change(search, { target: { value: 'Space' } })
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search).toHaveValue('')
    expect(screen.getByRole('switch', { name: 'Volume up Enabled' })).toBeVisible()
  })

  it('saves, searches and reopens favorite audio settings under Volume and audio', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'en' })
    const view = render(<OptionsApp />)
    await selectShortcutCategory('Volume and audio')
    const card = screen.getByRole('group', { name: 'Favorite audio tracks' })
    fireEvent.click(within(card).getByRole('combobox', { name: 'Audio tracks' }))
    const pickerSearch = await screen.findByRole('textbox', { name: 'Language name or code' })
    fireEvent.change(pickerSearch, { target: { value: 'Japanese' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japanese (ja)' }))
    fireEvent.click(within(card).getByRole('button', { name: 'Add (1)' }))
    await waitFor(async () => expect((await getSettings()).audioFavorites).toEqual([{ language: 'ja', audioDescription: false }]))
    view.unmount()
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    for (const query of ['Favorite audio tracks', '常用音軌 日語', '常用音轨', 'よく使う音声', '자주 쓰는 오디오']) {
      fireEvent.change(search, { target: { value: query } })
      expect(await screen.findByRole('button', { name: 'Remove Japanese' })).toBeVisible()
    }
    fireEvent.click(screen.getByRole('button', { name: 'Remove Japanese' }))
    await waitFor(async () => expect((await getSettings()).audioFavorites).toEqual([]))
  })

  it('finds and edits favorite subtitles from the global search', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, subtitleFavorites: [{ language: 'ja' }] })
    render(<OptionsApp />)
    await selectShortcutCategory('Subtitle language and size')
    fireEvent.click(screen.getByRole('button', { name: 'Favorite subtitles' }))
    expect(screen.queryByRole('button', { name: 'Remove Japanese' })).not.toBeInTheDocument()
    const search = await screen.findByRole('searchbox')
    for (const query of [...LOCALES.map(locale => getCopy(locale).subtitleFavorites.title), '常用字幕 日語']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('button', { name: 'Remove Japanese' })).toBeVisible()
    }
    fireEvent.change(search, { target: { value: '常用字幕' } })
    const favorites = screen.getByRole('group', { name: 'Favorite subtitles' })
    expect(favorites).toBeVisible()
    fireEvent.click(within(favorites).getByRole('button', { name: 'Remove Japanese' }))
    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([]))
  })

  it.each(LOCALES)('finds translated settings sections in the %s interface', async locale => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale })
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    const copy = getCopy(locale)
    fireEvent.change(search, { target: { value: '常用字幕' } })
    expect(screen.getByRole('group', { name: copy.subtitleFavorites.title })).toBeVisible()
    fireEvent.change(search, { target: { value: '範圍與調整幅度' } })
    expect(screen.getByRole('group', { name: SPEED_SHORTCUT_COPY[locale].range })).toBeVisible()
    fireEvent.change(search, { target: { value: 'Theme' } })
    expect(screen.getByRole('combobox', { name: copy.theme })).toBeVisible()
    fireEvent.change(search, { target: { value: '匯出設定' } })
    expect(screen.getByRole('button', { name: copy.exportSettings })).toBeVisible()
  })

  it('finds and edits the speed range inline from the global search', async () => {
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    fireEvent.change(search, { target: { value: '範圍與調整幅度' } })
    const range = screen.getByRole('group', { name: 'Range and step' })
    expect(range).toBeVisible()
    expect(within(range).getAllByRole('spinbutton')).toHaveLength(3)
    expect(within(range).queryByRole('button', { name: 'Edit Range and step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const minimum = within(range).getByRole('spinbutton', { name: 'Lowest speed' })
    fireEvent.change(minimum, { target: { value: '0.5' } })
    fireEvent.blur(minimum)
    await waitFor(async () => expect((await getSettings()).speed.min).toBe(0.5))
    expect(minimum).toHaveValue(0.5)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit Speed up' })).not.toBeInTheDocument()
  })

  it('finds an empty percentage group and adds its first shortcut from search', async () => {
    render(<OptionsApp />)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: '進度跳轉' } })
    expect(screen.getByRole('group', { name: 'Jump to position' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Add percentage shortcut' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Video progress (%)'), { target: { value: '37' } })
    fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Key' }), { code: 'Digit5', key: '5' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).seekShortcuts).toEqual([expect.objectContaining({ kind: 'percentage', value: 37 })]))
    expect(screen.getByRole('button', { name: 'Edit 37%' })).toBeVisible()
  })

  it.each([
    ['介面風格', 'combobox', 'Interface style'],
    ['主題', 'combobox', 'Theme'],
    ['語言', 'combobox', 'Language'],
    ['自動播放與略過', 'switch', 'Intro'],
    ['逐句模式', 'button', 'Edit Play / pause'],
    ['匯出設定', 'button', 'Export settings'],
    ['Show speed hint', 'switch', 'Play / Pause hold speed: Show speed hint'],
    ['Enable subtitle navigation shortcuts', 'switch', 'Enable subtitle navigation shortcuts'],
    ['秒數', 'button', 'Edit Forward / Rewind 10 seconds'],
  ])('finds the settings control for %s', async (query, role, name) => {
    render(<OptionsApp />)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: query } })
    expect(screen.getByRole(role, { name })).toBeVisible()
  })

  it('edits playback automation in search and returns to the selected category', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Volume and audio')
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: '自動播放與略過' } })
    fireEvent.click(screen.getByRole('switch', { name: 'Intro' }))
    await waitFor(async () => expect((await getSettings()).autoSkip.intro).toBe(true))
    expect(screen.queryByRole('button', { name: 'Reset general shortcuts' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Volume and audio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('switch', { name: 'Intro' })).not.toBeInTheDocument()
  })

  it('finds custom seek and subtitle-size shortcuts and reflects external binding changes', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:jump', kind: 'percentage', value: 37 }]
    settings.bindings['seek:jump'] = { enabled: true, key: { ...settings.bindings.mute.key, code: 'Digit5', key: '5' } }
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
    settings.bindings['subtitle-size:custom'] = { enabled: true, key: { ...settings.bindings.mute.key, code: 'KeyB', key: 'b' } }
    await saveSettings(settings)
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    fireEvent.change(search, { target: { value: '37%' } })
    expect(screen.getByRole('button', { name: 'Edit 37%' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Forward / Rewind 10 seconds' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'KeyB' } })
    expect(screen.getByRole('button', { name: /Edit.*150%/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Cycle subtitle size' })).not.toBeInTheDocument()
    settings.bindings['subtitle-size:custom'].key = { ...settings.bindings.mute.key, code: 'KeyY', key: 'y' }
    await act(async () => { await saveSettings(settings) })
    expect(screen.getByRole('status')).toHaveTextContent('No settings or shortcuts found')
    fireEvent.change(search, { target: { value: 'KeyY' } })
    expect(screen.getByRole('button', { name: /Edit.*150%/ })).toBeVisible()
  })

  it('searches translated actions, categories and custom groups regardless of interface language', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.locale = 'en'
    settings.seekShortcuts = [{ id: 'seek:translated', kind: 'percentage', value: 37 }]
    settings.bindings['seek:translated'] = { enabled: true, key: null }
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:translated', kind: 'fixed', sizes: [150] }]
    settings.bindings['subtitle-size:translated'] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    for (const query of ['字幕', '자막']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('button', { name: 'Edit Toggle subtitles' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Edit Previous subtitle' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Edit Mute' })).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: '画面' } })
    expect(screen.getByRole('button', { name: 'Edit Fullscreen' })).toBeVisible()
    fireEvent.change(search, { target: { value: '进度跳转 37%' } })
    expect(screen.getByRole('button', { name: 'Edit 37%' })).toBeVisible()
    fireEvent.change(search, { target: { value: 'サイズを指定 150%' } })
    expect(screen.getByRole('button', { name: /Edit.*150%/ })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Cycle subtitle size' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '長按' } })
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    fireEvent.change(search, { target: { value: '音軌 SHIFT＋KeyD' } })
    expect(screen.getByRole('button', { name: 'Edit Next audio language' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Previous audio language' })).not.toBeInTheDocument()
  })

  it('uses the same language and function aliases as the popup', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'en' })
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    for (const query of ['日語', '일어', 'US English', '불어']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('button', { name: 'Edit Next subtitle language' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Edit Previous subtitle language' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Edit Next audio language' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Edit Previous audio language' })).toBeVisible()
      expect(screen.queryByRole('button', { name: 'Edit Toggle subtitles' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit Mute' })).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: '日語 shift+KeyD' } })
    expect(screen.getByRole('button', { name: 'Edit Next audio language' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Previous audio language' })).not.toBeInTheDocument()
    for (const query of ['pause', '暫停', 'resume']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    }
    fireEvent.change(search, { target: { value: 'floating player' } })
    expect(screen.getByRole('button', { name: 'Edit Picture-in-Picture' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Fullscreen' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'repeat sentence' } })
    expect(screen.getByRole('button', { name: 'Edit Replay current subtitle' })).toBeVisible()
  })

  it('preserves nested seek expansion when switching categories and keeps Add available', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Seeking and navigation')
    const section = screen.getByRole('button', { name: 'Forward / Rewind' })
    fireEvent.click(section)
    expect(screen.queryByRole('table', { name: 'Forward / Rewind' })).not.toBeInTheDocument()
    await selectShortcutCategory('Playback')
    expect(screen.queryByRole('button', { name: 'Add seek pair' })).not.toBeInTheDocument()
    await selectShortcutCategory('Seeking and navigation')
    expect(screen.getByRole('button', { name: 'Forward / Rewind' })).toHaveAttribute('aria-expanded', 'false')
    const add = screen.getByRole('button', { name: 'Add seek pair' })
    const reopened = screen.getByRole('button', { name: 'Forward / Rewind' })
    fireEvent.click(add)
    expect(reopened).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).seekShortcuts).toEqual([])
  })

  it.each(['general', 'seek', 'size'] as const)('returns focus to search when editing a %s key removes its result', async kind => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
    settings.bindings['subtitle-size:custom'] = { enabled: true, key: { ...settings.bindings.mute.key, code: 'KeyB', key: 'b' } }
    await saveSettings(settings)
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    fireEvent.change(search, { target: { value: kind === 'general' ? 'KeyM' : kind === 'seek' ? 'ArrowLeft' : 'KeyB' } })
    fireEvent.click(screen.getByRole('button', { name: kind === 'general' ? 'Edit Mute' : kind === 'seek' ? 'Edit Forward / Rewind 10 seconds' : /Edit.*150%/ }))
    const dialog = await screen.findByRole('dialog')
    const field = kind === 'seek' ? within(dialog).getByRole('group', { name: 'Rewind' })
      : kind === 'size' ? within(dialog).getByRole('group', { name: 'Key' }) : dialog
    fireEvent.keyDown(field, { code: 'KeyQ', key: 'q' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('No settings or shortcuts found')
    await waitFor(() => expect(search).toHaveFocus())
  })

  it('uses sidebar pages for settings and leaves shortcut search when navigating', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    expect(within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'General settings' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeVisible()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    await selectShortcutCategory('Playback preferences')
    expect(within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'Playback preferences' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('switch', { name: 'Intro' })).toBeVisible()
    expect(screen.queryByRole('combobox', { name: 'Language' })).not.toBeInTheDocument()
    await selectShortcutCategory('Backup and restore')
    expect(within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'Backup and restore' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Export settings' })).toBeVisible()
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'Space' } })
    expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    await selectShortcutCategory('Subtitle language and size')
    expect(search).toHaveValue('')
    expect(screen.getByRole('switch', { name: 'Toggle subtitles Enabled' })).toBeVisible()
  })

  it('integrates subtitle navigation into the shortcut sidebar and search', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.bindings.previous.key = { ...settings.bindings.mute.key, code: 'F8', key: 'F8' }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const section = screen.getByRole('group', { name: 'Sentence jumps and replay' })
    const card = section.closest<HTMLElement>('[data-slot="card"]')!
    expect(card).toContainElement(screen.getByRole('group', { name: 'Subtitle language and size' }))
    expect(card).toContainElement(screen.getByRole('heading', { name: 'Sentence jumps and replay' }))
    const header = within(section).getByRole('heading', { name: 'Sentence jumps and replay' }).parentElement!
    expect(header).toContainElement(screen.getByRole('switch', { name: 'Enable subtitle navigation shortcuts' }))
    expect(header).toContainElement(screen.getByRole('button', { name: SUBTITLE_NAVIGATION_COPY.en.resetAll }))
    expect(within(section).getAllByRole('switch')).toHaveLength(5)
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'F8' } })
    expect(screen.getByRole('button', { name: 'Edit Previous subtitle' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Next subtitle' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Previous subtitle' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    fireEvent.keyDown(dialog, { code: 'KeyQ', key: 'q' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(search).toHaveFocus())
    expect(screen.getByRole('status')).toHaveTextContent('No settings or shortcuts found')
    expect((await getSettings()).subtitleNavigation.bindings.previous.key?.code).toBe('KeyQ')
    expect((await getSettings()).bindings).toEqual(settings.bindings)
  })

  it('keeps a subtitle permission request alive while switching sidebar pages', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(screen.getByRole('switch', { name: 'Enable subtitle navigation shortcuts' }))
    await selectShortcutCategory('General settings')
    await act(async () => approve(true))
    await selectShortcutCategory('Sentence jumps and replay')
    expect(screen.getByRole('switch', { name: 'Enable subtitle navigation shortcuts' })).toBeChecked()
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
  })

  it('searches, orders and removes subtitle favorites across interface languages', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'zh-TW' })
    render(<OptionsApp />)
    await selectShortcutCategory('字幕切換與大小')
    const card = await screen.findByRole('group', { name: '常用字幕' })
    const pickLanguage = async (query: string, label: string) => {
      fireEvent.click(within(card).getByRole('combobox', { name: '字幕語言' }))
      fireEvent.change(await screen.findByRole('textbox', { name: '語言名稱或代碼' }), { target: { value: query } })
      fireEvent.click(await screen.findByRole('checkbox', { name: label }))
    }
    const add = within(card).getByRole('button', { name: '加入' })
    await pickLanguage('Japanese', '日文 (ja)')
    expect(within(card).queryByRole('switch')).not.toBeInTheDocument()
    expect(within(card).getAllByRole('combobox')).toHaveLength(1)
    fireEvent.click(add)
    expect(add).toBeDisabled()

    await pickLanguage('zh-Hant', '繁體中文 (zh-Hant)')
    fireEvent.click(add)
    const grip = within(card).getByRole('group', { name: '調整 繁體中文 的順序' })
    act(() => grip.focus())
    fireEvent.keyDown(grip, { key: 'ArrowUp' })

    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([
      { language: 'zh-Hant' },
      { language: 'ja' },
    ]))
    expect(grip).toHaveFocus()
    fireEvent.keyDown(grip, { key: 'ArrowDown' })
    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([
      { language: 'ja' },
      { language: 'zh-Hant' },
    ]))
    expect(grip).toHaveFocus()
    fireEvent.keyDown(grip, { key: 'ArrowDown' })
    expect((await getSettings()).subtitleFavorites.map(item => item.language)).toEqual(['ja', 'zh-Hant'])
    fireEvent.keyDown(grip, { key: 'ArrowUp' })
    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([
      { language: 'zh-Hant' },
      { language: 'ja' },
    ]))
    const settings = await getSettings()
    await act(async () => { await saveSettings({ ...settings, locale: 'en' }) })
    const englishCard = await screen.findByRole('group', { name: 'Favorite subtitles' })
    expect(within(englishCard).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      'Traditional Chinese', 'Japanese',
    ])
    fireEvent.click(within(englishCard).getByRole('button', { name: 'Remove Japanese' }))
    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([
      { language: 'zh-Hant' },
    ]))
  })

  it('previews a favorite drag and only saves the order on drop', async () => {
    const french = { language: 'fr' } as const
    const english = { language: 'en' } as const
    const japanese = { language: 'ja' } as const
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'en', subtitleFavorites: [french, english, japanese] })
    render(<OptionsApp />)
    await selectShortcutCategory('Subtitle language and size')
    const card = await screen.findByRole('group', { name: 'Favorite subtitles' })
    card.style.backgroundColor = 'rgb(252, 250, 245)'
    const [first, second, last] = await within(card).findAllByRole('listitem')
    for (const [index, row] of [first, second, last].entries()) {
      vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
        top: index * 40, left: 0, width: 300, height: 40, bottom: (index + 1) * 40,
      } as DOMRect)
    }
    const grip = within(first).getByRole('group', { name: 'Reorder French' })
    expect(within(first).getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual(['Remove French'])
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn() }
    const startDrag = () => {
      const event = createEvent.dragStart(grip, { dataTransfer })
      Object.defineProperty(event, 'clientY', { value: 20 })
      fireEvent(grip, event)
    }
    const dragEvent = (event: Event) => {
      Object.defineProperty(event, 'clientY', { value: 101 })
      fireEvent(last, event)
    }

    startDrag()
    expect(getComputedStyle(dataTransfer.setDragImage.mock.calls[0][0]).backgroundColor)
      .toBe(getComputedStyle(card).backgroundColor)
    dragEvent(createEvent.dragOver(last, { dataTransfer }))
    expect(second.style.transform).toBe('translateY(-40px)')
    expect(last.style.transform).toBe('translateY(-40px)')
    expect(second.style.transition).toContain('transform 200ms')
    expect((await getSettings()).subtitleFavorites).toEqual([french, english, japanese])
    fireEvent.dragEnd(grip, { dataTransfer })
    expect(last.style.transform).toBe('')
    expect((await getSettings()).subtitleFavorites).toEqual([french, english, japanese])

    startDrag()
    dragEvent(createEvent.drop(last, { dataTransfer }))
    await waitFor(async () => expect((await getSettings()).subtitleFavorites).toEqual([english, japanese, french]))
    expect(within(card).getAllByRole('listitem').map(row => row.textContent)).toEqual([
      'English', 'Japanese', 'French',
    ])
  })

  it('saves the intro and recap preferences independently', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback preferences')
    const group = await screen.findByRole('group', { name: 'Playback automation' })
    const intro = within(group).getByRole('switch', { name: 'Intro' })
    const recap = within(group).getByRole('switch', { name: 'Recap' })
    const nextEpisode = within(group).getByRole('switch', { name: 'Next episode' })
    expect(nextEpisode).not.toBeChecked()
    fireEvent.click(nextEpisode)
    await waitFor(async () => expect((await getSettings()).autoNextEpisode).toBe(true))
    expect(intro).not.toBeChecked()
    expect(recap).not.toBeChecked()

    fireEvent.click(recap)
    await waitFor(async () => expect((await getSettings()).autoSkip).toEqual({ intro: false, recap: true }))
    fireEvent.click(intro)
    await waitFor(async () => expect((await getSettings()).autoSkip).toEqual({ intro: true, recap: true }))
  })

  it.each(LOCALES)('saves the pause overlay setting in Playback preferences and retains it on reopening in %s', async locale => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale })
    const copy = getCopy(locale)
    const first = render(<OptionsApp />)
    await selectShortcutCategory(OPTIONS_SECTION_COPY[locale].playbackPreferences)
    const pauseScreen = screen.getByRole('group', { name: OPTIONS_SECTION_COPY[locale].pauseScreen })
    const toggle = within(pauseScreen).getByRole('switch', { name: copy.hidePauseOverlay })
    expect(toggle).not.toBeChecked()
    expect(screen.queryByText(copy.hidePauseOverlayDescription)).not.toBeInTheDocument()
    const help = screen.getByRole('button', { name: copy.infoLabel.replace('{label}', copy.hidePauseOverlay) })
    focusAsKeyboard(help)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(copy.hidePauseOverlayDescription)
    act(() => help.blur())
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).hidePauseOverlay).toBe(true))
    first.unmount()
    render(<OptionsApp />)
    await selectShortcutCategory(OPTIONS_SECTION_COPY[locale].playbackPreferences)
    expect(screen.getByRole('switch', { name: copy.hidePauseOverlay })).toBeChecked()
  })

  it('finds the pause overlay setting using another interface language and retains its value while globally disabled', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false, hidePauseOverlay: false })
    render(<OptionsApp />)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: '暫停遮罩' } })
    const toggle = screen.getByRole('switch', { name: 'Hide pause overlay' })
    expect(toggle).toBeVisible()
    expect(toggle).toBeDisabled()
    expect(toggle).not.toBeChecked()
    expect((await getSettings()).hidePauseOverlay).toBe(false)
  })

  it('keeps the general S shortcut active and reports the overlap only on subtitle navigation', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    await saveSettings(settings)
    render(<OptionsApp />)

    await selectShortcutCategory('Seeking and navigation')
    const row = await screen.findByRole('row', { name: /Skip intro/ })
    expect(within(row).queryByText('Shortcut priority')).not.toBeInTheDocument()
    expect(within(row).getByText('S')).toBeInTheDocument()
    expect(within(row).getByRole('switch', { name: 'Skip intro Enabled' })).toBeChecked()
    await selectShortcutCategory('Sentence jumps and replay')
    const subtitleRow = screen.getByRole('row', { name: /Replay current subtitle/ })
    const badge = within(subtitleRow).getByLabelText('This key is used by Skip intro. Choose another key for subtitle navigation.')
    expect(badge).toHaveTextContent('Shortcut priority')
    expect((await getSettings()).bindings.skipIntro).toEqual(settings.bindings.skipIntro)
  })

  it('matches custom physical keys and modifiers even when the displayed key differs', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.locale = 'zh-TW'
    settings.subtitleNavigation.enabled = true
    settings.bindings.skipIntro.key = { code: 'KeyQ', key: 'q', ctrl: true, alt: true, shift: true, meta: true }
    settings.subtitleNavigation.bindings.next.key = { ...settings.bindings.skipIntro.key, key: 'Ω' }
    await saveSettings(settings)
    render(<OptionsApp />)

    await selectShortcutCategory('進度與跳轉')
    const row = await screen.findByRole('row', { name: /略過片頭/ })
    expect(within(row).getByText('已取代 Netflix：S')).toBeInTheDocument()
    await selectShortcutCategory('逐句跳轉與重播')
    expect(screen.getByLabelText('這個按鍵由「略過片頭」使用，請為字幕導航設定其他按鍵。')).toHaveTextContent('一般快捷鍵優先')
  })

  it.each(['ctrl', 'alt', 'shift', 'meta', 'code'] as const)('does not block subtitle navigation when its %s differs', async field => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.bindings.skipIntro.key = { code: 'KeyQ', key: 'q', ctrl: false, alt: false, shift: false, meta: false }
    settings.subtitleNavigation.bindings.next.key = { ...settings.bindings.skipIntro.key }
    if (field === 'code') settings.subtitleNavigation.bindings.next.key.code = 'KeyR'
    else settings.subtitleNavigation.bindings.next.key[field] = true
    await saveSettings(settings)
    render(<OptionsApp />)

    await selectShortcutCategory('Sentence jumps and replay')
    expect(screen.queryByText('Shortcut priority')).not.toBeInTheDocument()
  })

  it.each(['global', 'subtitle', 'general binding', 'subtitle binding'] as const)('releases the legacy subtitle overlap when %s is disabled', async disabled => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    if (disabled === 'global') settings.enabled = false
    if (disabled === 'subtitle') settings.subtitleNavigation.enabled = false
    if (disabled === 'general binding') settings.bindings.skipIntro.enabled = false
    if (disabled === 'subtitle binding') settings.subtitleNavigation.bindings.replay.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)

    await selectShortcutCategory('Sentence jumps and replay')
    expect(screen.queryByText('Shortcut priority')).not.toBeInTheDocument()
  })

  it('does not show subtitle priority for unsupported Picture-in-Picture', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.next.key = { ...settings.bindings.pictureInPicture.key }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')

    const row = await screen.findByRole('row', { name: /Picture-in-Picture/ })
    expect(within(row).queryByText('Subtitle priority')).not.toBeInTheDocument()
    expect(within(row).getByRole('switch', { name: 'Picture-in-Picture Enabled' })).toBeDisabled()
  })

  it('refreshes subtitle conflict status without changing the general binding', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'KeyS' } })

    const row = await screen.findByRole('row', { name: /^Skip intro/ })
    const master = screen.getByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    const general = within(row).getByRole('switch', { name: 'Skip intro Enabled' })
    const subtitleRow = screen.getByRole('row', { name: /Replay current subtitle/ })
    expect(within(subtitleRow).getByText('Shortcut priority')).toBeInTheDocument()
    fireEvent.click(master)
    await waitFor(() => expect(within(subtitleRow).queryByText('Shortcut priority')).not.toBeInTheDocument())
    expect(general).toHaveAttribute('aria-checked', 'true')
    expect((await getSettings()).bindings.skipIntro).toEqual(settings.bindings.skipIntro)
    fireEvent.click(master)
    await waitFor(() => expect(within(subtitleRow).getByText('Shortcut priority')).toBeInTheDocument())
    expect(general).toHaveAttribute('aria-checked', 'true')
    expect((await getSettings()).bindings.skipIntro).toEqual(settings.bindings.skipIntro)
  })

  it('focuses and scrolls to the subtitle section from an announcement without enabling it', async () => {
    await recordEligibleUpgrade()
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
      await waitFor(() => expect(document.getElementById('subtitle-navigation')).toHaveFocus())
      expect(document.querySelector('label[for="subtitle-navigation-enabled"]')).toHaveTextContent(SUBTITLE_ACTIVATION_COPY.en.enableLabel)
      const guide = screen.getByRole('dialog', { name: 'Sentence jumps and replay' })
      expect(within(guide).getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(document.getElementById('subtitle-navigation')).not.toContainElement(guide)
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.permission)).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-describedby', 'subtitle-activation-guide')
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
      expect(chrome.permissions.request).not.toHaveBeenCalled()
      expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it('requires explicit transfer before a subtitle row can take an enabled general key', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: false, key: { ...settings.bindings.skipIntro.key } }
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(screen.getByRole('switch', { name: 'Replay current subtitle Enabled' }))
    const popover = await screen.findByRole('dialog')
    expect(popover).toHaveTextContent('This will disable Skip intro.')
    expect((await getSettings()).bindings.skipIntro.enabled).toBe(true)
    expect((await getSettings()).subtitleNavigation.bindings.replay.enabled).toBe(false)
    fireEvent.keyDown(popover, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.skipIntro.enabled).toBe(true)
    fireEvent.click(screen.getByRole('switch', { name: 'Replay current subtitle Enabled' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Use this key' }))
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.replay.enabled).toBe(true))
    expect((await getSettings()).bindings.skipIntro.enabled).toBe(false)
    expect((await getSettings()).bindings.mute).toEqual(settings.bindings.mute)
  })

  it('keeps the activation guide after denial and closes it after a successful retry', async () => {
    await recordEligibleUpgrade()
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => Promise.resolve(false) as never)
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
      fireEvent.click(document.querySelector('label[for="subtitle-navigation-enabled"]')!)
      await screen.findByRole('alert')
      expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
      expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-describedby', 'subtitle-activation-guide subtitle-permission-error')
      fireEvent.click(toggle)
      await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      expect(toggle).not.toHaveAttribute('aria-describedby')
      fireEvent.click(toggle)
      await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(false))
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it('updates activation guidance when navigating to and away from the subtitle section', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'KeyM' } })
    expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
    try {
      await act(async () => {
        window.history.replaceState(null, '', '/options.html#subtitle-navigation')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(document.getElementById('subtitle-navigation')).toHaveFocus()
      expect(screen.getByRole('button', { name: 'Subtitles' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('searchbox')).toHaveValue('')
      await act(async () => {
        window.history.replaceState(null, '', '/options.html')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      expect(chrome.permissions.request).not.toHaveBeenCalled()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it.each(['escape', 'outside'] as const)('dismisses the activation popover with %s without enabling subtitles', async method => {
    await recordEligibleUpgrade()
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const guide = await screen.findByRole('dialog', { name: 'Sentence jumps and replay' })
      await waitFor(() => expect(document.getElementById('subtitle-navigation')).toHaveFocus())
      if (method === 'escape') fireEvent.keyDown(document.getElementById('subtitle-navigation')!, { key: 'Escape', code: 'Escape' })
      else {
        fireEvent.pointerDown(document.body, { button: 0, pointerType: 'mouse' })
        fireEvent.click(document.body)
      }
      await waitFor(() => expect(guide).not.toBeInTheDocument())
      expect(chrome.permissions.request).not.toHaveBeenCalled()
      expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
      expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
      await act(async () => { await saveSettings({ ...(await getSettings()), theme: 'dark' }) })
      expect(screen.queryByRole('dialog', { name: 'Sentence jumps and replay' })).not.toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it.each([false, true])('handles the global prerequisite and existing activation on arrival (%s)', async subtitleEnabled => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.enabled = false
    settings.subtitleNavigation.enabled = subtitleEnabled
    await saveSettings(settings)
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
      expect(toggle).toBeDisabled()
      expect(screen.getByText(SUBTITLE_NAVIGATION_COPY.en.requiresEnabled)).toBeInTheDocument()
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      if (!subtitleEnabled) expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.permission)).toBeInTheDocument()
      else expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.permission)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('switch', { name: 'Enable extension' }))
      await waitFor(() => expect(toggle).not.toBeDisabled())
      if (!subtitleEnabled) expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      else expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      expect(chrome.permissions.request).not.toHaveBeenCalled()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })
  const subtitleOverlap = () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.playback.enabled = false
    settings.subtitleNavigation.bindings.next.key = { ...settings.subtitleNavigation.bindings.playback.key }
    return settings
  }

  it('moves focus to the conflict owner in the same table and leaves the keys assigned', async () => {
    const saved = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    const popover = await screen.findByRole('dialog')
    fireEvent.click(within(popover).getByRole('link', { name: 'Next subtitle' }))

    const owner = screen.getByRole('switch', { name: 'Next subtitle Enabled' }).closest('tr')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(owner).toHaveFocus()
    expect(await getSettings()).toEqual(saved)
  })

  it('allows reusing a disabled subtitle key and asks before enabling its former owner', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.playback.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Next subtitle' }))
    const editor = screen.getByRole('dialog')
    fireEvent.keyDown(editor, { code: 'KeyW', key: 'w' })
    expect(within(editor).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.next.key?.code).toBe('KeyW'))
    const saved = await getSettings()
    const toggle = screen.getByRole('switch', { name: 'Play / pause Enabled' })
    fireEvent.click(toggle)
    const popover = await screen.findByRole('dialog', { name: 'W is used by Next subtitle' })
    expect(popover).toHaveTextContent('This will disable Next subtitle.')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(await getSettings()).toEqual(saved)
    fireEvent.keyDown(popover, { key: 'Escape', code: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await getSettings()).toEqual(saved)
    expect(toggle).toHaveFocus()
  })

  it.each(['subtitleNavigation', 'general'] as const)('transfers a conflicting %s key only after an explicit choice', async group => {
    const settings = subtitleOverlap()
    settings.bindings.mute = { enabled: false, key: { ...settings.bindings.skipIntro.key } }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory(group === 'general' ? 'Volume and audio' : 'Sentence jumps and replay')
    const action = group === 'subtitleNavigation' ? 'Play / pause' : 'Mute'
    const other = group === 'subtitleNavigation' ? 'Next subtitle' : 'Skip intro'
    const toggle = await screen.findByRole('switch', { name: `${action} Enabled` })
    vi.mocked(chrome.storage.sync.set).mockClear()
    fireEvent.click(toggle)
    const popover = await screen.findByRole('dialog')
    expect(popover).toHaveTextContent(`This will disable ${other}.`)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    fireEvent.click(within(popover).getByRole('button', { name: 'Use this key' }))
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    const next = await getSettings()
    if (group === 'subtitleNavigation') {
      expect(next.subtitleNavigation.bindings.playback).toEqual({ ...saved.subtitleNavigation.bindings.playback, enabled: true })
      expect(next.subtitleNavigation.bindings.next).toEqual({ ...saved.subtitleNavigation.bindings.next, enabled: false })
      expect(next.bindings).toEqual(saved.bindings)
    } else {
      expect(next.bindings.mute).toEqual({ ...saved.bindings.mute, enabled: true })
      expect(next.bindings.skipIntro).toEqual({ ...saved.bindings.skipIntro, enabled: false })
      expect(next.subtitleNavigation).toEqual(saved.subtitleNavigation)
    }
    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes the key from the popover without disabling its current owner', async () => {
    const settings = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    const popover = await screen.findByRole('dialog')
    fireEvent.click(within(popover).getByRole('button', { name: 'Change key' }))
    const editor = await screen.findByRole('dialog', { name: 'Record shortcut' })
    expect(within(editor).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.keyDown(editor, { key: 'q', code: 'KeyQ' })
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.playback).toMatchObject({ enabled: true, key: { code: 'KeyQ' } }))
    expect((await getSettings()).subtitleNavigation.bindings.next).toEqual(settings.subtitleNavigation.bindings.next)
  })

  it('dismisses a conflict without changes when clicking outside', async () => {
    const saved = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    await screen.findByRole('dialog')
    fireEvent.pointerDown(document.body, { button: 0, pointerType: 'mouse' })
    fireEvent.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await getSettings()).toEqual(saved)
  })

  it('returns focus to the row after cancelling key editing from a conflict', async () => {
    const saved = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Play / pause Enabled' })
    fireEvent.click(toggle)
    const popover = await screen.findByRole('dialog')
    fireEvent.click(within(popover).getByRole('button', { name: 'Change key' }))
    const editor = await screen.findByRole('dialog', { name: 'Record shortcut' })
    fireEvent.click(within(editor).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(toggle).toHaveFocus())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await getSettings()).toEqual(saved)
  })

  it('invalidates a pending conflict when settings change in another view', async () => {
    const settings = subtitleOverlap()
    await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    await screen.findByRole('dialog')
    settings.subtitleNavigation.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    settings.subtitleNavigation.enabled = true
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Play / pause Enabled' })).toHaveAttribute('aria-checked', 'false')
  })

  it('checks conflicts before a single-row reset changes the key or enables the row', async () => {
    const settings = subtitleOverlap()
    settings.subtitleNavigation.bindings.playback = { enabled: true, key: { ...settings.subtitleNavigation.bindings.playback.key, code: 'KeyQ', key: 'q' } }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    fireEvent.click(await screen.findByRole('button', { name: 'Reset Play / pause' }))
    await confirmReset()
    const popover = await screen.findByRole('dialog', { name: 'W is used by Next subtitle' })
    expect(await getSettings()).toEqual(saved)
    fireEvent.click(within(popover).getByRole('button', { name: 'Use this key' }))
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.playback.key?.code).toBe('KeyW'))
    expect((await getSettings()).subtitleNavigation.bindings.next.enabled).toBe(false)
  })

  it.each([false, true])('resets replay to unassigned and disabled from enabled=%s without taking over another shortcut', async enabled => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = {
      enabled,
      key: { code: 'KeyQ', key: 'q', ctrl: false, alt: false, shift: false, meta: false },
    }
    settings.subtitleNavigation.bindings.next.key = { ...settings.bindings.skipIntro.key }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')

    fireEvent.click(await screen.findByRole('button', { name: 'Reset Replay current subtitle' }))
    await confirmReset()

    await waitFor(async () => expect(await getSettings()).toEqual({
      ...saved,
      subtitleNavigation: {
        ...saved.subtitleNavigation,
        bindings: { ...saved.subtitleNavigation.bindings, replay: DEFAULT_SETTINGS.subtitleNavigation.bindings.replay },
      },
    }))
    const row = screen.getByRole('row', { name: /Replay current subtitle/ })
    expect(within(row).getByText('Not set')).toBeInTheDocument()
    expect(within(row).getByRole('switch', { name: 'Replay current subtitle Enabled' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each(['Chrome/140.0', 'Chrome/140.0 Edg/140.0', 'Firefox/156.0'])('requests subtitle access directly from the switch click in %s', async browser => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 ${browser}`)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    // Assert before yielding: Firefox requires the request in this user gesture.
    expect(chrome.permissions.request).toHaveBeenCalledExactlyOnceWith({ origins: [
      '*://*.netflix.com/*', 'https://*.nflxvideo.net/*',
    ] })
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(false))
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
  })

  it('keeps subtitle settings unchanged after denying access and allows another attempt', async () => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.subtitleNavigation.bindings.next.enabled = false
    custom.subtitleNavigation.bindings.previous.key.code = 'KeyZ'
    const saved = await saveSettings(custom)
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => Promise.resolve(false) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent('Subtitle navigation stays off')
    expect(await getSettings()).toEqual(saved)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation).toEqual({ ...saved.subtitleNavigation, enabled: true }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('recovers from a failed permission request without enabling subtitle navigation', async () => {
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => Promise.reject(new Error('API unavailable')) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not request website access')
    expect(toggle).not.toBeDisabled()
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
  })

  it('keeps subtitle approval pending through unrelated settings updates while the extension stays enabled', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    await act(async () => { await saveSettings({ ...(await getSettings()), theme: 'dark' }) })
    expect(toggle).toBeDisabled()
    expect(toggle).toHaveAttribute('aria-busy', 'true')
    await act(async () => approve(true))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(true)
    expect((await getSettings()).theme).toBe('dark')
    expect(toggle).not.toBeDisabled()
  })

  it('does not enable subtitles from a stale approval after the global switch was turned off and on', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    const global = screen.getByRole('switch', { name: 'Enable extension' })
    fireEvent.click(toggle)
    expect(toggle).toBeDisabled()
    fireEvent.click(toggle)
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    fireEvent.click(global)
    fireEvent.click(global)
    await act(async () => approve(true))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    expect(toggle).not.toBeDisabled()
  })

  it('invalidates subtitle approval when another view turns the global switch off and on', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    const settings = await getSettings()
    await act(async () => {
      await saveSettings({ ...settings, enabled: false })
      await saveSettings({ ...settings, enabled: true })
    })
    await act(async () => approve(true))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    expect(toggle).not.toBeDisabled()
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
  })

  it.each([true, false])('keeps a new permission attempt pending after a stale external approval returns %s', async granted => {
    let approveOld!: (granted: boolean) => void
    let approveNew!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request)
      .mockImplementationOnce(() => new Promise<boolean>(resolve => { approveOld = resolve }) as never)
      .mockImplementationOnce(() => new Promise<boolean>(resolve => { approveNew = resolve }) as never)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    const settings = await getSettings()
    await act(async () => {
      await saveSettings({ ...settings, enabled: false })
      await saveSettings({ ...settings, enabled: true })
    })
    fireEvent.click(toggle)
    expect(chrome.permissions.request).toHaveBeenCalledTimes(2)
    await act(async () => approveOld(granted))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
    expect(toggle).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => approveNew(true))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(true)
    expect(toggle).not.toBeDisabled()
  })

  it('ignores a permission response after closing the options page', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    const { unmount } = render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    unmount()
    await act(async () => approve(true))
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
  })

  it('persists the subtitle navigation master switch and independent row bindings', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    await waitFor(() => expect(toggle).not.toBeDisabled())
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    const card = screen.getByRole('group', { name: 'Sentence jumps and replay' })
    expect(within(card).getAllByRole('switch')).toHaveLength(5)
    expect(card).toHaveTextContent('Previous subtitle')
    expect(card).toHaveTextContent('Replay current subtitle')
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(true))
    const nextToggle = within(card).getByRole('switch', { name: 'Next subtitle Enabled' })
    fireEvent.click(nextToggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.next.enabled).toBe(false))
    fireEvent.click(within(card).getByRole('button', { name: 'Edit Next subtitle' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { code: 'KeyN', key: 'n' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.next.key?.code).toBe('KeyN'))
    fireEvent.click(within(card).getByRole('button', { name: 'Reset Next subtitle' }))
    await confirmReset()
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.bindings.next.key?.code).toBe('KeyD'))
    expect((await getSettings()).subtitleNavigation.bindings.next.enabled).toBe(true)
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitleNavigation.enabled).toBe(false))
  })

  it.each([false, true])('resets subtitle bindings while preserving the master switch (%s) and other settings', async enabled => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.enabled = true
    custom.speed.step = 0.5
    custom.bindings.playPause.enabled = false
    custom.subtitleNavigation.enabled = enabled
    custom.subtitleNavigation.bindings.previous.key = { code: 'KeyZ', key: 'z', ctrl: false, alt: false, shift: false, meta: false }
    custom.subtitleNavigation.bindings.next.enabled = false
    custom.subtitleNavigation.bindings.replay.enabled = false
    custom.subtitleNavigation.bindings.playback.key = { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false }
    const saved = await saveSettings(custom)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const reset = await screen.findByRole('button', { name: 'Reset sentence shortcuts' })
    await waitFor(() => expect(reset).not.toBeDisabled())
    fireEvent.click(reset)
    await confirmReset()
    await waitFor(async () => expect(await getSettings()).toEqual({
      ...saved,
      subtitleNavigation: { ...saved.subtitleNavigation, bindings: DEFAULT_SETTINGS.subtitleNavigation.bindings },
    }))
  })

  it.each(['inline', 'activation guide'] as const)('links the disabled %s to the global switch without enabling it', async surface => {
    const saved = await saveSettings({ ...structuredClone(DEFAULT_SETTINGS), enabled: false })
    window.history.replaceState(null, '', surface === 'inline' ? '/options.html' : '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
      const link = await screen.findByRole('link', { name: SUBTITLE_NAVIGATION_COPY.en.goToGeneralSettings })
      const globalSwitch = screen.getByRole('switch', { name: 'Enable extension' })
      expect(link).toHaveAttribute('href', '#enable-shortcut-override')
      fireEvent.click(link)
      await waitFor(() => expect(globalSwitch).toHaveFocus())
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ block: 'center' })
      expect(screen.queryByRole('dialog', { name: 'Sentence jumps and replay' })).not.toBeInTheDocument()
      expect(await getSettings()).toEqual(saved)
      expect(chrome.permissions.request).not.toHaveBeenCalled()
      fireEvent.click(globalSwitch)
      await waitFor(() => expect(screen.queryByRole('link', { name: SUBTITLE_NAVIGATION_COPY.en.goToGeneralSettings })).not.toBeInTheDocument())
      expect((await getSettings()).enabled).toBe(true)
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it.each([false, true])('disables subtitle controls under the global switch and preserves their settings (%s)', async enabled => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.subtitleNavigation.enabled = enabled
    custom.subtitleNavigation.bindings.previous.enabled = false
    custom.subtitleNavigation.bindings.next.key = { code: 'KeyN', key: 'n', ctrl: false, alt: false, shift: false, meta: false }
    const saved = await saveSettings(custom)
    render(<OptionsApp />)
    await selectShortcutCategory('Sentence jumps and replay')
    const globalSwitch = await screen.findByRole('switch', { name: 'Enable extension' })
    await waitFor(() => expect(globalSwitch).not.toBeDisabled())
    const card = screen.getByRole('group', { name: 'Sentence jumps and replay' })
    const master = within(card).getByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(globalSwitch)
    await waitFor(() => expect(master).toBeDisabled())
    expect(master).toHaveAttribute('aria-checked', String(enabled))
    for (const toggle of within(card).getAllByRole('switch')) expect(toggle).toBeDisabled()
    for (const button of within(card).getAllByRole('button').filter(button => !button.hasAttribute('data-feature-manager-trigger'))) expect(button).toBeDisabled()
    expect(within(card).getByText(SUBTITLE_NAVIGATION_COPY.en.requiresEnabled)).toBeVisible()
    expect((await getSettings()).subtitleNavigation).toEqual(saved.subtitleNavigation)
    fireEvent.click(globalSwitch)
    await waitFor(() => expect(master).not.toBeDisabled())
    expect(master).toHaveAttribute('aria-checked', String(enabled))
    expect(within(card).getByRole('button', { name: 'Edit Next subtitle' })).not.toBeDisabled()
    expect((await getSettings()).subtitleNavigation).toEqual(saved.subtitleNavigation)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps the global switch at the top of the sidebar while grouping appearance controls on their page', async () => {
    render(<OptionsApp />)
    expect(await screen.findByRole('searchbox')).not.toHaveFocus()
    await selectShortcutCategory('General settings')
    const title = within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'General settings' })
    const card = title.closest('[data-slot="card"]')
    expect(card).toContainElement(screen.getByRole('combobox', { name: 'Language' }))
    expect(card).toContainElement(screen.getByRole('combobox', { name: 'Interface style' }))
    expect(card).toContainElement(screen.getByRole('combobox', { name: 'Theme' }))
    const enabled = screen.getByRole('switch', { name: 'Enable extension' })
    const sidebarHeader = enabled.closest('[data-slot="sidebar-header"]')
    expect(sidebarHeader).not.toBeNull()
    expect(card).not.toContainElement(enabled)
    const header = screen.getByRole('heading', { name: 'Shortcut Override for Netflix' }).closest('header')
    expect(header).not.toContainElement(enabled)
    for (const action of [
      screen.getByRole('link', { name: 'Open GitHub repository' }),
      screen.getByRole('link', { name: 'Rate this extension in the extension store' }),
      screen.getByRole('combobox', { name: 'Other products' }),
    ]) {
      expect(action.textContent).toBe('')
      expect(action.querySelector('svg')).not.toBeNull()
    }
    expect(screen.queryByRole('navigation', { name: 'General settings' })).not.toBeInTheDocument()
    fireEvent.click(enabled)
    await waitFor(async () => expect((await getSettings()).enabled).toBe(false))
    expect(screen.getByRole('button', { name: 'Enable extension info' })).toBeInTheDocument()
    await selectShortcutCategory('Playback')
    expect(screen.getByRole('button', { name: 'Reset general shortcuts' }).closest('[data-slot="card"]')).not.toContainElement(enabled)
  })

  it('shows inline speed range settings and nests hold settings below expanded Play / Pause', async () => {
    render(<OptionsApp />)
    expect(await screen.findByText('Shortcut Override for Netflix')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute('href', EXTERNAL_LINKS.githubRepository)
    expect(screen.getByRole('link', { name: 'Open a new GitHub issue' })).toHaveAttribute('href', EXTERNAL_LINKS.githubNewIssue)
    expect(screen.getByRole('link', { name: 'Rate this extension in the extension store' })).toHaveAttribute('href', EXTERNAL_LINKS.shortcutOverrideChromeWebStore)
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    await selectShortcutCategory('General settings')
    expect(within(screen.getByRole('navigation', { name: 'Settings' })).getByRole('link', { name: 'General settings' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Auto')
    focusAsKeyboard(screen.getByRole('button', { name: 'Enable extension info' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('When off, all extension shortcuts are disabled.')
    await selectShortcutCategory('Playback')
    focusAsKeyboard(screen.getByRole('button', { name: 'Picture-in-Picture info' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Netflix built-in shortcuts do not work in Picture-in-Picture. Use the shortcuts enabled on this page.')
    await selectShortcutCategory('Playback speed')
    const table = screen.getByRole('table', { name: 'Playback speed' })
    expect(within(table).queryByRole('spinbutton')).not.toBeInTheDocument()
    const range = screen.getByRole('group', { name: 'Range and step' })
    expect(within(range).getAllByRole('spinbutton')).toHaveLength(3)
    expect(within(range).getByRole('spinbutton', { name: 'Lowest speed' })).toHaveValue(0.25)
    expect(within(range).getByRole('spinbutton', { name: 'Highest speed' })).toHaveValue(3)
    expect(within(range).getByRole('spinbutton', { name: 'Speed adjustment amount' })).toHaveValue(0.25)
    expect(within(range).queryByRole('button', { name: 'Edit Range and step' })).not.toBeInTheDocument()
    expect(range).toHaveAttribute('data-slot', 'card')
    expect(range.parentElement).toBe(table.closest('[data-slot="card"]')!.parentElement)
    expect(screen.queryByText('Playback speed', { selector: '[data-slot="card-title"]' })).not.toBeInTheDocument()
    expect(screen.queryByText('Play / Pause hold speed', { selector: '[data-slot="card-title"]' })).not.toBeInTheDocument()
    expect(range).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Range and step' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Set preferred speed' }).closest('tr')).toHaveTextContent('1.5×')
    await selectShortcutCategory('Playback')
    expect(screen.getByRole('button', { name: 'Play / Pause' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('button', { name: 'Play / Pause hold speed' })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    await selectShortcutCategory('Seeking and navigation')
    expect(screen.getByRole('button', { name: 'Reset seek interval' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Forward / Rewind 10 seconds' })).toBeInTheDocument()
    await selectShortcutCategory('Subtitle language and size')
    expect(within(screen.getByText('Toggle subtitles').closest('tr')!).getByText('C')).toBeInTheDocument()

    await selectSpeedSettings()
    expect(screen.getByLabelText('Speed adjustment amount')).toHaveAttribute('step', '0.05')
    expect(screen.getByLabelText('Speed adjustment amount')).toHaveValue(0.25)
    expect(screen.queryByRole('spinbutton', { name: 'Preferred speed' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Lowest speed')).toBeVisible()
    expect(screen.getByLabelText('Lowest speed')).toHaveValue(0.25)
    expect(screen.getByLabelText('Highest speed')).toHaveValue(3)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const preferred = await openPreferredSpeed()
    expect(within(preferred).getByLabelText('Speed')).toHaveValue(1.5)
    fireEvent.click(within(preferred).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const holdControls = await openHoldControls()
    const holdTable = screen.getByRole('table', { name: 'Play / Pause hold speed' })
    expect(within(holdTable).getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Hold speed', 'Hint', 'Enabled', 'Action'])
    expect(holdTable.closest('tr')!.previousElementSibling).toHaveTextContent('Play / Pause')
    expect(holdControls).toHaveTextContent('2×')
    expect(within(holdControls).getAllByRole('cell')).toHaveLength(4)
    expect(within(holdControls).getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })).toBeChecked()
    expect(within(holdControls).getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Backup and restore' }).closest('[data-slot="sidebar"]')).not.toBeNull()
    const holdInput = await openHoldSettings()
    expect(holdInput).toHaveFocus()
    expect(holdInput).toHaveValue(2)
    expect(holdInput).toHaveAttribute('min', '0.25')
    expect(holdInput).toHaveAttribute('step', '0.05')
    focusAsKeyboard(screen.getByRole('button', { name: 'Hold speed info' }))
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Hold the configured Play / Pause shortcut to temporarily use this speed.')
    expect(within(screen.getByRole('dialog')).queryByRole('switch')).not.toBeInTheDocument()
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

    const playPauseRow = (await screen.findByText('Play / Pause')).closest('tr')
    expect(within(playPauseRow!).getByText('Replaces Netflix: Space')).toBeInTheDocument()
    await selectShortcutCategory('Subtitle language and size')
    const subtitleRow = screen.getByText('Toggle subtitles').closest('tr')
    expect(playPauseRow).not.toBeNull()
    expect(subtitleRow).not.toBeNull()
    expect(
      within(subtitleRow as HTMLElement).queryByText('Replaces Netflix: C')
    ).not.toBeInTheDocument()

    await selectShortcutCategory('Playback')
    fireEvent.click(screen.getByRole('button', { name: 'Edit Play / Pause' }))
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Saving will disable the Netflix keys: Space'
    )
  })

  it('shows Picture-in-Picture as off and disabled on Firefox', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')

    const pipSwitch = await screen.findByRole('switch', { name: 'Picture-in-Picture Enabled' })
    expect(pipSwitch).toBeDisabled()
    expect(pipSwitch).toHaveAttribute('aria-checked', 'false')

    const pictureInPictureInfo = screen.getByRole('button', { name: 'Picture-in-Picture info' })
    focusAsKeyboard(pictureInPictureInfo)
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
      key: 'p',
    })

    expect(within(dialog).queryByText('No conflict detected.')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save' })).not.toBeDisabled()
  })

  it.each([0.35, 5])('persists speed adjustment amount %sx', async step => {
    render(<OptionsApp />)
    await selectSpeedSettings()

    const stepInput = await screen.findByLabelText('Speed adjustment amount')
    expect(stepInput).toHaveAttribute('max', '5')
    fireEvent.change(stepInput, { target: { value: String(step) } })
    fireEvent.blur(stepInput)

    await waitFor(async () => {
      expect(stepInput).toHaveValue(step)
      expect((await getSettings()).speed.step).toBe(step)
    })
  })

  it('persists numeric changes when dragging an input label', async () => {
    render(<OptionsApp />)
    await selectSpeedSettings()

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

  it.each([3.35, 5])('saves preferred speed %sx and its shortcut together, independently of the step range', async speed => {
    render(<OptionsApp />)
    const dialog = await openPreferredSpeed()
    expect(dialog).toHaveAttribute('data-size', 'standard')
    expect(within(dialog).queryByText('Key', { selector: 'label' })).not.toBeInTheDocument()
    const input = within(dialog).getByLabelText('Speed')
    const keyField = within(dialog).getByRole('group', { name: 'Key' })
    const originalKey = keyField.textContent
    expect(input).toHaveFocus()
    expect(input).toHaveAccessibleDescription('0.25–5 ×')
    expect(within(dialog).queryByRole('button', { name: 'Speed info' })).not.toBeInTheDocument()
    expect(input).toHaveAttribute('max', '5')
    fireEvent.change(input, { target: { value: String(speed) } })
    fireEvent.keyDown(input, { code: 'Digit3', key: '3' })
    expect(keyField.textContent).toBe(originalKey)
    fireEvent.keyDown(keyField, { code: 'KeyQ', key: 'q' })
    fireEvent.blur(input)
    expect((await getSettings()).speed.preferred).toBe(1.5)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.speed).toEqual({ ...DEFAULT_SETTINGS.speed, preferred: speed })
      expect(saved.bindings.setPreferredSpeed).toMatchObject({ key: { code: 'KeyQ' }, enabled: true })
    })
    expect(screen.getByRole('button', { name: 'Edit Set preferred speed' }).closest('tr')).toHaveTextContent(`${speed}×`)
  })

  it('restores and clamps preferred-speed drafts without saving until confirmed', async () => {
    render(<OptionsApp />)
    const dialog = await openPreferredSpeed()
    const input = within(dialog).getByLabelText('Speed')
    fireEvent.change(input, { target: { value: '' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.blur(input)
    expect(input).toHaveValue(1.5)
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.blur(input)
    expect(input).toHaveValue(5)
    fireEvent.change(input, { target: { value: '0.1' } })
    fireEvent.blur(input)
    expect(input).toHaveValue(0.25)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).speed.preferred).toBe(1.5)
  })

  it('restores both preferred-speed drafts and blocks conflicting shortcut assignments', async () => {
    render(<OptionsApp />)
    const dialog = await openPreferredSpeed()
    const input = within(dialog).getByLabelText('Speed')
    const keyField = within(dialog).getByRole('group', { name: 'Key' })
    const originalKey = keyField.textContent
    fireEvent.change(input, { target: { value: '2.5' } })
    fireEvent.keyDown(keyField, { code: 'KeyC', key: 'c' })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Toggle subtitles')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo edits' }))
    expect(input).toHaveValue(1.5)
    expect(keyField.textContent).toBe(originalKey)
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.change(input, { target: { value: '2' } })
    fireEvent.keyDown(keyField, { code: 'KeyQ', key: 'q' })
    fireEvent.keyDown(keyField, { code: 'Tab', key: 'Tab' })
    expect(keyField).toHaveTextContent('Q')
    fireEvent.keyDown(keyField, { code: 'Escape', key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).speed.preferred).toBe(1.5)
    expect((await getSettings()).bindings.setPreferredSpeed).toEqual(DEFAULT_SETTINGS.bindings.setPreferredSpeed)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Set preferred speed' })).toHaveFocus())
  })

  it('keeps a disabled preferred shortcut disabled when its speed is edited', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, bindings: { ...DEFAULT_SETTINGS.bindings,
      setPreferredSpeed: { ...DEFAULT_SETTINGS.bindings.setPreferredSpeed, enabled: false } } })
    render(<OptionsApp />)
    const dialog = await openPreferredSpeed()
    fireEvent.change(within(dialog).getByLabelText('Speed'), { target: { value: '2.5' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.speed.preferred).toBe(2.5)
      expect(saved.bindings.setPreferredSpeed.enabled).toBe(false)
    })
  })

  it('does not overwrite a preferred speed changed elsewhere while its editor is open', async () => {
    render(<OptionsApp />)
    const dialog = await openPreferredSpeed()
    fireEvent.change(within(dialog).getByLabelText('Speed'), { target: { value: '2.5' } })
    await act(async () => { await saveSettings({ ...DEFAULT_SETTINGS, speed: { ...DEFAULT_SETTINGS.speed, preferred: 3 } }) })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Settings changed. Reopen this editor.')
    expect(within(dialog).getByLabelText('Speed')).toHaveValue(2.5)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const reopened = await openPreferredSpeed()
    expect(within(reopened).getByLabelText('Speed')).toHaveValue(3)
    expect(within(reopened).getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it.each([0.5, 5])('saves hold speed %sx and restores focus to Edit', async speed => {
    render(<OptionsApp />)
    const holdInput = await openHoldSettings()
    expect(holdInput).toHaveAttribute('max', '5')
    fireEvent.change(holdInput, { target: { value: String(speed) } })
    fireEvent.blur(holdInput)
    expect((await getSettings()).holdSpeed.speed).toBe(2)
    await saveHoldSettings()
    await waitFor(async () => expect((await getSettings()).holdSpeed.speed).toBe(speed))
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toHaveTextContent(`${speed}×`)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Play / Pause hold speed' })).toHaveFocus())
  })

  it.each([61, 300])('persists a %i-second seek interval on modal Save', async seconds => {
    render(<OptionsApp />)
    await setSeekInterval(seconds)
    expect((await getSettings()).seek.seconds).toBe(seconds)
    expect(screen.getByRole('row', { name: `Forward / Rewind ${seconds} seconds` })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: `Edit Forward / Rewind ${seconds} seconds` }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    expect(within(dialog).getByLabelText('Seconds')).toHaveValue(seconds)
  })

  it('persists language changes from the combobox', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')

    const localeCombobox = await screen.findByRole('combobox', { name: 'Language' })
    fireEvent.click(localeCombobox)
    fireEvent.click(await screen.findByText('繁中'))

    await waitFor(() => expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中'))
  })

  it('saves the hold hint from its inline settings independently of the speed draft and restores it after reopening', async () => {
    const view = render(<OptionsApp />)
    const table = await openHoldControls()
    fireEvent.click(within(table).getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' }))
    await waitFor(async () => expect((await getSettings()).holdSpeed.showHint).toBe(false))
    const holdInput = await openHoldSettings()
    fireEvent.change(holdInput, { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).holdSpeed).toEqual({ ...DEFAULT_SETTINGS.holdSpeed, showHint: false })
    view.unmount()
    render(<OptionsApp />)
    expect(within(await openHoldControls()).getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' })).not.toBeChecked()
    const reopened = await openHoldSettings()
    expect(reopened).toHaveValue(2)
    fireEvent.change(reopened, { target: { value: '3' } })
    // A hint change in another view must survive saving this speed-only draft.
    await act(async () => { await saveSettings({ ...DEFAULT_SETTINGS, holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, showHint: true } }) })
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    await saveHoldSettings()
    await waitFor(async () => expect((await getSettings()).holdSpeed).toEqual({ enabled: true, speed: 3, showHint: true }))
  })

  it('disables the inline hint with hold speed or its parent shortcut without clearing the hint preference', async () => {
    render(<OptionsApp />)
    const table = await openHoldControls()
    const hint = within(table).getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' })
    const enabled = within(table).getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })
    fireEvent.click(enabled)
    expect(hint).toBeDisabled()
    expect(hint).toBeChecked()
    fireEvent.click(enabled)
    expect(hint).toBeEnabled()
    fireEvent.click(hint)
    await waitFor(async () => expect((await getSettings()).holdSpeed).toEqual({ enabled: true, speed: 2, showHint: false }))
    fireEvent.click(screen.getByRole('switch', { name: 'Play / Pause Enabled' }))
    expect(hint).toBeDisabled()
    expect(enabled).toBeDisabled()
    fireEvent.click(screen.getByRole('switch', { name: 'Play / Pause Enabled' }))
    await waitFor(() => expect(hint).toBeEnabled())
    expect(hint).not.toBeChecked()
  })

  it('persists explicit theme choices and restores the automatic system theme', async () => {
    const view = render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    const theme = await screen.findByRole('combobox', { name: 'Theme' })
    expect(theme).toHaveTextContent('Auto')
    expect(document.documentElement).not.toHaveClass('dark')
    expect((await getSettings()).theme).toBe('auto')
    fireEvent.click(screen.getByRole('switch', { name: 'Enable extension' }))
    await waitFor(async () => expect((await getSettings()).enabled).toBe(false))
    expect((await getSettings()).theme).toBe('auto')
    fireEvent.click(theme)
    fireEvent.click(await screen.findByRole('option', { name: 'Light' }))
    await waitFor(async () => expect((await getSettings()).theme).toBe('light'))
    fireEvent.click(theme)
    fireEvent.click(await screen.findByRole('option', { name: 'Dark' }))

    await waitFor(async () => {
      expect((await getSettings()).theme).toBe('dark')
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
      expect(document.documentElement).toHaveClass('dark')
    })
    view.unmount()
    const restored = render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    expect(await screen.findByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
    expect(document.documentElement).toHaveClass('dark')
    fireEvent.click(screen.getByRole('combobox', { name: 'Theme' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Auto' }))
    await waitFor(async () => {
      expect((await getSettings()).theme).toBe('auto')
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Auto')
      expect(document.documentElement).not.toHaveClass('dark')
    })
    restored.unmount()
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    expect(await screen.findByRole('combobox', { name: 'Theme' })).toHaveTextContent('Auto')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it.each([
    ['zh-TW', 'zh-TW', '一般設定', '語言', '自動'],
    ['es-MX', 'es', 'Configuración general', 'Idioma', 'Automático'],
    ['pt-BR', 'pt-BR', 'Configurações gerais', 'Idioma', 'Automático'],
    ['fr-CA', 'fr', 'Paramètres généraux', 'Langue', 'Automatique'],
    ['de-CH', 'de', 'Allgemeine Einstellungen', 'Sprache', 'Automatisch'],
    ['id-ID', 'id', 'Pengaturan umum', 'Bahasa', 'Otomatis'],
  ])('uses the detected %s browser language when no settings exist yet', async (browserLanguage, locale, general, language, automatic) => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue(browserLanguage)
    render(<OptionsApp />)
    await selectShortcutCategory(general)

    expect(await screen.findByRole('combobox', { name: language })).toHaveTextContent(automatic)
    expect(document.documentElement).toHaveAttribute('lang', locale)
  })

  it('persists a manually chosen locale and searches settings in both new languages', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('General settings')
    fireEvent.click(await screen.findByRole('combobox', { name: 'Language' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Português (BR)' }))
    await waitFor(async () => {
      expect((await getSettings()).locale).toBe('pt-BR')
      expect(document.documentElement).toHaveAttribute('lang', 'pt-BR')
    })

    const search = screen.getByRole('searchbox')
    for (const query of [
      'configuracion general', 'configuracoes gerais', 'parametres generaux',
      'allgemeine einstellungen', 'pengaturan umum',
    ]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('switch', { name: 'Ativar extensão' })).toBeVisible()
    }
  })

  it('syncs external settings changes while open', async () => {
    render(<OptionsApp />)

    await selectShortcutCategory('General settings')
    expect(await screen.findByRole('combobox', { name: 'Language' })).toHaveTextContent('Auto')

    await selectSpeedSettings()
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
      expect(screen.getByLabelText('倍速調整幅度')).toHaveValue(0.5)
    })
    expect(screen.getByRole('group', { name: '範圍與調整幅度' })).toBeVisible()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await selectShortcutCategory('一般設定')
    expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    expect(screen.getByRole('switch', { name: '啟用擴充功能' })).not.toBeChecked()
    await selectShortcutCategory('進度與跳轉')
    expect(screen.getByRole('row', { name: '前進／後退 20 秒' })).toBeVisible()
  })

  it('finds restore defaults across languages and persists all defaults after confirmation', async () => {
    const custom: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    custom.enabled = false
    custom.locale = 'zh-TW'
    custom.theme = 'dark'
    custom.uiStyle = 'markdown'
    custom.speed = { min: 0.5, max: 4, step: 0.5, preferred: 2.5 }
    custom.seek.seconds = 20
    custom.holdSpeed.speed = 3
    custom.subtitleNavigation.enabled = true
    custom.subtitleFavorites = [{ language: 'ja' }]
    custom.audioFavorites = [{ language: 'en', audioDescription: false }]
    custom.hiddenFeatures = ['group:preferredSpeed']
    custom.autoSkip = { intro: true, recap: true }
    custom.autoNextEpisode = true
    custom.hidePauseOverlay = true
    custom.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 3 }]
    custom.bindings['preferred-speed:custom'] = { enabled: false, key: null }
    custom.bindings.mute.enabled = false
    const saved = await saveSettings(custom)
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    fireEvent.change(search, { target: { value: 'Restore defaults' } })
    fireEvent.click(await screen.findByRole('button', { name: '還原預設值' }))
    let dialog = await screen.findByRole('dialog', { name: '確定還原所有預設值？' })
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await getSettings()).toEqual(saved)
    fireEvent.change(search, { target: { value: '' } })
    await selectShortcutCategory('備份與還原')
    fireEvent.click(screen.getByRole('button', { name: '還原預設值' }))
    dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: '還原預設值' }))

    expect(await screen.findByText(getCopy('en').resetDefaultsSuccess)).toBeVisible()
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(document.documentElement).toHaveAttribute('data-ui-style', DEFAULT_SETTINGS.uiStyle)
    expect(screen.getByRole('switch', { name: 'Enable extension' })).toBeChecked()
    await selectShortcutCategory('Playback speed')
    expect(screen.getByLabelText('Highest speed')).toHaveValue(DEFAULT_SETTINGS.speed.max)
    expect(screen.getByLabelText(getCopy('en').step)).toHaveValue(DEFAULT_SETTINGS.speed.step)
    await selectShortcutCategory('Seeking and navigation')
    expect(screen.getByRole('row', { name: 'Forward / Rewind 10 seconds' })).toBeVisible()
  })

  it('imports a complete backup and synchronizes all form drafts', async () => {
    render(<OptionsApp />)
    await selectShortcutCategory('Backup and restore')
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

    expect(await screen.findByText('設定已成功匯入。')).toHaveAttribute('role', 'status')
    await selectShortcutCategory('一般設定')
    expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    expect(screen.getByRole('combobox', { name: '主題' })).toHaveTextContent('深色')
    expect(screen.getByRole('switch', { name: '啟用擴充功能' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
    await selectShortcutCategory('播放速度')
    expect(screen.getByRole('button', { name: '編輯 套用常用倍速' }).closest('tr')).toHaveTextContent('2.5×')
    expect(screen.getByLabelText('最低倍速')).toHaveValue(0.5)
    expect(screen.getByLabelText('最高倍速')).toHaveValue(4)
    expect(screen.getByLabelText('倍速調整幅度')).toHaveValue(0.5)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await selectShortcutCategory('進度與跳轉')
    expect(screen.getByRole('row', { name: '前進／後退 20 秒' })).toBeVisible()
    await selectShortcutCategory('播放')
    expect(screen.getByRole('row', { name: '長按播放 / 暫停鍵倍速' })).toHaveTextContent('3×')
    await selectShortcutCategory('音量與音軌')
    expect(screen.getByRole('switch', { name: '靜音 啟用' })).toHaveAttribute(
      'aria-checked',
      'false'
    )
  })

  it('allows speed number inputs to be cleared before entering a new value', async () => {
    render(<OptionsApp />)
    await selectSpeedSettings()

    const maxInput = await screen.findByLabelText('Highest speed')

    fireEvent.change(maxInput, { target: { value: '' } })
    expect(maxInput).toHaveValue(null)

    expect(maxInput).toHaveAttribute('max', '5')
    fireEvent.change(maxInput, { target: { value: '5' } })
    expect(maxInput).toHaveValue(5)

    fireEvent.blur(maxInput)

    await waitFor(async () => {
      expect(maxInput).toHaveValue(5)
      expect((await getSettings()).speed.max).toBe(5)
    })
  })

  it('restores the saved speed value when an empty number input loses focus', async () => {
    render(<OptionsApp />)
    await selectSpeedSettings()

    const maxInput = await screen.findByLabelText('Highest speed')

    fireEvent.change(maxInput, { target: { value: '' } })
    expect(maxInput).toHaveValue(null)

    fireEvent.blur(maxInput)

    await waitFor(() => expect(maxInput).toHaveValue(3))
  })

  it.each([
    { field: 'min', label: 'Lowest speed', saved: 0.25, draft: 0.5 },
    { field: 'max', label: 'Highest speed', saved: 3, draft: 4 },
    { field: 'step', label: 'Speed adjustment amount', saved: 0.25, draft: 0.5 },
  ] as const)('discards $field speed edits with Escape and still saves the next blur', async ({ field, label, saved, draft }) => {
    render(<OptionsApp />)
    await selectSpeedSettings()
    const input = screen.getByRole('spinbutton', { name: label })

    act(() => input.focus())
    fireEvent.change(input, { target: { value: String(draft) } })
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    expect(input).not.toHaveFocus()
    await waitFor(async () => {
      expect(input).toHaveValue(saved)
      expect((await getSettings()).speed[field]).toBe(saved)
    })

    act(() => input.focus())
    fireEvent.change(input, { target: { value: String(draft) } })
    fireEvent.blur(input)
    await waitFor(async () => expect((await getSettings()).speed[field]).toBe(draft))
  })

  it('resets all shortcut bindings without resetting global or speed settings', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.speed.step = 0.35
    settings.holdSpeed.speed = 2.5
    settings.seek.seconds = 15
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.previous.key = { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyZ', key: 'z' }
    settings.subtitleFavorites = [{ language: 'ja' }]
    settings.audioFavorites = [{ language: 'ja', audioDescription: false }]
    settings.seekShortcuts = [{ id: 'seek:custom', kind: 'percentage', value: 37 }]
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2.75 }]
    settings.subtitleSizeCycle = [175, 100]
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
    for (const id of ['seek:custom', 'preferred-speed:custom', 'subtitle-size:custom'] as const) settings.bindings[id] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    const holdTable = await openHoldControls()
    const globalSwitch = screen.getByRole('switch', { name: 'Enable extension' })
    const playPauseSwitch = screen.getByRole('switch', { name: 'Play / Pause Enabled' })
    fireEvent.click(globalSwitch)
    fireEvent.click(playPauseSwitch)
    await waitFor(() => {
      expect(within(holdTable).getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })).toBeDisabled()
      expect(within(holdTable).getByRole('button', { name: 'Edit Play / Pause hold speed' })).toBeDisabled()
    })
    const beforeReset = await getSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Reset general shortcuts' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Reset general shortcuts' })
    expect(await getSettings()).toEqual(beforeReset)
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Reset general shortcuts' })).not.toBeInTheDocument())
    expect(await getSettings()).toEqual(beforeReset)
    fireEvent.click(screen.getByRole('button', { name: 'Reset general shortcuts' }))
    await confirmReset()
    await waitFor(async () => {
      expect(playPauseSwitch).toBeChecked()
      expect(within(holdTable).getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })).toBeEnabled()
      expect(within(holdTable).getByRole('button', { name: 'Edit Play / Pause hold speed' })).toBeEnabled()
      expect(globalSwitch).not.toBeChecked()
      expect(holdTable).toHaveTextContent('2.5×')
      expect((await getSettings()).speed.step).toBe(0.35)
      expect(await getSettings()).toEqual({
        ...beforeReset,
        bindings: DEFAULT_SETTINGS.bindings,
        seekShortcuts: [], preferredSpeedShortcuts: [], subtitleSizeShortcuts: [],
        subtitleSizeCycle: DEFAULT_SETTINGS.subtitleSizeCycle,
      })
    })
    await selectShortcutCategory('Seeking and navigation')
    expect(screen.getByRole('row', { name: 'Forward / Rewind 15 seconds' })).toBeVisible()
  })

  it('resets the speed range, preferred shortcut, seek pair, and hold speed independently', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, speed: { min: 0.5, max: 4, step: 0.5, preferred: 2.5 }, holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, speed: 3 }, seek: { seconds: 20 } })
    render(<OptionsApp />)
    await selectSpeedSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Reset range and step' }))
    await confirmReset()
    await waitFor(async () => expect((await getSettings()).speed).toEqual({ ...DEFAULT_SETTINGS.speed, preferred: 2.5 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Edit Set preferred speed' }).closest('tr')).toHaveTextContent('2.5×')
    fireEvent.click(screen.getByRole('button', { name: 'Reset Set preferred speed' }))
    await confirmReset()
    await waitFor(async () => expect((await getSettings()).speed.preferred).toBe(1.5))
    expect((await getSettings()).holdSpeed.speed).toBe(3)
    await selectShortcutCategory('Seeking and navigation')
    expect(screen.getByRole('row', { name: 'Forward / Rewind 20 seconds' })).toBeVisible()
    const beforeSeekReset = await getSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Reset seek interval' }))
    await confirmReset()
    await waitFor(() => expect(screen.getByRole('row', { name: 'Forward / Rewind 10 seconds' })).toBeVisible())
    expect(await getSettings()).toEqual({ ...beforeSeekReset, seek: DEFAULT_SETTINGS.seek })
    const hold = await openHoldControls()
    expect(hold).toHaveTextContent('3×')
    const beforeHoldReset = await getSettings()
    fireEvent.click(screen.getByRole('button', { name: 'Reset Play / Pause hold speed' }))
    await confirmReset()
    await waitFor(() => expect(hold).toHaveTextContent('2×'))
    expect(await getSettings()).toEqual({ ...beforeHoldReset, holdSpeed: DEFAULT_SETTINGS.holdSpeed })
  })

  it.each([
    ...['MediaTrackNext', 'MediaTrackPrevious', 'MediaPlayPause', 'MediaStop',
      'AudioVolumeUp', 'AudioVolumeDown', 'AudioVolumeMute', 'BrowserBack', 'BrowserForward'].map(key => [key, key]),
    ['MediaNextTrack', 'MediaTrackNext'], ['MediaPreviousTrack', 'MediaTrackPrevious'],
    ['VolumeUp', 'AudioVolumeUp'], ['VolumeDown', 'AudioVolumeDown'], ['VolumeMute', 'AudioVolumeMute'],
  ])('records and persists %s when the browser supplies no physical code', async (key, code) => {
    render(<OptionsApp />)
    await selectShortcutCategory('Playback')
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Next episode' }))
    const dialog = screen.getByRole('dialog', { name: 'Record shortcut' })
    const recordingArea = within(dialog).getByRole('group', { name: 'Record shortcut' })
    const pressed = createEvent.keyDown(recordingArea, { code: '', key })
    fireEvent(recordingArea, pressed)
    expect(pressed.defaultPrevented).toBe(true)
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.nextEpisode.key).toEqual({
      code, key, ctrl: false, alt: false, shift: false, meta: false,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Edit Next episode' }))
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' })).toBeEnabled()
  })

  it('keeps focus in the recording area while capturing a shortcut', async () => {
    render(<OptionsApp />)

    const edit = await screen.findByRole('button', { name: 'Edit Play / Pause' })
    fireEvent.click(edit)

    const dialog = screen.getByRole('dialog')
    const recordingArea = within(dialog).getByRole('group', { name: 'Record shortcut' })
    expect(recordingArea).toHaveFocus()

    fireEvent.keyDown(recordingArea, { code: 'KeyQ', key: 'q' })

    expect(within(dialog).getByTitle('Q')).toBeInTheDocument()
    expect(recordingArea).toHaveFocus()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await getSettings()).bindings.playPause).toEqual(DEFAULT_SETTINGS.bindings.playPause)
  })

  it('restores the recorder draft to the saved shortcut before saving', async () => {
    await saveSettings({
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        playPause: {
          enabled: true,
          key: { code: 'KeyJ', key: 'j', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    })

    render(<OptionsApp />)

    const edit = await screen.findByRole('button', { name: 'Edit Play / Pause' })
    expect(within(edit.closest('tr')!).getByTitle('J')).toBeInTheDocument()

    fireEvent.click(edit)

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByTitle('J')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { code: 'KeyQ', key: 'q' })

    expect(within(dialog).getByTitle('Q')).toBeInTheDocument()

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Undo edits',
      })
    )

    expect(within(dialog).getByTitle('J')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(within(edit.closest('tr')!).getByTitle('J')).toBeInTheDocument()
    })
  })
})
