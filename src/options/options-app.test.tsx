import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OptionsApp } from '@/options/options-app'
import { SUBTITLE_ACTIVATION_COPY } from '@/options/subtitle-activation-copy'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { createSettingsBackup, serializeSettingsBackup } from '@/shared/settings-backup'
import { getSettings, saveSettings } from '@/shared/storage'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'

const recordEligibleUpgrade = () => subtitleNavigationAnnouncement.recordInstall(
  { reason: 'update', previousVersion: '0.6.1' } as chrome.runtime.InstalledDetails, '0.6.2',
)

describe('OptionsApp', () => {
  it('focuses and scrolls to the subtitle section from an announcement without enabling it', async () => {
    await recordEligibleUpgrade()
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
      await waitFor(() => expect(document.getElementById('subtitle-navigation')).toHaveFocus())
      expect(document.querySelector('label[for="subtitle-navigation-enabled"]')).toHaveTextContent(SUBTITLE_ACTIVATION_COPY.en.enableLabel)
      const guide = screen.getByRole('dialog', { name: 'Subtitle navigation' })
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
      expect((await getSettings()).subtitlePractice.enabled).toBe(false)
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(toggle).toHaveAttribute('aria-describedby', 'subtitle-activation-guide subtitle-permission-error')
      fireEvent.click(toggle)
      await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      expect(toggle).not.toHaveAttribute('aria-describedby')
      fireEvent.click(toggle)
      await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(false))
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it('updates activation guidance when navigating to and away from the subtitle section', async () => {
    render(<OptionsApp />)
    await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
    try {
      await act(async () => {
        window.history.replaceState(null, '', '/options.html#subtitle-navigation')
        window.dispatchEvent(new HashChangeEvent('hashchange'))
      })
      expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.guide)).toBeInTheDocument()
      expect(document.getElementById('subtitle-navigation')).toHaveFocus()
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
      const guide = await screen.findByRole('dialog', { name: 'Subtitle navigation' })
      await waitFor(() => expect(document.getElementById('subtitle-navigation')).toHaveFocus())
      if (method === 'escape') fireEvent.keyDown(document.getElementById('subtitle-navigation')!, { key: 'Escape', code: 'Escape' })
      else {
        fireEvent.pointerDown(document.body, { button: 0, pointerType: 'mouse' })
        fireEvent.click(document.body)
      }
      await waitFor(() => expect(guide).not.toBeInTheDocument())
      expect(chrome.permissions.request).not.toHaveBeenCalled()
      expect((await getSettings()).subtitlePractice.enabled).toBe(false)
      expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
      await act(async () => { await saveSettings({ ...(await getSettings()), theme: 'dark' }) })
      expect(screen.queryByRole('dialog', { name: 'Subtitle navigation' })).not.toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', '/options.html')
    }
  })

  it.each([false, true])('handles the global prerequisite and existing activation on arrival (%s)', async subtitleEnabled => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.enabled = false
    settings.subtitlePractice.enabled = subtitleEnabled
    await saveSettings(settings)
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    try {
      render(<OptionsApp />)
      const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
      expect(toggle).toBeDisabled()
      expect(screen.getByText(SUBTITLE_PRACTICE_COPY.en.requiresEnabled)).toBeInTheDocument()
      expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.guide)).not.toBeInTheDocument()
      if (!subtitleEnabled) expect(screen.getByText(SUBTITLE_ACTIVATION_COPY.en.permission)).toBeInTheDocument()
      else expect(screen.queryByText(SUBTITLE_ACTIVATION_COPY.en.permission)).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('switch', { name: 'Enable shortcut override' }))
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
    settings.subtitlePractice.enabled = true
    settings.subtitlePractice.bindings.playback.enabled = false
    settings.subtitlePractice.bindings.next.key = { ...settings.subtitlePractice.bindings.playback.key }
    return settings
  }

  it('allows reusing a disabled subtitle key and asks before enabling its former owner', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    settings.subtitlePractice.bindings.playback.enabled = false
    await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Next subtitle' }))
    const editor = screen.getByRole('dialog')
    fireEvent.keyDown(editor, { code: 'KeyW', key: 'w' })
    expect(within(editor).getByRole('button', { name: 'Save' })).toBeEnabled()
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.next.key.code).toBe('KeyW'))
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

  it.each(['practice', 'general'] as const)('transfers a conflicting %s key only after an explicit choice', async group => {
    const settings = subtitleOverlap()
    settings.bindings.mute = { enabled: false, key: { ...settings.bindings.skipIntro.key } }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    const action = group === 'practice' ? 'Play / pause' : 'Mute'
    const other = group === 'practice' ? 'Next subtitle' : 'Skip intro'
    const toggle = await screen.findByRole('switch', { name: `${action} Enabled` })
    vi.mocked(chrome.storage.sync.set).mockClear()
    fireEvent.click(toggle)
    const popover = await screen.findByRole('dialog')
    expect(popover).toHaveTextContent(`This will disable ${other}.`)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    fireEvent.click(within(popover).getByRole('button', { name: `Use for ${action}` }))
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    const next = await getSettings()
    if (group === 'practice') {
      expect(next.subtitlePractice.bindings.playback).toEqual({ ...saved.subtitlePractice.bindings.playback, enabled: true })
      expect(next.subtitlePractice.bindings.next).toEqual({ ...saved.subtitlePractice.bindings.next, enabled: false })
      expect(next.bindings).toEqual(saved.bindings)
    } else {
      expect(next.bindings.mute).toEqual({ ...saved.bindings.mute, enabled: true })
      expect(next.bindings.skipIntro).toEqual({ ...saved.bindings.skipIntro, enabled: false })
      expect(next.subtitlePractice).toEqual(saved.subtitlePractice)
    }
    expect(chrome.storage.sync.set).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('changes the key from the popover without disabling its current owner', async () => {
    const settings = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    const popover = await screen.findByRole('dialog')
    fireEvent.click(within(popover).getByRole('button', { name: 'Change key' }))
    const editor = await screen.findByRole('dialog', { name: 'Record shortcut' })
    expect(within(editor).getByRole('button', { name: 'Save' })).toBeDisabled()
    fireEvent.keyDown(editor, { key: 'q', code: 'KeyQ' })
    fireEvent.click(within(editor).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.playback).toMatchObject({ enabled: true, key: { code: 'KeyQ' } }))
    expect((await getSettings()).subtitlePractice.bindings.next).toEqual(settings.subtitlePractice.bindings.next)
  })

  it('dismisses a conflict without changes when clicking outside', async () => {
    const saved = await saveSettings(subtitleOverlap())
    render(<OptionsApp />)
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
    fireEvent.click(await screen.findByRole('switch', { name: 'Play / pause Enabled' }))
    await screen.findByRole('dialog')
    settings.subtitlePractice.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    settings.subtitlePractice.enabled = true
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Play / pause Enabled' })).toHaveAttribute('aria-checked', 'false')
  })

  it('checks conflicts before a single-row reset changes the key or enables the row', async () => {
    const settings = subtitleOverlap()
    settings.subtitlePractice.bindings.playback = { enabled: true, key: { ...settings.subtitlePractice.bindings.playback.key, code: 'KeyQ', key: 'q' } }
    const saved = await saveSettings(settings)
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Reset Play / pause' }))
    const popover = await screen.findByRole('dialog', { name: 'W is used by Next subtitle' })
    expect(await getSettings()).toEqual(saved)
    fireEvent.click(within(popover).getByRole('button', { name: 'Use for Play / pause' }))
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.playback.key.code).toBe('KeyW'))
    expect((await getSettings()).subtitlePractice.bindings.next.enabled).toBe(false)
  })

  it.each(['Chrome/140.0', 'Firefox/156.0'])('requests subtitle access directly from the switch click in %s', async browser => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 ${browser}`)
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    // Assert before yielding: Firefox requires the request in this user gesture.
    expect(chrome.permissions.request).toHaveBeenCalledExactlyOnceWith({ origins: [
      '*://*.netflix.com/*', 'https://*.nflxvideo.net/*', 'https://*.nflximg.net/*', 'https://*.nflxext.com/*',
    ] })
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(false))
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
  })

  it('keeps subtitle settings unchanged after denying access and allows another attempt', async () => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.subtitlePractice.bindings.next.enabled = false
    custom.subtitlePractice.bindings.previous.key.code = 'KeyZ'
    const saved = await saveSettings(custom)
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => Promise.resolve(false) as never)
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent('Subtitle navigation stays off')
    expect(await getSettings()).toEqual(saved)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice).toEqual({ ...saved.subtitlePractice, enabled: true }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('recovers from a failed permission request without enabling subtitle navigation', async () => {
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => Promise.reject(new Error('API unavailable')) as never)
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not request website access')
    expect(toggle).not.toBeDisabled()
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
  })

  it('does not enable subtitles from a stale approval after the global switch was turned off and on', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    const global = screen.getByRole('switch', { name: 'Enable shortcut override' })
    fireEvent.click(toggle)
    expect(toggle).toBeDisabled()
    fireEvent.click(toggle)
    expect(chrome.permissions.request).toHaveBeenCalledTimes(1)
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
    fireEvent.click(global)
    fireEvent.click(global)
    await act(async () => approve(true))
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
    expect(toggle).not.toBeDisabled()
  })

  it('invalidates subtitle approval when another view turns the global switch off and on', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    const settings = await getSettings()
    await act(async () => {
      await saveSettings({ ...settings, enabled: false })
      await saveSettings({ ...settings, enabled: true })
    })
    await act(async () => approve(true))
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
    expect(toggle).not.toBeDisabled()
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
  })

  it.each([true, false])('keeps a new permission attempt pending after a stale external approval returns %s', async granted => {
    let approveOld!: (granted: boolean) => void
    let approveNew!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request)
      .mockImplementationOnce(() => new Promise<boolean>(resolve => { approveOld = resolve }) as never)
      .mockImplementationOnce(() => new Promise<boolean>(resolve => { approveNew = resolve }) as never)
    render(<OptionsApp />)
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
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
    expect(toggle).toBeDisabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await act(async () => approveNew(true))
    expect((await getSettings()).subtitlePractice.enabled).toBe(true)
    expect(toggle).not.toBeDisabled()
  })

  it('ignores a permission response after closing the options page', async () => {
    let approve!: (granted: boolean) => void
    vi.mocked(chrome.permissions.request).mockImplementationOnce(() => new Promise<boolean>(resolve => { approve = resolve }) as never)
    const { unmount } = render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(toggle)
    unmount()
    await act(async () => approve(true))
    expect((await getSettings()).subtitlePractice.enabled).toBe(false)
  })

  it('persists the subtitle practice master switch and independent row bindings', async () => {
    render(<OptionsApp />)
    const toggle = await screen.findByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    await waitFor(() => expect(toggle).not.toBeDisabled())
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    const card = screen.getByText('Subtitle navigation').closest('[data-slot="card"]') as HTMLElement
    expect(within(card).getAllByRole('switch')).toHaveLength(5)
    expect(card).toHaveTextContent('Previous subtitle')
    expect(card).toHaveTextContent('Replay current subtitle')
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(true))
    const nextToggle = within(card).getByRole('switch', { name: 'Next subtitle Enabled' })
    fireEvent.click(nextToggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.next.enabled).toBe(false))
    fireEvent.click(within(card).getByRole('button', { name: 'Edit Next subtitle' }))
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { code: 'KeyN', key: 'n' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.next.key.code).toBe('KeyN'))
    fireEvent.click(within(card).getByRole('button', { name: 'Reset Next subtitle' }))
    await waitFor(async () => expect((await getSettings()).subtitlePractice.bindings.next.key.code).toBe('KeyD'))
    fireEvent.click(toggle)
    await waitFor(async () => expect((await getSettings()).subtitlePractice.enabled).toBe(false))
  })

  it.each([false, true])('resets subtitle bindings while preserving the master switch (%s) and other settings', async enabled => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.enabled = true
    custom.speed.step = 0.5
    custom.bindings.playPause.enabled = false
    custom.subtitlePractice.enabled = enabled
    custom.subtitlePractice.bindings.previous.key = { code: 'KeyZ', key: 'z', ctrl: false, alt: false, shift: false, meta: false }
    custom.subtitlePractice.bindings.next.enabled = false
    custom.subtitlePractice.bindings.replay.enabled = false
    custom.subtitlePractice.bindings.playback.key = { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false }
    const saved = await saveSettings(custom)
    render(<OptionsApp />)
    const reset = await screen.findByRole('button', { name: 'Reset subtitle shortcuts' })
    await waitFor(() => expect(reset).not.toBeDisabled())
    fireEvent.click(reset)
    await waitFor(async () => expect(await getSettings()).toEqual({
      ...saved,
      subtitlePractice: { ...saved.subtitlePractice, bindings: DEFAULT_SETTINGS.subtitlePractice.bindings },
    }))
  })

  it('shows subtitle navigation guidance in a tooltip instead of a permanent description', async () => {
    render(<OptionsApp />)
    const info = await screen.findByRole('button', { name: 'Subtitle navigation info' })
    expect(screen.queryByText(SUBTITLE_PRACTICE_COPY.en.description)).not.toBeInTheDocument()
    fireEvent.focus(info)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(SUBTITLE_PRACTICE_COPY.en.description)
  })

  it.each([false, true])('disables subtitle controls under the global switch and preserves their settings (%s)', async enabled => {
    const custom = structuredClone(DEFAULT_SETTINGS)
    custom.subtitlePractice.enabled = enabled
    custom.subtitlePractice.bindings.previous.enabled = false
    custom.subtitlePractice.bindings.next.key = { code: 'KeyN', key: 'n', ctrl: false, alt: false, shift: false, meta: false }
    const saved = await saveSettings(custom)
    render(<OptionsApp />)
    const globalSwitch = await screen.findByRole('switch', { name: 'Enable shortcut override' })
    await waitFor(() => expect(globalSwitch).not.toBeDisabled())
    const card = screen.getByText('Subtitle navigation').closest('[data-slot="card"]') as HTMLElement
    const master = within(card).getByRole('switch', { name: 'Enable subtitle navigation shortcuts' })
    fireEvent.click(globalSwitch)
    await waitFor(() => expect(master).toBeDisabled())
    expect(master).toHaveAttribute('aria-checked', String(enabled))
    for (const toggle of within(card).getAllByRole('switch')) expect(toggle).toBeDisabled()
    for (const button of within(card).getAllByRole('button').filter(button => button.getAttribute('aria-label') !== 'Subtitle navigation info')) expect(button).toBeDisabled()
    const info = within(card).getByRole('button', { name: 'Subtitle navigation info' })
    expect(info).not.toBeDisabled()
    fireEvent.focus(info)
    expect(await screen.findByRole('tooltip')).toHaveTextContent(SUBTITLE_PRACTICE_COPY.en.requiresEnabled)
    expect((await getSettings()).subtitlePractice).toEqual(saved.subtitlePractice)
    fireEvent.click(globalSwitch)
    await waitFor(() => expect(master).not.toBeDisabled())
    expect(master).toHaveAttribute('aria-checked', String(enabled))
    expect(within(card).getByRole('button', { name: 'Edit Next subtitle' })).not.toBeDisabled()
    expect((await getSettings()).subtitlePractice).toEqual(saved.subtitlePractice)
  })

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
