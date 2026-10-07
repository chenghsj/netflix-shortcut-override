import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PopupApp } from '@/popup/popup-app'
import { registerFeatureAnnouncements } from '@/background/feature-announcements'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE } from '@/shared/playback-focus-restoration'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'

const recordEligibleUpgrade = () => subtitleNavigationAnnouncement.recordInstall(
  { reason: 'update', previousVersion: '0.6.1' } as chrome.runtime.InstalledDetails, '0.6.2',
)

const openCompatibilityDiagnostics = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Compatibility' }))
}

describe('PopupApp', () => {
  const subscriptions: Array<() => void> = []
  afterEach(() => {
    for (const unsubscribe of subscriptions.splice(0)) unsubscribe()
    vi.restoreAllMocks()
  })

  it('clears NEW on viewing and does not show the introduction again while the feature remains disabled', async () => {
    await recordEligibleUpgrade()
    subscriptions.push(registerFeatureAnnouncements())
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    const popup = render(<PopupApp />)
    const card = await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    await waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    await waitFor(() => expect(within(card).queryByText('NEW')).not.toBeInTheDocument())
    expect(within(card).getByRole('button', { name: 'Go to enable' })).toBeInTheDocument()
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    popup.unmount()
    render(<PopupApp />)
    const subtitleSection = await screen.findByRole('region', { name: 'Subtitle navigation' })
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
    expect(within(subtitleSection).getByRole('button', { name: 'Go to enable' })).toBeInTheDocument()
    expect(within(subtitleSection).getByText('Not enabled')).toBeInTheDocument()
  })

  it('does not mark the introduction as seen while settings are still loading', async () => {
    await recordEligibleUpgrade()
    const original = vi.mocked(chrome.storage.sync.get).getMockImplementation()!
    let release!: () => void
    vi.mocked(chrome.storage.sync.get).mockImplementationOnce((keys, callback) => {
      release = () => original(keys, callback)
    })
    render(<PopupApp />)
    await waitFor(() => expect(screen.getByRole('main', { name: 'Loading' })).toBeInTheDocument())
    // Drain the independent announcement read while the settings form is held.
    await act(async () => { expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true) })
    expect(chrome.storage.local.set).not.toHaveBeenCalledWith(
      { [subtitleNavigationAnnouncement.keys.seen]: true }, expect.any(Function),
    )
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(true)
    await act(async () => { release() })
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    await waitFor(async () => expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false))
  })

  it('waits for a hidden popup to become visible before recording a view', async () => {
    await recordEligibleUpgrade()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(true)
    visibility.mockReturnValue('visible')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    await waitFor(async () => expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
  })

  it('retries recording a view on reopening after a storage failure', async () => {
    await recordEligibleUpgrade()
    const original = vi.mocked(chrome.storage.local.set).getMockImplementation()!
    vi.mocked(chrome.storage.local.set).mockImplementationOnce((_items, callback) => {
      Object.defineProperty(chrome.runtime, 'lastError', { configurable: true, value: { message: 'Storage unavailable' } })
      callback?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
    })
    const popup = render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    await waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { [subtitleNavigationAnnouncement.keys.seen]: true }, expect.any(Function),
    ))
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(true)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    popup.unmount()
    vi.mocked(chrome.storage.local.set).mockImplementation(original)
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    await waitFor(async () => expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
  })

  it('retires the introduction when going to settings without requiring activation', async () => {
    await recordEligibleUpgrade()
    vi.spyOn(window, 'close').mockImplementation(() => undefined)
    render(<PopupApp />)
    const announcement = await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    expect(announcement).toHaveTextContent('Enable it in settings')
    fireEvent.click(within(announcement).getByRole('button', { name: 'Go to enable' }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-extension-id/options.html#subtitle-navigation',
    })
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    await waitFor(() => expect(announcement).not.toBeInTheDocument())
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    const subtitleSection = screen.getByRole('region', { name: 'Subtitle navigation' })
    expect(within(subtitleSection).getByText('Not enabled')).toBeInTheDocument()
  })

  it('opens subtitle settings from the persistent inactive section after the introduction has been read', async () => {
    await recordEligibleUpgrade()
    await subtitleNavigationAnnouncement.markSeen()
    render(<PopupApp />)
    const subtitleSection = await screen.findByRole('region', { name: 'Subtitle navigation' })
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
    fireEvent.click(within(subtitleSection).getByRole('button', { name: 'Go to enable' }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'chrome-extension://test-extension-id/options.html#subtitle-navigation' })
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false)
  })

  it('persists dismissal across popup sessions while leaving the feature disabled', async () => {
    await recordEligibleUpgrade()
    const first = render(<PopupApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
    first.unmount()
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'Subtitle navigation' })
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
  })

  it('keeps the announcement and offers retry when dismissal cannot be saved', async () => {
    await recordEligibleUpgrade()
    render(<PopupApp />)
    await screen.findByRole('button', { name: 'Dismiss' })
    vi.mocked(chrome.storage.local.set).mockImplementationOnce((_items, callback) => {
      Object.defineProperty(chrome.runtime, 'lastError', { configurable: true, value: { message: 'Storage unavailable' } })
      callback?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
    })
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please try again')
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
  })

  it('removes the card after activation is persisted in Options', async () => {
    await recordEligibleUpgrade()
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    await act(async () => { await saveSettings(settings) })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
    settings.subtitlePractice.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
  })

  it('keeps the card when activation fails to save', async () => {
    await recordEligibleUpgrade()
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    vi.mocked(chrome.storage.sync.set).mockImplementationOnce((_items, callback) => {
      Object.defineProperty(chrome.runtime, 'lastError', { configurable: true, value: { message: 'Save failed' } })
      callback?.()
      Reflect.deleteProperty(chrome.runtime, 'lastError')
    })
    await expect(saveSettings(settings)).rejects.toThrow('Save failed')
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
    expect(screen.getByRole('region', { name: 'New: Subtitle navigation' })).toBeInTheDocument()
  })

  it('honors dismissal changes from another extension page', async () => {
    await recordEligibleUpgrade()
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    await act(async () => { await subtitleNavigationAnnouncement.dismiss() })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
  })

  it('hides the announcement after a fresh install and reacts to upgrade eligibility from the background', async () => {
    await subtitleNavigationAnnouncement.recordInstall({ reason: 'install' } as chrome.runtime.InstalledDetails, '0.6.2')
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'Subtitle navigation' })
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
    await act(async () => { await recordEligibleUpgrade() })
    expect(await screen.findByRole('region', { name: 'New: Subtitle navigation' })).toBeInTheDocument()
  })

  it.each(['subtitle master', 'global override'])('collapses subtitle navigation when the %s is off', async master => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = master === 'global override'
    settings.enabled = master !== 'global override'
    await saveSettings(settings)
    render(<PopupApp />)

    const section = await screen.findByRole('region', { name: 'Subtitle navigation' })
    expect(within(section).getByText('Not enabled')).toBeInTheDocument()
    expect(within(section).queryByText('Previous subtitle')).not.toBeInTheDocument()
    const skipIntro = screen.getByText('Skip intro').closest('div') as HTMLElement
    expect(within(skipIntro).getByText('S')).toBeInTheDocument()
    expect(screen.queryByText('Subtitle priority')).not.toBeInTheDocument()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it.each(['Chrome/140.0', 'Firefox/156.0'])('shows configured subtitle keys and precedence in %s', async browser => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 ${browser}`)
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    settings.subtitlePractice.bindings.previous.key = {
      code: 'KeyZ', key: 'z', ctrl: true, alt: false, shift: false, meta: false,
    }
    settings.subtitlePractice.bindings.next.enabled = false
    await saveSettings(settings)
    render(<PopupApp />)

    const section = await screen.findByRole('region', { name: 'Subtitle navigation' })
    const previous = within(section).getByText('Previous subtitle').closest('div') as HTMLElement
    expect(within(previous).getByText('Ctrl')).toBeInTheDocument()
    expect(within(previous).getByText('Z')).toBeInTheDocument()
    expect(within(previous).queryByText('A')).not.toBeInTheDocument()
    const next = within(section).getByText('Next subtitle').closest('div') as HTMLElement
    expect(within(next).getByText('Disabled')).toBeInTheDocument()
    const replay = within(section).getByText('Replay current subtitle').closest('div') as HTMLElement
    expect(within(replay).getByText('S')).toBeInTheDocument()
    const playback = within(section).getByText('Play / pause').closest('div') as HTMLElement
    expect(within(playback).getByText('W')).toBeInTheDocument()
    const skipIntro = screen.getByText('Skip intro').closest('div') as HTMLElement
    expect(within(skipIntro).getByText('Subtitle priority')).toHaveAttribute(
      'aria-label', 'This key is used by Replay current subtitle in Subtitle navigation.'
    )
    expect(within(skipIntro).queryByText('S')).not.toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
    expect(within(section).queryByRole('switch')).not.toBeInTheDocument()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it('updates subtitle precedence when a row or the master is disabled in Options', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    await saveSettings(settings)
    render(<PopupApp />)
    await screen.findByText('Subtitle priority')

    settings.subtitlePractice.bindings.replay.enabled = false
    await act(async () => { await saveSettings(settings) })
    const skipIntro = screen.getByText('Skip intro').closest('div') as HTMLElement
    expect(within(skipIntro).getByText('S')).toBeInTheDocument()
    expect(screen.queryByText('Subtitle priority')).not.toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Subtitle navigation' })
    const replay = within(section).getByText('Replay current subtitle').closest('div') as HTMLElement
    expect(within(replay).getByText('Disabled')).toBeInTheDocument()

    settings.subtitlePractice.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(within(section).getByText('Not enabled')).toBeInTheDocument()
    expect(within(section).queryByText('Replay current subtitle')).not.toBeInTheDocument()
  })

  it('uses physical keys and modifiers for localized custom subtitle precedence', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.locale = 'zh-TW'
    settings.subtitlePractice.enabled = true
    settings.subtitlePractice.bindings.replay.key.shift = true
    await saveSettings(settings)
    render(<PopupApp />)
    const section = await screen.findByRole('region', { name: '字幕導航' })
    const skipIntro = screen.getByText('略過片頭').closest('div') as HTMLElement
    expect(within(skipIntro).getByText('S')).toBeInTheDocument()
    expect(screen.queryByText('字幕導航優先')).not.toBeInTheDocument()

    // Match the actual shortcut router: physical code and modifiers, not key text.
    settings.subtitlePractice.bindings.previous.key = {
      ...settings.bindings.seekForward.key, key: 'custom label',
    }
    await act(async () => { await saveSettings(settings) })
    const seekForward = screen.getByText('快轉').closest('div') as HTMLElement
    expect(within(seekForward).getByText('字幕導航優先')).toHaveAttribute(
      'aria-label', '這個按鍵由字幕導航的「上一句」使用。'
    )
    expect(within(skipIntro).getByText('S')).toBeInTheDocument()
    expect(within(section).getByText('→')).toBeInTheDocument()
  })

  it('explains prolonged Netflix loading without reporting compatibility ready', async () => {
    vi.useFakeTimers()
    vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
      callback([
        {
          id: 1,
          windowId: 1,
          status: 'loading',
          url: 'https://www.netflix.com/watch/123',
        } as chrome.tabs.Tab,
      ])
    })

    try {
      render(<PopupApp />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })

      expect(
        screen.getByRole('button', { name: 'Checking compatibility…' })
      ).toBeDisabled()
      expect(
        screen.queryByText(
          'Netflix is still loading. Compatibility will be checked automatically when loading finishes.'
        )
      ).not.toBeInTheDocument()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000)
      })

      expect(
        screen.getByText(
          'Netflix is still loading. Compatibility will be checked automatically when loading finishes.'
        )
      ).toBeInTheDocument()
      expect(chrome.tabs.sendMessage).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders key summary and speed settings without a ready status card', async () => {
    render(<PopupApp />)

    expect(await screen.findByText('Shortcut Override')).toBeInTheDocument()
    expect(screen.getByRole('main').firstElementChild).toHaveClass('p-3')
    expect(screen.getByRole('main').firstElementChild).not.toHaveClass('pr-[18px]')
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute(
      'href',
      EXTERNAL_LINKS.githubRepository
    )
    expect(
      screen.getByRole('link', { name: 'Rate this extension in the extension store' })
    ).toHaveAttribute('href', EXTERNAL_LINKS.shortcutOverrideChromeWebStore)
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    expect(screen.getByText('General settings')).toBeInTheDocument()
    expect(screen.queryByText('Netflix playback features are ready.')).not.toBeInTheDocument()
    await waitFor(() => expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Open a Netflix title to use shortcuts.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('Shortcuts only run in Netflix playback contexts.')
    ).not.toBeInTheDocument()
    expect(screen.getByText('Space')).toBeInTheDocument()
    expect(screen.getByText('Play / Pause (hold for speed)')).toBeInTheDocument()
    expect(screen.getByText('Space').closest('[data-slot="kbd"]')).toBeInTheDocument()
    const subtitleShortcut = screen.getByText('Toggle subtitles').closest('div')
    expect(subtitleShortcut).not.toBeNull()
    expect(within(subtitleShortcut as HTMLElement).getByText('C')).toBeInTheDocument()
    const localeCombobox = screen.getByRole('combobox', { name: 'Language' })
    const themeCombobox = screen.getByRole('combobox', { name: 'Theme' })
    const enabledSwitch = screen.getByRole('switch', { name: 'Enable shortcut override' })
    expect(localeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(themeCombobox.compareDocumentPosition(enabledSwitch)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(screen.getByLabelText('Lowest speed')).toHaveValue(0.25)
    expect(screen.getByLabelText('Highest speed')).toHaveValue(3)
    expect(screen.getByLabelText('Speed adjustment amount')).toHaveValue(0.25)
    expect(screen.getByLabelText('Preferred speed')).toHaveValue(1.5)
    expect(screen.getByLabelText('Hold speed')).toHaveValue(2)
    expect(screen.getByRole('switch', { name: 'Play / Pause hold speed: Enabled' })).toHaveAttribute(
      'aria-checked',
      'true'
    )
    expect(
      screen.getByRole('switch', { name: 'Play / Pause hold speed: Show speed hint' })
    ).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByRole('button', { name: 'Enabled info' })).not.toBeInTheDocument()
    const seekInput = screen.getByLabelText('Seconds per seek')
    expect(seekInput).toHaveValue(10)
    expect(seekInput).toHaveAttribute('max', '60')
    const speedSection = screen.getByText('Playback speed').closest('section')
    expect(speedSection).not.toBeNull()
    expect(within(speedSection as HTMLElement).queryByLabelText('Seconds per seek')).not.toBeInTheDocument()
    const seekSection = screen.getByText('Seek shortcuts').closest('section')
    expect(seekSection).not.toBeNull()
    expect(within(seekSection as HTMLElement).getByLabelText('Seconds per seek')).toBe(
      seekInput
    )
    expect(screen.getByRole('button', { name: 'Enable shortcut override info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lowest speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Highest speed info' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Speed adjustment amount info' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hold speed info' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Seconds per seek info' })).toBeInTheDocument()
    expect(localeCombobox).toHaveTextContent('Auto')
    expect(themeCombobox).toHaveTextContent('Auto')

    await openCompatibilityDiagnostics()
    expect(await screen.findByText('Netflix playback features are ready.')).toBeInTheDocument()
    const diagnosticsRegion = screen.getByRole('region', { name: 'Compatibility' })
    expect(diagnosticsRegion).toHaveClass('p-3')
    expect(diagnosticsRegion).not.toHaveClass('pr-10')
    expect(screen.getByText('Netflix player API')).toBeInTheDocument()
    expect(screen.getAllByText('Found')).toHaveLength(2)
  })

  it('persists quick setting toggles', async () => {
    render(<PopupApp />)

    const enabledSwitch = await screen.findByRole('switch', {
      name: 'Enable shortcut override',
    })
    fireEvent.click(enabledSwitch)

    await waitFor(() => {
      expect(enabledSwitch).toHaveAttribute('aria-checked', 'false')
    })
  })

  it('persists popup theme changes', async () => {
    render(<PopupApp />)

    const themeCombobox = await screen.findByRole('combobox', { name: 'Theme' })
    fireEvent.click(themeCombobox)
    fireEvent.click(await screen.findByText('Dark'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveTextContent('Dark')
      expect(document.documentElement).toHaveClass('dark')
    })
  })

  it('persists popup language changes', async () => {
    render(<PopupApp />)

    const localeCombobox = await screen.findByRole('combobox', { name: 'Language' })
    fireEvent.click(localeCombobox)
    fireEvent.click(await screen.findByText('繁中'))

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '語言' })).toHaveTextContent('繁中')
    })
  })

  it('persists popup speed changes', async () => {
    render(<PopupApp />)

    const stepInput = await screen.findByLabelText('Speed adjustment amount')
    fireEvent.change(stepInput, { target: { value: '0.35' } })
    fireEvent.blur(stepInput)

    await waitFor(() => expect(stepInput).toHaveValue(0.35))
  })

  it('persists the popup preferred speed', async () => {
    render(<PopupApp />)

    const preferredInput = await screen.findByLabelText('Preferred speed')
    fireEvent.change(preferredInput, { target: { value: '2.25' } })
    fireEvent.blur(preferredInput)

    await waitFor(() => expect(preferredInput).toHaveValue(2.25))
  })

  it('persists popup seek second changes', async () => {
    render(<PopupApp />)

    const seekInput = await screen.findByLabelText('Seconds per seek')
    fireEvent.change(seekInput, { target: { value: '20' } })
    fireEvent.blur(seekInput)

    await waitFor(() => expect(seekInput).toHaveValue(20))
  })

  it('opens the full options page', async () => {
    render(<PopupApp />)

    const openOptionsButton = await screen.findByRole('button', { name: 'Open options' })
    expect(openOptionsButton).toHaveAttribute('data-variant', 'ghost')
    expect(openOptionsButton).toHaveAttribute('data-size', 'icon-sm')
    expect(openOptionsButton).toHaveAttribute('title', 'Open options')
    expect(openOptionsButton).toHaveTextContent('')
    expect(openOptionsButton.querySelector('svg')).toBeInTheDocument()

    fireEvent.click(openOptionsButton)
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce()
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('closes the Firefox popup after opening the full options page', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    const closePopup = vi.spyOn(window, 'close').mockImplementation(() => undefined)

    render(<PopupApp />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open options' }))

    expect(chrome.runtime.openOptionsPage).toHaveBeenCalledOnce()
    expect(closePopup).toHaveBeenCalledOnce()
  })

  it('requests Netflix focus restoration when the popup closes', async () => {
    render(<PopupApp />)
    await screen.findByRole('button', { name: 'Compatibility' })

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
      tabId: 1,
      windowId: 1,
    })
  })

  it('can restore focus when the popup closes before page detection finishes', async () => {
    const queryCallbacks: Array<(tabs: chrome.tabs.Tab[]) => void> = []
    vi.mocked(chrome.tabs.query).mockImplementation((_query, callback) => {
      queryCallbacks.push(callback)
    })
    render(<PopupApp />)

    expect(queryCallbacks).toHaveLength(1)
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(queryCallbacks).toHaveLength(1)

    act(() => {
      queryCallbacks[0]([
        {
          id: 17,
          windowId: 3,
          url: 'https://www.netflix.com/watch/123',
        } as chrome.tabs.Tab,
      ])
    })

    await waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 17,
        windowId: 3,
      })
    })
  })

  it('does not restore Netflix focus after opening GitHub', async () => {
    render(<PopupApp />)
    const githubLink = await screen.findByRole('link', {
      name: 'Open GitHub repository',
    })

    fireEvent.click(githubLink)
    act(() => window.dispatchEvent(new Event('pagehide')))

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('does not restore Netflix focus after opening another project', async () => {
    render(<PopupApp />)
    fireEvent.click(await screen.findByRole('combobox', { name: 'Other products' }))
    fireEvent.click(await screen.findByText('Stream Danmaku'))

    act(() => window.dispatchEvent(new Event('pagehide')))

    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('shows a Netflix-only message outside Netflix', async () => {
    vi.mocked(chrome.tabs.query).mockImplementationOnce((_query, callback) => {
      callback([{ id: 1, url: 'https://example.com/' } as chrome.tabs.Tab])
    })

    render(<PopupApp />)

    expect(
      await screen.findByText('Shortcuts only run in Netflix playback contexts.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Compatibility')).not.toBeInTheDocument()
  })

  it('shows compatibility warnings returned by the Netflix content script', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: false,
          playerApiFound: false,
          playerFound: false,
          pipSupported: true,
          pipActive: false,
          error: 'No page bridge response.',
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const retryingStatus = await screen.findByText(
      'The Netflix player is not ready yet. Retrying automatically…'
    )
    expect(retryingStatus.closest('div')?.querySelector('svg')).toHaveClass('animate-spin')
    expect(screen.getAllByText('Missing')).toHaveLength(2)
  })

  it('shows a stable compatibility warning when only Picture-in-Picture is unsupported', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: true,
          playerApiFound: true,
          playerFound: true,
          pipSupported: false,
          pipActive: false,
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const warningStatus = await screen.findByText('Some playback features may be unavailable.')
    expect(warningStatus.closest('div')?.querySelector('svg')).not.toHaveClass('animate-spin')
    expect(screen.queryByText(/Retrying automatically/)).not.toBeInTheDocument()
  })

  it('hides the page bridge row for Firefox fallback diagnostics', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0'
    )
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        callback?.({
          contentScriptReady: true,
          settingsLoaded: true,
          enabled: true,
          videoFound: true,
          bridgeReady: false,
          playerApiFound: true,
          playerFound: true,
          pipSupported: false,
          pipActive: false,
        })
      }
    )

    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    expect(await screen.findByText('Netflix player API')).toBeInTheDocument()
    expect(screen.queryByText('Page bridge')).not.toBeInTheDocument()
  })

  it('keeps a disabled animated compatibility control visible while checking', async () => {
    let resolveDiagnostics:
      | ((response: Record<string, unknown>) => void)
      | undefined
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        resolveDiagnostics =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
      }
    )

    render(<PopupApp />)

    const checkingButton = await screen.findByRole('button', {
      name: 'Checking compatibility…',
    })
    expect(checkingButton).toBeDisabled()
    expect(checkingButton.querySelector('svg')).toHaveClass('animate-spin')

    act(() => {
      resolveDiagnostics?.({
        contentScriptReady: true,
        settingsLoaded: true,
        enabled: true,
        videoFound: true,
        bridgeReady: true,
        playerApiFound: true,
        playerFound: true,
        pipSupported: true,
        pipActive: false,
      })
    })

    expect(await screen.findByRole('button', { name: 'Compatibility' })).toBeEnabled()
  })

  it('offers to reload Netflix when the content script is missing', async () => {
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, _optionsOrCallback, maybeCallback) => {
        const callback =
          typeof _optionsOrCallback === 'function' ? _optionsOrCallback : maybeCallback
        Object.defineProperty(chrome.runtime, 'lastError', {
          configurable: true,
          value: {
            message: 'Could not establish connection. Receiving end does not exist.',
          },
        })
        callback?.(undefined as unknown as Record<string, unknown>)
        Object.defineProperty(chrome.runtime, 'lastError', {
          configurable: true,
          value: undefined,
        })
      }
    )

    render(<PopupApp />)
    const connectionAlert = await screen.findByRole('alert', {
      name: 'Extension not active',
    })
    expect(connectionAlert).toHaveTextContent(
      'Reload the Netflix tab to reconnect the extension.'
    )
    expect(
      screen.queryByRole('button', {
        name: 'Compatibility: Extension not active',
      })
    ).not.toBeInTheDocument()
    try {
      const closePopup = vi.spyOn(window, 'close').mockImplementation(() => undefined)
      expect(screen.queryByText(/Retrying automatically/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Copy diagnostics' })).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Reload Netflix' }))
      await act(async () => {
        window.dispatchEvent(new Event('pagehide'))
        await Promise.resolve()
      })
      expect(chrome.tabs.reload).toHaveBeenCalledWith(1)
      expect(closePopup).toHaveBeenCalledOnce()
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
        tabId: 1,
        windowId: 1,
      })
      expect(screen.queryByRole('alert', { name: 'Extension not active' })).not.toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Checking compatibility…' })
      ).toBeDisabled()
    } finally {
      Object.defineProperty(chrome.runtime, 'lastError', {
        configurable: true,
        value: undefined,
      })
    }
  })

  it('copies a privacy-safe compatibility report', async () => {
    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    fireEvent.click(await screen.findByRole('button', { name: 'Copy diagnostics' }))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Extension version: 0.4.1')
      )
    })
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.not.stringContaining('https://www.netflix.com/watch/123')
    )
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('locks background scrolling while compatibility diagnostics are open', async () => {
    render(<PopupApp />)

    await openCompatibilityDiagnostics()
    const wheelWhileOpen = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })
    document.dispatchEvent(wheelWhileOpen)
    expect(wheelWhileOpen.defaultPrevented).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    const wheelAfterClose = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })
    document.dispatchEvent(wheelAfterClose)
    expect(wheelAfterClose.defaultPrevented).toBe(false)
  })

})
