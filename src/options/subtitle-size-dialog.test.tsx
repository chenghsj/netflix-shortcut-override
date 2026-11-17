import { act, createEvent, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OptionsApp } from './options-app'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { fitsSettingsStorageLimit, getSettings, saveSettings } from '@/shared/storage'

const editDialog = async (label = 'Cycle subtitle size') => {
  fireEvent.click(await screen.findByRole('button', { name: `Edit ${label}` }))
  return screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
}
const record = (dialog: HTMLElement, code: string, key: string) =>
  fireEvent.keyDown(within(dialog).getByRole('group', { name: 'Key' }), { code, key })

async function confirmDelete(label: string) {
  const confirmation = await screen.findByRole('dialog', { name: label })
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: label })).not.toBeInTheDocument())
}

const transfer = () => ({ effectAllowed: 'none', dropEffect: 'none', setData: vi.fn(), setDragImage: vi.fn() })
const dragEvent = (kind: 'dragOver' | 'drop', row: HTMLElement, dataTransfer: ReturnType<typeof transfer>, after = false) => {
  const event = createEvent[kind](row, { dataTransfer })
  Object.defineProperty(event, 'clientY', { value: after ? 1 : -1 })
  fireEvent(row, event)
}

describe('subtitle size editor', () => {
  it('stops adding at six sizes and allows another size after one is removed', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog()
    const add = within(dialog).getByRole('button', { name: 'Add size' })
    expect(dialog).toHaveTextContent('Choose 2–6 different sizes')
    for (let count = 3; count < 6; count += 1) fireEvent.click(add)
    expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(6)
    expect(add).toBeDisabled()
    fireEvent.click(add)
    expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(6)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove size 6' }))
    expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(6)
    await confirmDelete('Remove size 6')
    expect(add).toBeEnabled()
    fireEvent.click(add)
    const sizes = within(dialog).getAllByRole('spinbutton').map(input => Number((input as HTMLInputElement).value))
    expect(sizes).toHaveLength(6)
    expect(add).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual(sizes))
  })

  it.each(['builtin', 'custom'] as const)('preserves a previously saved twelve-size %s cycle when editing', async kind => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    const sizes = Array.from({ length: 12 }, (_, index) => 50 + index)
    if (kind === 'builtin') settings.subtitleSizeCycle = sizes
    else {
      settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:legacy', kind: 'cycle', sizes }]
      settings.bindings['subtitle-size:legacy'] = { enabled: true, key: null }
    }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const label = kind === 'builtin' ? 'Cycle subtitle size' : `Cycle sizes · ${sizes.map(size => `${size}%`).join(' → ')}`
    const dialog = await editDialog(label)
    expect(within(dialog).getAllByRole('spinbutton')).toHaveLength(12)
    expect(dialog).toHaveTextContent('Choose 2–12 different sizes')
    expect(within(dialog).getByRole('button', { name: 'Add size' })).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText('Size 1'), { target: { value: '175' } })
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(kind === 'builtin' ? saved.subtitleSizeCycle : saved.subtitleSizeShortcuts[0].sizes).toEqual([175, ...sizes.slice(1)])
    })
  })

  it('reorders rows by drag handle, retains label dragging, and saves and reopens that exact order', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Cycle subtitle size' }))
    let dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    dialog.style.backgroundColor = 'rgb(245, 243, 238)'
    const source = within(dialog).getByRole('button', { name: 'Reorder size 3' })
    const target = within(dialog).getByLabelText('Size 1').closest('li')!
    const rows = within(dialog).getAllByRole('listitem')
    rows.forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
      top: index * 40, left: 0, width: 300, height: 32, bottom: index * 40 + 32,
    } as DOMRect))
    const dataTransfer = transfer()
    const start = createEvent.dragStart(source, { dataTransfer })
    Object.defineProperty(start, 'clientY', { value: 96 })
    fireEvent(source, start)
    expect(getComputedStyle(dataTransfer.setDragImage.mock.calls[0][0]).backgroundColor)
      .toBe(getComputedStyle(dialog).backgroundColor)
    dragEvent('dragOver', target, dataTransfer)
    expect(target.style.transform).toBe('translateY(40px)')
    expect(rows[1].style.transform).toBe('translateY(40px)')
    expect(target.style.transition).toContain('transform 200ms')
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['80', '100', '125'])
    expect((await getSettings()).subtitleSizeCycle).toEqual([80, 100, 125])
    dragEvent('drop', target, dataTransfer)
    fireEvent.dragEnd(source, { dataTransfer })
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['125', '80', '100'])
    const label = within(dialog).getByText('Size 1', { selector: 'label' })
    fireEvent.pointerDown(label, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(label, { clientX: 108, pointerId: 1 })
    fireEvent.pointerUp(label, { clientX: 108, pointerId: 1 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(126)
    expect(within(dialog).getByLabelText('Size 2')).toHaveValue(80)
    expect((await getSettings()).subtitleSizeCycle).toEqual([80, 100, 125])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual([126, 80, 100]))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cycle subtitle size' }))
    dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['126', '80', '100'])
  })

  it('supports dropping after a row and keyboard reordering without losing focus', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Cycle subtitle size' }))
    const dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    const source = within(dialog).getByRole('button', { name: 'Reorder size 1' })
    const target = within(dialog).getByLabelText('Size 3').closest('li')!
    const dataTransfer = transfer()
    fireEvent.dragStart(source, { dataTransfer })
    dragEvent('dragOver', target, dataTransfer, true)
    expect(dataTransfer.dropEffect).toBe('move')
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(80)
    dragEvent('drop', target, dataTransfer, true)
    fireEvent.dragEnd(source, { dataTransfer })
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['100', '125', '80'])
    const grip = within(dialog).getByRole('button', { name: 'Reorder size 2' })
    fireEvent.keyDown(grip, { key: 'ArrowUp' })
    expect(grip).toHaveFocus()
    expect(grip).toHaveAccessibleName('Reorder size 1')
    fireEvent.keyDown(grip, { key: 'ArrowUp' })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(125)
    fireEvent.keyDown(grip, { key: 'ArrowDown' })
    expect(grip).toHaveFocus()
    expect(grip).toHaveAccessibleName('Reorder size 2')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual([100, 125, 80]))
  })

  it('discards cancelled drags and ignores external drops', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog()
    const source = within(dialog).getByRole('button', { name: 'Reorder size 1' })
    const target = within(dialog).getByLabelText('Size 3').closest('li')!
    const dataTransfer = transfer()
    fireEvent.dragStart(source, { dataTransfer })
    dragEvent('dragOver', target, dataTransfer, true)
    fireEvent.dragEnd(source, { dataTransfer })
    expect(target.style.transform).toBe('')
    dragEvent('drop', target, dataTransfer, true)
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['80', '100', '125'])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect((await getSettings()).subtitleSizeShortcuts).toEqual([])
  })

  it('drags each size independently within its bounds and keeps the correct row after deletion until Save', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Cycle subtitle size' }))
    const dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    const firstLabel = within(dialog).getByText('Size 1', { selector: 'label' })
    fireEvent.pointerDown(firstLabel, { button: 0, clientX: 100, pointerId: 1 })
    fireEvent.pointerMove(firstLabel, { clientX: 124, pointerId: 1 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(83)
    expect(within(dialog).getByLabelText('Size 2')).toHaveValue(100)
    fireEvent.pointerMove(firstLabel, { clientX: 10000, pointerId: 1 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(300)
    fireEvent.pointerMove(firstLabel, { clientX: -10000, pointerId: 1 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(50)
    fireEvent.pointerCancel(firstLabel, { pointerId: 1 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(80)
    const secondLabel = within(dialog).getByText('Size 2', { selector: 'label' })
    fireEvent.pointerDown(secondLabel, { button: 0, clientX: 100, pointerId: 2 })
    fireEvent.pointerMove(secondLabel, { clientX: 116, pointerId: 2 })
    fireEvent.pointerUp(secondLabel, { clientX: 116, pointerId: 2 })
    expect(within(dialog).getByLabelText('Size 2')).toHaveValue(102)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove size 1' }))
    await confirmDelete('Remove size 1')
    const remainingLabel = within(dialog).getByText('Size 1', { selector: 'label' })
    fireEvent.pointerDown(remainingLabel, { button: 0, clientX: 100, pointerId: 3 })
    fireEvent.pointerMove(remainingLabel, { clientX: 108, pointerId: 3 })
    fireEvent.pointerUp(remainingLabel, { clientX: 108, pointerId: 3 })
    expect(within(dialog).getByLabelText('Size 1')).toHaveValue(103)
    expect(within(dialog).getByLabelText('Size 2')).toHaveValue(125)
    expect((await getSettings()).subtitleSizeCycle).toEqual([80, 100, 125])
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual([103, 125]))
  })

  it('opens the size editor when resolving a conflict and enables the saved entry with its new key', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [175] }]
    settings.bindings['subtitle-size:fixed'] = { ...settings.bindings.mute, enabled: false }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Set size · 175% Enabled' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Change key' }))
    const dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    expect(within(dialog).getByLabelText('Size')).toHaveValue(175)
    record(dialog, 'KeyB', 'b')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).bindings['subtitle-size:fixed']).toMatchObject({ enabled: true, key: { code: 'KeyB' } }))
    expect((await getSettings()).bindings.mute.enabled).toBe(true)
  })

  it('keeps cycle edits open when sync storage is full and allows saving after space is freed', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    for (let index = 0; index < 100; index += 1) {
      const id = `subtitle-size:00000000-0000-4000-8000-${String(index).padStart(12, '0')}` as const
      settings.subtitleSizeShortcuts.push({ id, kind: 'fixed', sizes: [100] })
      settings.bindings[id] = { enabled: false, key: { code: 'F1', key: 'F1', ctrl: false, alt: false, shift: false, meta: false } }
      if (!fitsSettingsStorageLimit(settings)) { settings.subtitleSizeShortcuts.pop(); delete settings.bindings[id]; break }
    }
    const expandedCycle = [...settings.subtitleSizeCycle, 150]
    for (const shortcut of settings.subtitleSizeShortcuts) {
      const original = { ...shortcut }
      shortcut.kind = 'cycle'
      shortcut.sizes = [50, 51]
      if (!fitsSettingsStorageLimit(settings)) { Object.assign(shortcut, original); break }
      for (let value = 52; value <= 61; value += 1) {
        shortcut.sizes.push(value)
        if (!fitsSettingsStorageLimit(settings)) { shortcut.sizes.pop(); break }
      }
      if (!fitsSettingsStorageLimit({ ...settings, subtitleSizeCycle: expandedCycle })) break
    }
    expect(fitsSettingsStorageLimit(settings)).toBe(true)
    expect(fitsSettingsStorageLimit({ ...settings, subtitleSizeCycle: expandedCycle })).toBe(false)
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add size' }))
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Settings storage is full')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    const removed = settings.subtitleSizeShortcuts.pop()!
    delete settings.bindings[removed.id]
    await act(async () => { await saveSettings(settings) })
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual(expandedCycle))
  })

  it('resets custom rows, their bindings and the built-in cycle together', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeCycle = [100, 200]
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [175] }]
    settings.bindings['subtitle-size:fixed'] = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reset general shortcuts' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: /^Reset / })).getByRole('button', { name: 'Reset' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeShortcuts).toEqual([]))
    expect((await getSettings()).subtitleSizeCycle).toEqual(DEFAULT_SETTINGS.subtitleSizeCycle)
    expect((await getSettings()).bindings).toEqual(DEFAULT_SETTINGS.bindings)
  })

  it('resets only the built-in sizes and order from the size row', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeCycle = [175, 100]
    settings.bindings.cycleSubtitleSize = { enabled: false, key: { ...DEFAULT_SETTINGS.bindings.mute.key, code: 'KeyZ', key: 'z' } }
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [150] }]
    settings.bindings['subtitle-size:fixed'] = { enabled: true, key: null }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset subtitle size cycle' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: /^Reset / })).getByRole('button', { name: 'Reset' }))
    await waitFor(async () => expect(await getSettings()).toEqual({
      ...saved, subtitleSizeCycle: DEFAULT_SETTINGS.subtitleSizeCycle,
    }))
  })

  it('loads default sizes and key into the editor without applying them until saved', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeCycle = [175, 100]
    settings.bindings.cycleSubtitleSize = { enabled: false, key: { ...settings.bindings.mute.key, code: 'KeyZ', key: 'z' } }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog()
    expect(within(dialog).queryByRole('button', { name: 'Undo edits' })).not.toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Use defaults' }))
    expect(within(dialog).getAllByRole('spinbutton').map(input => (input as HTMLInputElement).value)).toEqual(['80', '100', '125'])
    expect(await getSettings()).toEqual(saved)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect(await getSettings()).toEqual({
      ...saved,
      subtitleSizeCycle: DEFAULT_SETTINGS.subtitleSizeCycle,
      bindings: { ...saved.bindings, cycleSubtitleSize: { ...saved.bindings.cycleSubtitleSize, key: DEFAULT_SETTINGS.bindings.cycleSubtitleSize.key } },
    }))
  })

  it('edits a saved custom cycle inline with other subtitles and deletes both the entry and its binding', async () => {
    const saved = structuredClone(DEFAULT_SETTINGS)
    saved.subtitleSizeShortcuts = [{ id: 'subtitle-size:cycle', kind: 'cycle', sizes: [80, 100, 125] }]
    saved.bindings['subtitle-size:cycle'] = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(saved)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog('Cycle sizes · 80% → 100% → 125%')
    fireEvent.change(within(dialog).getByLabelText('Size 1'), { target: { value: '200' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add size' }))
    expect(within(dialog).getByLabelText('Size 4')).toHaveValue(150)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove size 3' }))
    await confirmDelete('Remove size 3')
    record(dialog, 'KeyB', 'b')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeShortcuts[0].sizes).toEqual([200, 100, 150]))
    const settings = await getSettings(), entry = settings.subtitleSizeShortcuts[0]
    expect(entry).toMatchObject({ kind: 'cycle', sizes: [200, 100, 150] })
    expect(settings.bindings[entry.id]).toMatchObject({ enabled: true, key: { code: 'KeyB' } })
    expect(screen.getByRole('row', { name: 'Cycle sizes · 200% → 100% → 150%' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Cycle sizes · 200% → 100% → 150%' }))
    expect((await getSettings()).subtitleSizeShortcuts).toHaveLength(1)
    await confirmDelete('Remove Cycle sizes · 200% → 100% → 150%')
    await waitFor(async () => expect((await getSettings()).subtitleSizeShortcuts).toEqual([]))
    expect((await getSettings()).bindings[entry.id]).toBeUndefined()
  })

  it('edits a saved fixed size and blocks a conflicting key until it is changed', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [125] }]
    settings.bindings['subtitle-size:fixed'] = { enabled: true, key: { code: 'KeyB', key: 'b', ctrl: false, alt: false, shift: false, meta: false } }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    const dialog = await editDialog('Set size · 125%')
    fireEvent.change(within(dialog).getByLabelText('Size'), { target: { value: '175' } })
    expect(within(dialog).queryByRole('button', { name: 'Add size' })).not.toBeInTheDocument()
    record(dialog, 'Space', ' ')
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Play / Pause')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    record(dialog, 'KeyB', 'b')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeShortcuts[0]).toMatchObject({ kind: 'fixed', sizes: [175] }))
  })

  it('edits the original cycle and key together, validates percentages, and preserves a disabled binding', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.cycleSubtitleSize.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit Cycle subtitle size' }))
    const dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    expect(within(dialog).queryByRole('combobox', { name: 'Action' })).not.toBeInTheDocument()
    for (const value of ['100', '301', '49', '125.5', '']) {
      fireEvent.change(within(dialog).getByLabelText('Size 1'), { target: { value } })
      expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
      expect(within(dialog).getByRole('alert')).toHaveTextContent('whole percentages')
    }
    fireEvent.change(within(dialog).getByLabelText('Size 1'), { target: { value: '175' } })
    record(dialog, 'KeyB', 'b')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitleSizeCycle).toEqual([175, 100, 125]))
    expect((await getSettings()).bindings.cycleSubtitleSize).toMatchObject({ enabled: false, key: { code: 'KeyB' } })
    expect((await getSettings()).subtitleSizeShortcuts).toEqual([])
  })

  it('preserves unsaved edits across unrelated changes and rejects stale edits to the same entry', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Cycle subtitle size' }))
    const dialog = await screen.findByRole('dialog', { name: 'Subtitle size shortcut' })
    fireEvent.change(within(dialog).getByLabelText('Size 3'), { target: { value: '175' } })
    await act(async () => { await saveSettings({ ...(await getSettings()), subtitleSize: 150 }) })
    expect(within(dialog).getByLabelText('Size 3')).toHaveValue(175)
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled()
    await act(async () => { await saveSettings({ ...(await getSettings()), subtitleSizeCycle: [100, 150, 200] }) })
    expect(within(dialog).getByRole('alert')).toHaveTextContent('This shortcut changed')
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('button', { name: 'Edit Cycle subtitle size' })).toHaveFocus()
  })
})
