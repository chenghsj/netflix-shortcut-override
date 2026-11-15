import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OptionsApp } from './options-app'
import { PopupApp } from '@/popup/popup-app'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings } from '@/shared/storage'
import { resolvePlaybackShortcut } from '@/shared/shortcut-routing'

const openChecklist = async (ui: Pick<typeof screen, 'findByRole'> = screen) => {
  fireEvent.click(await ui.findByRole('button', { name: 'Manage page features' }))
  return screen.findByRole('dialog', { name: 'Manage page features' })
}
const frameRow = (ui = screen) => ui.queryByRole('button', { name: 'Edit Previous frame' })
const openSeeking = async (ui: Pick<typeof screen, 'findByRole'> = screen) =>
  fireEvent.click(await ui.findByRole('button', { name: 'Seeking and navigation' }))
const frameCheckbox = (checklist: HTMLElement) => within(checklist).getByRole('checkbox', { name: 'Show Previous frame' })
const apply = (checklist: HTMLElement) => fireEvent.click(within(checklist).getByRole('button', { name: 'Apply' }))
const cancel = (checklist: HTMLElement) => fireEvent.click(within(checklist).getByRole('button', { name: 'Cancel' }))

describe('page feature checklist', () => {
  it('previews hidden rows without saving or changing the popup, and Cancel restores them', async () => {
    const options = render(<OptionsApp />)
    const ui = within(options.container)
    await openSeeking(ui)
    const popup = render(<PopupApp />)
    const reference = within(popup.container)
    fireEvent.change(await reference.findByRole('searchbox'), { target: { value: 'previous frame' } })
    await reference.findByText('Previous frame')
    const trigger = await ui.findByRole('button', { name: 'Manage page features' })
    expect(trigger.textContent).toBe('')
    expect(trigger.closest('[data-slot="card-header"]')).not.toBeNull()
    const checklist = await openChecklist(ui)
    expect(within(checklist).queryByRole('button', { name: /Edit|Reset/ })).not.toBeInTheDocument()
    fireEvent.click(within(checklist).getByText('Previous frame'))
    expect(frameCheckbox(checklist)).not.toBeChecked()
    expect(checklist).toBeVisible()
    expect(ui.queryByRole('button', { name: 'Edit Previous frame' })).not.toBeInTheDocument()
    expect(reference.getByText('Previous frame')).toBeVisible()
    expect((await getSettings()).bindings.previousFrame.enabled).toBe(true)
    cancel(checklist)
    expect(ui.getByRole('button', { name: 'Edit Previous frame' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect(frameCheckbox(await openChecklist(ui))).toBeChecked()
  })

  it('applies a disable, preserves its key, hides both references, and can re-enable it', async () => {
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    expect(frameRow()).not.toBeInTheDocument()
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).bindings.previousFrame).toEqual({ ...DEFAULT_SETTINGS.bindings.previousFrame, enabled: false }))
    const saved = await getSettings()
    expect(resolvePlaybackShortcut(saved, { code: 'Comma', key: ',', ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }, true)).toBeNull()
    const popup = render(<PopupApp />)
    const reference = within(popup.container)
    fireEvent.change(await reference.findByRole('searchbox'), { target: { value: 'previous frame' } })
    expect(reference.queryByText('Previous frame')).not.toBeInTheDocument()
    popup.unmount()
    checklist = await openChecklist()
    expect(frameCheckbox(checklist)).not.toBeChecked()
    fireEvent.click(frameCheckbox(checklist))
    expect(frameRow()).toBeVisible()
    expect((await getSettings()).bindings.previousFrame.enabled).toBe(false)
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).bindings.previousFrame).toEqual(DEFAULT_SETTINGS.bindings.previousFrame))
  })

  it.each(['escape', 'outside', 'navigation'] as const)('discards the preview on %s', async close => {
    render(<OptionsApp />)
    await openSeeking()
    const checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    expect(frameRow()).not.toBeInTheDocument()
    if (close === 'escape') fireEvent.keyDown(frameCheckbox(checklist), { key: 'Escape' })
    else if (close === 'outside') fireEvent.pointerDown(document.body)
    else {
      fireEvent.click(screen.getByRole('button', { name: 'Playback' }))
      await openSeeking()
    }
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Manage page features' })).not.toBeInTheDocument())
    expect(frameRow()).toBeVisible()
    expect((await getSettings()).bindings.previousFrame.enabled).toBe(true)
  })

  it('previews and applies seek pairs together while preserving custom parameters', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:custom', kind: 'relative', value: 30 }]
    settings.bindings['seek:custom-backward'] = { enabled: true, key: null }
    settings.bindings['seek:custom-forward'] = { enabled: false, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 30 seconds' }))
    expect(screen.queryByRole('row', { name: 'Forward / Rewind 30 seconds' })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Forward / Rewind 10 seconds' })).toBeVisible()
    cancel(checklist)
    expect(screen.getByRole('row', { name: 'Forward / Rewind 30 seconds' })).toBeVisible()
    expect((await getSettings()).bindings['seek:custom-forward'].enabled).toBe(false)
    checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 30 seconds' }))
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.bindings['seek:custom-backward'].enabled).toBe(false)
      expect(saved.bindings['seek:custom-forward'].enabled).toBe(false)
      expect(saved.seekShortcuts).toEqual(settings.seekShortcuts)
    })
  })

  it('previews custom preferred speeds and hold speed independently', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2 }]
    settings.bindings['preferred-speed:custom'] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Playback speed' }))
    let checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Set preferred speed · 2×' }))
    expect(screen.queryByRole('row', { name: 'Set preferred speed · 2×' })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Set preferred speed · 1.5×' })).toBeVisible()
    cancel(checklist)
    expect(screen.getByRole('row', { name: 'Set preferred speed · 2×' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Playback' }))
    checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Play / Pause hold speed' }))
    expect(screen.queryByRole('row', { name: 'Play / Pause hold speed' })).not.toBeInTheDocument()
    cancel(checklist)
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
    expect((await getSettings()).holdSpeed).toEqual(settings.holdSpeed)
  })

  it('rolls back a failed Apply without showing an Undo notice', async () => {
    render(<OptionsApp />)
    await openSeeking()
    const checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    vi.mocked(chrome.storage.sync.set).mockImplementationOnce((_items, callback) => {
      Object.assign(chrome.runtime, { lastError: { message: 'Storage unavailable' } })
      ;(callback as (() => void))?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
    })
    apply(checklist)
    await screen.findByText(/Storage unavailable/)
    expect(frameRow()).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
    expect((await getSettings()).bindings.previousFrame.enabled).toBe(true)
  })

  it('restores a conflicting feature as visible but disabled without taking the occupied key', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.mute = { enabled: false, key: settings.bindings.fullscreen.key }
    settings.hiddenFeatures = ['general:mute']
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Volume and audio' }))
    let checklist = await openChecklist()
    const restore = async () => {
      const checkbox = within(checklist).getByRole('checkbox', { name: 'Show Mute' })
      fireEvent.click(checkbox)
      expect(checkbox).toBeChecked()
      expect(screen.getByRole('button', { name: 'Edit Mute' })).toBeVisible()
      expect(screen.getByRole('switch', { name: 'Mute Enabled' })).not.toBeChecked()
      expect(screen.queryByRole('button', { name: 'Use for Mute' })).not.toBeInTheDocument()
      const saved = await getSettings()
      expect(saved.hiddenFeatures).toContain('general:mute')
      expect(saved.bindings.fullscreen.enabled).toBe(true)
    }
    await restore()
    cancel(checklist)
    expect(screen.queryByRole('button', { name: 'Edit Mute' })).not.toBeInTheDocument()
    checklist = await openChecklist()
    await restore()
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.hiddenFeatures).not.toContain('general:mute')
      expect(saved.bindings.mute).toEqual(settings.bindings.mute)
      expect(saved.bindings.fullscreen).toEqual(settings.bindings.fullscreen)
    })
    const popup = render(<PopupApp />)
    const reference = within(popup.container)
    fireEvent.change(await reference.findByRole('searchbox'), { target: { value: 'mute' } })
    expect(reference.getByText('Mute')).toBeVisible()
    expect(reference.getByText('Disabled')).toBeVisible()
  })

  it('preserves external edits when cancelling or applying a preview', async () => {
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    await act(async () => {
      const current = await getSettings()
      await saveSettings({ ...current, speed: { ...current.speed, preferred: 2 } })
    })
    cancel(checklist)
    expect(frameRow()).toBeVisible()
    checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.bindings.previousFrame.enabled).toBe(false)
      expect(saved.speed.preferred).toBe(2)
    })
  })

  it('previews subtitle rows, restores Cancel, and persists their visibility across reopening', async () => {
    const options = render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Manage page features' }))[0])
    let checklist = await screen.findByRole('dialog', { name: 'Manage page features' })
    const checkbox = within(checklist).getByRole('checkbox', { name: 'Show Toggle subtitles' })
    fireEvent.click(checkbox)
    expect(screen.queryByRole('button', { name: 'Edit Toggle subtitles' })).not.toBeInTheDocument()
    cancel(checklist)
    expect(screen.getByRole('button', { name: 'Edit Toggle subtitles' })).toBeVisible()
    fireEvent.click(screen.getAllByRole('button', { name: 'Manage page features' })[0])
    checklist = await screen.findByRole('dialog', { name: 'Manage page features' })
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Toggle subtitles' }))
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).toContain('general:toggleSubtitles'))
    options.unmount()
    window.location.hash = '#subtitles'
    render(<OptionsApp />)
    await screen.findAllByRole('button', { name: 'Manage page features' })
    expect(screen.queryByRole('button', { name: 'Edit Toggle subtitles' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'toggle subtitles' } })
    expect(screen.queryByRole('button', { name: 'Edit Toggle subtitles' })).not.toBeInTheDocument()
  })

  it('hides inline hold settings with their managed parent and restores them on Cancel', async () => {
    render(<OptionsApp />)
    const checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Play / Pause' }))
    expect(screen.queryByRole('button', { name: 'Edit Play / Pause' })).not.toBeInTheDocument()
    expect(screen.queryByRole('row', { name: 'Play / Pause hold speed' })).not.toBeInTheDocument()
    cancel(checklist)
    expect(screen.getByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    expect(screen.getByRole('row', { name: 'Play / Pause hold speed' })).toBeVisible()
  })

  it('blocks Apply after external feature edits while a visibility preview is open', async () => {
    render(<OptionsApp />)
    await openSeeking()
    const checklist = await openChecklist()
    fireEvent.click(frameCheckbox(checklist))
    await act(async () => {
      const current = await getSettings()
      await saveSettings({ ...current, bindings: { ...current.bindings, mute: { ...current.bindings.mute, enabled: false } } })
    })
    expect(within(checklist).getByRole('button', { name: 'Apply' })).toBeDisabled()
    expect(within(checklist).getByRole('alert')).toHaveTextContent('Features changed in another view')
    cancel(checklist)
    expect(frameRow()).toBeVisible()
    expect((await getSettings()).bindings.mute.enabled).toBe(false)
  })


  it('still requires an explicit transfer when enabling the restored feature from its row switch', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.mute = { enabled: false, key: settings.bindings.fullscreen.key }
    settings.hiddenFeatures = ['general:mute']
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Volume and audio' }))
    const checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Mute' }))
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).not.toContain('general:mute'))
    const toggle = screen.getByRole('switch', { name: 'Mute Enabled' })
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).not.toBeChecked()
    expect((await getSettings()).bindings.fullscreen.enabled).toBe(true)
    fireEvent.click(await screen.findByRole('button', { name: 'Use for Mute' }))
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.bindings.mute.enabled).toBe(true)
      expect(saved.bindings.fullscreen.enabled).toBe(false)
    })
  })

  it('nests seek entries under their group and previews individual and whole-group selection', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:custom', kind: 'relative', value: 20 }]
    settings.bindings['seek:custom-backward'] = { enabled: true, key: null }
    settings.bindings['seek:custom-forward'] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    const group = within(checklist).getByRole('group', { name: 'Forward / Rewind' })
    const parent = within(group).getByRole('checkbox', { name: 'Show Forward / Rewind' })
    const builtin = within(group).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })
    const custom = within(group).getByRole('checkbox', { name: 'Show Forward / Rewind 20 seconds' })
    expect(parent).toBeChecked()
    fireEvent.click(custom)
    expect(parent).toBePartiallyChecked()
    expect(builtin).toBeChecked()
    expect(screen.queryByRole('row', { name: 'Forward / Rewind 20 seconds' })).not.toBeInTheDocument()
    expect((await getSettings()).bindings['seek:custom-forward'].enabled).toBe(true)
    cancel(checklist)
    expect(screen.getByRole('row', { name: 'Forward / Rewind 20 seconds' })).toBeVisible()
    checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind' }))
    expect(screen.queryByRole('table', { name: 'Forward / Rewind' })).not.toBeInTheDocument()
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).not.toBeChecked()
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 20 seconds' })).not.toBeChecked()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 20 seconds' }))
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind' })).toBePartiallyChecked()
    expect(screen.getByRole('row', { name: 'Forward / Rewind 20 seconds' })).toBeVisible()
    expect(screen.queryByRole('row', { name: 'Forward / Rewind 10 seconds' })).not.toBeInTheDocument()
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.bindings.seekForward.enabled).toBe(false)
      expect(saved.bindings['seek:custom-forward'].enabled).toBe(true)
      expect(saved.bindings.nextFrame.enabled).toBe(true)
    })
    checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind' }))
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).toBeChecked()
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 20 seconds' })).toBeChecked()
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).bindings.seekBackward.enabled).toBe(true))
  })

  it('persists hiding and restoring an empty percentage group', async () => {
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Jump to position' }))
    expect(screen.queryByRole('button', { name: 'Add percentage shortcut' })).not.toBeInTheDocument()
    cancel(checklist)
    expect(screen.getByRole('button', { name: 'Add percentage shortcut' })).toBeVisible()
    checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Jump to position' }))
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).toContain('group:percentage'))
    checklist = await openChecklist()
    expect(within(checklist).getByRole('checkbox', { name: 'Show Jump to position' })).not.toBeChecked()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Jump to position' }))
    expect(screen.getByRole('button', { name: 'Add percentage shortcut' })).toBeVisible()
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).not.toContain('group:percentage'))
  })

  it('nests hold speed and preferred speed entries and can hide every preferred speed together', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2 }]
    settings.bindings['preferred-speed:custom'] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    let checklist = await openChecklist()
    const playback = within(checklist).getByRole('group', { name: 'Play / Pause' })
    expect(within(playback).getByRole('checkbox', { name: 'Show Play / Pause hold speed' })).toBeChecked()
    cancel(checklist)
    fireEvent.click(screen.getByRole('button', { name: 'Playback speed' }))
    checklist = await openChecklist()
    const preferred = within(checklist).getByRole('group', { name: 'Preferred speed' })
    expect(within(preferred).getByRole('checkbox', { name: 'Show Set preferred speed' })).toBeChecked()
    expect(within(preferred).getByRole('checkbox', { name: 'Show Set preferred speed · 2×' })).toBeChecked()
    fireEvent.click(within(preferred).getByRole('checkbox', { name: 'Show Preferred speed' }))
    expect(screen.queryByRole('table', { name: 'Preferred speed' })).not.toBeInTheDocument()
    cancel(checklist)
    expect(screen.getByRole('row', { name: 'Set preferred speed · 1.5×' })).toBeVisible()
    expect(screen.getByRole('row', { name: 'Set preferred speed · 2×' })).toBeVisible()
  })

  it('restores a whole group with only conflicting entries disabled and saves after Apply', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:custom', kind: 'relative', value: 30 }]
    settings.bindings['seek:custom-backward'] = { enabled: false, key: null }
    settings.bindings['seek:custom-forward'] = { enabled: false, key: null }
    settings.bindings.seekBackward = { enabled: false, key: settings.bindings.mute.key }
    settings.bindings.seekForward = { enabled: false, key: settings.bindings.fullscreen.key }
    settings.hiddenFeatures = ['general:seekBackward', 'general:seekForward', 'general:seek:custom-backward', 'general:seek:custom-forward', 'group:seek']
    await saveSettings(settings)
    render(<OptionsApp />)
    await openSeeking()
    const checklist = await openChecklist()
    const parent = within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind' })
    fireEvent.click(parent)
    expect(parent).toBeChecked()
    expect(within(checklist).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Forward / Rewind 10 seconds Enabled' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Forward / Rewind 30 seconds Enabled' })).toBeChecked()
    expect(screen.queryByRole('button', { name: 'Use for Forward / Rewind' })).not.toBeInTheDocument()
    expect((await getSettings()).hiddenFeatures).toContain('group:seek')
    expect((await getSettings()).bindings['seek:custom-forward'].enabled).toBe(false)
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.hiddenFeatures).toEqual([])
      expect(saved.bindings.seekBackward).toEqual(settings.bindings.seekBackward)
      expect(saved.bindings.seekForward).toEqual(settings.bindings.seekForward)
      expect(saved.bindings['seek:custom-backward'].enabled).toBe(true)
      expect(saved.bindings['seek:custom-forward'].enabled).toBe(true)
      expect(saved.bindings.mute).toEqual(settings.bindings.mute)
      expect(saved.bindings.fullscreen).toEqual(settings.bindings.fullscreen)
    })
  })

  it.each(['builtin', 'custom'] as const)('restores a %s seek pair with both directions disabled when one key conflicts', async kind => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    const backward = kind === 'builtin' ? 'seekBackward' : 'seek:custom-backward'
    const forward = kind === 'builtin' ? 'seekForward' : 'seek:custom-forward'
    if (kind === 'custom') settings.seekShortcuts = [{ id: 'seek:custom', kind: 'relative', value: 30 }]
    settings.bindings[backward] = { enabled: false, key: settings.bindings.mute.key }
    settings.bindings[forward] = { enabled: false, key: null }
    settings.hiddenFeatures = [`general:${backward}`, `general:${forward}`]
    await saveSettings(settings)
    render(<OptionsApp />)
    await openSeeking()
    const checklist = await openChecklist()
    const label = `Forward / Rewind ${kind === 'builtin' ? 10 : 30} seconds`
    fireEvent.click(within(checklist).getByRole('checkbox', { name: `Show ${label}` }))
    expect(screen.getByRole('row', { name: label })).toBeVisible()
    expect(screen.getByRole('switch', { name: `${label} Enabled` })).not.toBeChecked()
    expect(screen.queryByRole('button', { name: `Use for ${label}` })).not.toBeInTheDocument()
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.hiddenFeatures).toEqual([])
      expect(saved.bindings[backward]).toEqual(settings.bindings[backward])
      expect(saved.bindings[forward]).toEqual(settings.bindings[forward])
      expect(saved.bindings.mute.enabled).toBe(true)
    })
  })

  it('opens nested checklist groups expanded and collapses without changing selections', async () => {
    render(<OptionsApp />)
    await openSeeking()
    let checklist = await openChecklist()
    let group = within(checklist).getByRole('group', { name: 'Forward / Rewind' })
    const toggle = within(group).getByRole('button', { name: 'Forward / Rewind' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(group).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).toBeChecked()
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(group).queryByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).not.toBeInTheDocument()
    expect(within(group).getByRole('checkbox', { name: 'Show Forward / Rewind' })).toBeChecked()
    expect(screen.getByRole('row', { name: 'Forward / Rewind 10 seconds' })).toBeVisible()
    expect((await getSettings()).bindings.seekForward.enabled).toBe(true)
    fireEvent.click(toggle)
    expect(within(group).getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).toBeChecked()
    fireEvent.click(toggle)
    cancel(checklist)
    checklist = await openChecklist()
    group = within(checklist).getByRole('group', { name: 'Forward / Rewind' })
    expect(within(group).getByRole('button', { name: 'Forward / Rewind' })).toHaveAttribute('aria-expanded', 'true')
  })


  it.each([
    { page: 'Volume and audio', feature: 'audioFavorites', title: 'Favorite audio tracks', favorites: [{ language: 'ja', audioDescription: false }, { language: 'en', audioDescription: true }] },
    { page: 'Subtitles', feature: 'subtitleFavorites', title: 'Favorite subtitles', favorites: [{ language: 'ja' }, { language: 'en' }] },
  ] as const)('previews, cancels, saves and restores $title without clearing the list', async ({ page, feature, title, favorites }) => {
    const settings: ShortcutSettings = { ...structuredClone(DEFAULT_SETTINGS), [feature]: [...favorites] }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: page }))
    const open = async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Manage page features' })[0])
      return screen.findByRole('dialog', { name: 'Manage page features' })
    }
    let checklist = await open()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: `Show ${title}` }))
    expect(screen.queryByRole('group', { name: title })).not.toBeInTheDocument()
    expect((await getSettings()).hiddenFeatures).not.toContain(feature)
    cancel(checklist)
    expect(screen.getByRole('group', { name: title })).toBeVisible()
    checklist = await open()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: `Show ${title}` }))
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).toContain(feature))
    expect((await getSettings())[feature]).toEqual(favorites)
    expect((await getSettings()).bindings).toEqual(settings.bindings)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: title } })
    expect(screen.queryByRole('group', { name: title })).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    checklist = await open()
    expect(within(checklist).getByRole('checkbox', { name: `Show ${title}` })).not.toBeChecked()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: `Show ${title}` }))
    expect(screen.getByRole('group', { name: title })).toBeVisible()
    expect((await getSettings()).hiddenFeatures).toContain(feature)
    apply(checklist)
    await waitFor(async () => expect((await getSettings()).hiddenFeatures).not.toContain(feature))
    expect((await getSettings())[feature]).toEqual(favorites)
  })

  it('preserves a list edited in another view while applying its visibility change', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Volume and audio' }))
    const checklist = await openChecklist()
    fireEvent.click(within(checklist).getByRole('checkbox', { name: 'Show Favorite audio tracks' }))
    const audioFavorites = [{ language: 'en', audioDescription: true }]
    await act(async () => { await saveSettings({ ...await getSettings(), audioFavorites }) })
    expect(within(checklist).getByRole('button', { name: 'Apply' })).toBeEnabled()
    apply(checklist)
    await waitFor(async () => {
      const saved = await getSettings()
      expect(saved.hiddenFeatures).toContain('audioFavorites')
      expect(saved.audioFavorites).toEqual(audioFavorites)
    })
  })

  it.each([
    ['Playback', ['Play / Pause', 'Play / Pause hold speed', 'Fullscreen', 'Picture-in-Picture']],
    ['Seeking and navigation', ['Previous frame', 'Next frame', 'Skip intro', 'Previous episode', 'Next episode', 'Forward / Rewind', 'Forward / Rewind 10 seconds', 'Forward / Rewind 20 seconds', 'Jump to position', '50%']],
    ['Subtitles', ['Toggle subtitles', 'Cycle subtitle size', 'Next subtitle language', 'Previous subtitle language', 'Set size · 150%', 'Favorite subtitles']],
    ['Volume and audio', ['Volume up', 'Volume down', 'Mute', 'Previous audio language', 'Next audio language', 'Favorite audio tracks']],
    ['Playback speed', ['Increase speed', 'Decrease speed', 'Preferred speed', 'Set preferred speed', 'Set preferred speed · 2×', 'Reset speed']],
  ] as const)('covers every shortcut-table feature in %s', async (page, labels) => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:relative', kind: 'relative', value: 20 }, { id: 'seek:percentage', kind: 'percentage', value: 50 }]
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:custom', speed: 2 }]
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:custom', kind: 'fixed', sizes: [150] }]
    for (const id of ['seek:relative-backward', 'seek:relative-forward', 'seek:percentage', 'preferred-speed:custom', 'subtitle-size:custom'] as const) settings.bindings[id] = { enabled: true, key: null }
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: page }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Manage page features' })[0])
    const checklist = await screen.findByRole('dialog', { name: 'Manage page features' })
    for (const label of labels) expect(within(checklist).getByRole('checkbox', { name: `Show ${label}` })).toBeInTheDocument()
    expect(within(checklist).getAllByRole('checkbox')).toHaveLength(labels.length)
    cancel(checklist)
    if (page === 'Subtitles') {
      fireEvent.click(screen.getAllByRole('button', { name: 'Manage page features' })[1])
      const navigation = await screen.findByRole('dialog', { name: 'Manage page features' })
      for (const label of ['Previous subtitle', 'Next subtitle', 'Replay current subtitle', 'Play / pause']) expect(within(navigation).getByRole('checkbox', { name: `Show ${label}` })).toBeInTheDocument()
    }
  })

})
