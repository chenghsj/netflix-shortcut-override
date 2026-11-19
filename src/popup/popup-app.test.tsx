import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PopupApp } from '@/popup/popup-app'
import { registerFeatureAnnouncements } from '@/background/feature-announcements'
import { EXTERNAL_LINKS } from '@/shared/external-links'
import { OPTIONS_PAGE_HASHES } from '@/shared/options-navigation'
import { PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE } from '@/shared/playback-focus-restoration'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { hideFeatures } from '@/shared/feature-management'
import { getCopy } from '@/shared/i18n'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { getSettings, saveSettings } from '@/shared/storage'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'

const recordEligibleUpgrade = () => subtitleNavigationAnnouncement.recordInstall(
  { reason: 'update', previousVersion: '0.6.2' } as chrome.runtime.InstalledDetails, '0.6.3',
)

const openCompatibilityDiagnostics = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Compatibility' }))
}

const getPopupShortcuts = () => screen.findByRole('region', { name: 'Shortcuts' })

const selectCategory = async (name: string) => {
  fireEvent.click(await screen.findByRole('combobox', { name: 'Shortcut category' }))
  const category = ['Subtitle language and size', 'Sentence jumps and replay'].includes(name) ? 'Subtitles' : name
  fireEvent.click(await screen.findByRole('option', { name: category }))
  return screen.findByRole('region', { name })
}

describe('PopupApp', () => {
  const subscriptions: Array<() => void> = []
  afterEach(() => {
    for (const unsubscribe of subscriptions.splice(0)) unsubscribe()
    vi.restoreAllMocks()
  })

  it('groups episode shortcuts under Playback and frame and intro shortcuts under navigation', async () => {
    render(<PopupApp />)
    const shortcuts = await getPopupShortcuts()
    expect(within(shortcuts).getByText('Play / Pause')).toBeVisible()
    expect(within(shortcuts).getByText('Fullscreen')).toBeVisible()
    expect(within(shortcuts).queryByText('Previous frame')).not.toBeInTheDocument()
    expect(within(shortcuts).getByText('Previous episode')).toBeVisible()
    expect(within(shortcuts).getByText('Next episode')).toBeVisible()
    const navigation = await selectCategory('Seeking and navigation')
    expect(within(navigation).queryByText('Next episode')).not.toBeInTheDocument()
    for (const label of ['Previous frame', 'Next frame', 'Skip intro']) {
      expect(within(navigation).getByText(label)).toBeVisible()
    }
    const pair = within(navigation).getByRole('group', { name: 'Forward / Rewind 10 seconds' })
    expect(within(pair).getByText('10 s')).toBeVisible()
    expect(within(pair).getAllByText(/^(Forward|Rewind)$/).map(label => label.textContent)).toEqual(['Forward', 'Rewind'])
    expect(within(pair).getByRole('group', { name: 'Rewind 10 seconds' })).toBeVisible()
    expect(within(pair).getByRole('group', { name: 'Forward 10 seconds' })).toBeVisible()
    expect(within(navigation).queryByText('Play / Pause')).not.toBeInTheDocument()
    expect(within(navigation).queryByText('Fullscreen')).not.toBeInTheDocument()
  })

  it('shows additional seek keys and finds their modifier aliases', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekForward.additionalKeys = [
      { ...settings.bindings.seekForward.key!, code: 'F20', key: 'F20', meta: true },
    ]
    await saveSettings(settings)
    render(<PopupApp />)
    const navigation = await selectCategory('Seeking and navigation')
    const pair = within(navigation).getByRole('group', { name: 'Forward / Rewind 10 seconds' })
    expect(within(pair).getByText('F20')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'command f20' } })
    expect(await screen.findByText('F20')).toBeVisible()
  })

  it('opens directly on shortcut reference and keeps preferences in Options', async () => {
    render(<PopupApp />)
    expect(await getPopupShortcuts()).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Search actions or keys…' })).toBeVisible()
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(screen.getByText('Play / Pause')).toBeVisible()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getAllByRole('switch')).toHaveLength(1)
    expect(screen.getByRole('switch', { name: 'Enable extension' })).toBeEnabled()
    await screen.findByRole('button', { name: 'Compatibility' })
    expect(within(screen.getByRole('banner')).queryByRole('status')).not.toBeInTheDocument()
    for (const name of ['Language', 'Theme', 'Interface style', 'Lowest speed', 'Highest speed', 'Speed adjustment amount', 'Preferred speed']) {
      expect(screen.queryByLabelText(name)).not.toBeInTheDocument()
    }
    expect(screen.getByRole('combobox', { name: 'Other products' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open GitHub repository' })).toHaveAttribute('href', EXTERNAL_LINKS.githubRepository)
    expect(screen.getByRole('link', { name: 'Open a new GitHub issue' })).toHaveAttribute('href', EXTERNAL_LINKS.githubNewIssue)
    expect(screen.getByRole('link', { name: 'Rate this extension in the extension store' })).toHaveAttribute('href', EXTERNAL_LINKS.shortcutOverrideChromeWebStore)
  })

  it('keeps focus on the selected control when popup settings update', async () => {
    render(<PopupApp />)
    await getPopupShortcuts()
    expect(screen.getByRole('searchbox')).toHaveFocus()
    const enabled = screen.getByRole('switch', { name: 'Enable extension' })
    act(() => enabled.focus())
    fireEvent.click(enabled)
    await waitFor(async () => expect((await getSettings()).enabled).toBe(false))
    expect(enabled).toHaveFocus()
  })

  it('shows nested hold speed and keeps its parent when searching, while respecting disabled and hidden state', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.holdSpeed.speed = 2.75
    settings.bindings.playPause.key = { ...settings.bindings.playPause.key!, code: 'KeyJ', key: 'j' }
    await saveSettings(settings)
    render(<PopupApp />)
    const shortcuts = await getPopupShortcuts()
    const label = 'Hold speed'
    const hold = within(shortcuts).getByText(label).closest('div')!
    expect(hold).toHaveTextContent('2.75×')
    expect(within(hold).queryByText('J')).not.toBeInTheDocument()
    expect(hold.querySelector('[data-slot="kbd"]')).toBeNull()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '長按 2.75' } })
    expect(screen.getByText(label)).toBeVisible()
    expect(screen.getByText('Play / Pause')).toBeVisible()

    settings.holdSpeed.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(within(hold).getByText('Disabled')).toBeVisible()

    settings.hiddenFeatures.push('holdSpeed')
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByText(label)).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.getByText('Play / Pause')).toBeVisible()
  })

  it('shows favorite subtitle languages and audio tracks with Options names and no shortcut fields', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleFavorites = [{ language: 'ja' }, { language: 'en' }]
    settings.audioFavorites = [{ language: 'en', audioDescription: false }, { language: 'en', audioDescription: true }]
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Subtitles')
    const subtitles = screen.getByRole('group', { name: getCopy('en').subtitleFavorites.title })
    expect(within(subtitles).getAllByRole('listitem').map(item => item.textContent)).toEqual(['Japanese', 'English'])
    expect(subtitles.querySelector('[data-slot="kbd"]')).toBeNull()
    expect(within(subtitles).queryByText('Not set')).not.toBeInTheDocument()

    await selectCategory('Volume and audio')
    const audio = screen.getByRole('group', { name: getAudioFavoritesCopy('en').title })
    expect(within(audio).getAllByRole('listitem').map(item => item.textContent)).toEqual(['English', 'English · Audio Description'])
    expect(audio.querySelector('[data-slot="kbd"]')).toBeNull()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Audio Description' } })
    const matches = screen.getByRole('group', { name: getAudioFavoritesCopy('en').title })
    expect(within(matches).getAllByRole('listitem').map(item => item.textContent)).toEqual(['English · Audio Description'])

    settings.hiddenFeatures.push('subtitleFavorites', 'audioFavorites')
    await act(async () => { await saveSettings(settings) })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.queryByRole('group', { name: getAudioFavoritesCopy('en').title })).not.toBeInTheDocument()
    await selectCategory('Subtitles')
    expect(screen.queryByRole('group', { name: getCopy('en').subtitleFavorites.title })).not.toBeInTheDocument()
  })

  it('shows unassigned keys in ordinary shortcuts, seeking and subtitle navigation', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.playPause.key = null
    settings.bindings.seekBackward.key = null
    settings.subtitleNavigation.bindings.previous.key = null
    await saveSettings(settings)
    render(<PopupApp />)
    const shortcuts = await getPopupShortcuts()
    expect(within(shortcuts).getByText('Play / Pause').closest('div')).toHaveTextContent('Not set')
    const seeking = await selectCategory('Seeking and navigation')
    expect(within(seeking).getByRole('group', { name: 'Rewind 10 seconds' })).toHaveTextContent('Not set')
    const subtitles = await selectCategory('Sentence jumps and replay')
    expect(within(subtitles).getByText('Previous subtitle').closest('div')).toHaveTextContent('Not set')
    expect(within(subtitles).getAllByText('Disabled').length).toBeGreaterThan(0)
  })

  it('uses one category at a time and reflects custom seeking and external interval changes', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const relativeId = 'seek:popup-relative' as const
    const percentageId = 'seek:popup-percentage' as const
    settings.seekShortcuts = [{ id: relativeId, kind: 'relative', value: 17 }, { id: percentageId, kind: 'percentage', value: 10 }]
    settings.bindings[`${relativeId}-backward`] = { ...settings.bindings.seekBackward, enabled: false }
    settings.bindings[`${relativeId}-forward`] = { ...settings.bindings.seekForward, key: { ...settings.bindings.seekForward.key!, code: 'KeyL', key: 'l' } }
    settings.bindings[percentageId] = { ...settings.bindings.seekForward, key: { ...settings.bindings.seekForward.key!, code: 'Digit5', key: '5' } }
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()
    expect(screen.getByText('Play / Pause')).toBeVisible()
    expect(screen.queryByText('Toggle subtitles')).not.toBeInTheDocument()
    const seeking = await selectCategory('Seeking and navigation')
    expect(screen.queryByText('Play / Pause')).not.toBeInTheDocument()
    const pair = within(seeking).getByRole('group', { name: 'Forward / Rewind 17 seconds' })
    expect(within(pair).getByRole('group', { name: 'Rewind 17 seconds' })).toHaveTextContent('Disabled')
    expect(within(pair).getByRole('group', { name: 'Forward 17 seconds' })).toHaveTextContent('L')
    expect(within(seeking).getByText('10%').closest('div')).toHaveTextContent('5')
    await act(async () => { await saveSettings({ ...settings, seek: { ...settings.seek, seconds: 30 } }) })
    expect(within(seeking).getByRole('group', { name: 'Forward / Rewind 30 seconds' })).toBeVisible()
    expect(within(seeking).queryByRole('group', { name: 'Forward / Rewind 10 seconds' })).not.toBeInTheDocument()
    await selectCategory('Subtitle language and size')
    expect(screen.getByText('Cycle subtitle size · 80% → 100% → 125%')).toBeVisible()
  })

  it('groups nested seeking and speed shortcuts and keeps matching groups in search', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [
      { id: 'seek:popup-percentage', kind: 'percentage', value: 20 },
      { id: 'seek:popup-relative', kind: 'relative', value: 17 },
      { id: 'seek:popup-other-percentage', kind: 'percentage', value: 40 },
    ]
    for (const action of ['seek:popup-percentage', 'seek:popup-relative-backward', 'seek:popup-relative-forward', 'seek:popup-other-percentage'] as const) {
      settings.bindings[action] = { enabled: true, key: null }
    }
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:popup', speed: 2.5 }]
    settings.bindings['preferred-speed:popup'] = { enabled: false, key: null }
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()

    const seeking = await selectCategory('Seeking and navigation')
    const relative = within(seeking).getByRole('group', { name: 'Forward / Rewind' })
    expect(within(relative).getByRole('group', { name: 'Rewind 10 seconds' })).toBeVisible()
    expect(within(relative).getByRole('group', { name: 'Forward 17 seconds' })).toBeVisible()
    expect(within(relative).queryByText('Next episode')).not.toBeInTheDocument()
    const percentage = within(seeking).getByRole('group', { name: 'Jump to position' })
    expect(within(percentage).getByText('20%')).toBeVisible()
    expect(within(percentage).getByText('40%')).toBeVisible()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '17' } })
    const matches = screen.getByRole('group', { name: 'Forward / Rewind' })
    expect(within(matches).getByRole('group', { name: 'Rewind 17 seconds' })).toBeVisible()
    expect(within(matches).getByRole('group', { name: 'Forward 17 seconds' })).toBeVisible()
    expect(within(matches).queryByRole('group', { name: 'Rewind 10 seconds' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Jump to position' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    const speed = await selectCategory('Playback speed')
    const preferred = within(speed).getByRole('group', { name: 'Preferred speed' })
    expect(within(preferred).getByText(/1\.5×/)).toBeVisible()
    expect(within(preferred).getByText(/2\.5×/)).toBeVisible()
  })

  it('collapses nested shortcut groups independently, retains them across categories, and resets them on reopening', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:popup-collapse', kind: 'percentage', value: 20 }]
    settings.bindings['seek:popup-collapse'] = { enabled: true, key: null }
    await saveSettings(settings)
    const saved = await getSettings()
    const popup = render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Seeking and navigation')
    const relative = screen.getByRole('button', { name: 'Forward / Rewind' })
    const percentage = screen.getByRole('button', { name: 'Jump to position' })
    expect(relative).toHaveAttribute('aria-expanded', 'true')
    expect(percentage).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(relative)
    expect(relative).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('group', { name: 'Forward / Rewind 10 seconds' })).not.toBeInTheDocument()
    expect(screen.getByText('20%')).toBeVisible()
    fireEvent.click(percentage)
    expect(screen.getByText('20%')).not.toBeVisible()

    await selectCategory('Playback speed')
    const preferred = screen.getByRole('button', { name: 'Preferred speed' })
    expect(preferred).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(preferred)
    expect(screen.getByText(/1\.5×/)).not.toBeVisible()
    await selectCategory('Seeking and navigation')
    expect(screen.getByRole('button', { name: 'Forward / Rewind' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Jump to position' })).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Forward / Rewind' }))
    expect(screen.getByRole('group', { name: 'Forward / Rewind 10 seconds' })).toBeVisible()
    await selectCategory('Playback speed')
    expect(screen.getByRole('button', { name: 'Preferred speed' })).toHaveAttribute('aria-expanded', 'false')
    expect(await getSettings()).toEqual(saved)

    popup.unmount()
    render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Seeking and navigation')
    expect(screen.getByRole('button', { name: 'Jump to position' })).toHaveAttribute('aria-expanded', 'true')
    await selectCategory('Playback speed')
    expect(screen.getByRole('button', { name: 'Preferred speed' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('collapses hold speed and favorite languages, temporarily expanding search results without losing disclosure state', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleFavorites = [{ language: 'ja' }]
    settings.audioFavorites = [{ language: 'en', audioDescription: true }]
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()
    const playPause = screen.getByRole('button', { name: 'Play / Pause' })
    expect(playPause).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(playPause)
    expect(screen.getByText('Hold speed')).not.toBeVisible()
    expect(within(playPause).getByText('Space')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '長按' } })
    expect(screen.getByText('Hold speed')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Play / Pause' })).toBeDisabled()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.getByText('Hold speed')).not.toBeVisible()

    await selectCategory('Subtitles')
    fireEvent.click(screen.getByRole('button', { name: getCopy('en').subtitleFavorites.title }))
    expect(screen.getByText('Japanese')).not.toBeVisible()
    await selectCategory('Volume and audio')
    fireEvent.click(screen.getByRole('button', { name: getAudioFavoritesCopy('en').title }))
    expect(screen.getByText('English · Audio Description')).not.toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Japanese' } })
    expect(screen.getByText('Japanese')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } })
    expect(screen.getByText('English · Audio Description')).not.toBeVisible()
    await selectCategory('Subtitles')
    expect(screen.getByText('Japanese')).not.toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: getCopy('en').subtitleFavorites.title }))
    expect(screen.getByText('Japanese')).toBeVisible()
  })

  it('keeps a seek pair together when one key matches search without restoring hidden directions', async () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.seekBackward.key = null
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Seeking and navigation')

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ArrowRight' } })
    const pair = screen.getByRole('group', { name: 'Forward / Rewind 10 seconds' })
    expect(within(pair).getAllByText('10 s')).toHaveLength(1)
    expect(within(pair).getByRole('group', { name: 'Rewind 10 seconds' })).toHaveTextContent('Not set')
    expect(within(pair).getByRole('group', { name: 'Forward 10 seconds' })).toHaveTextContent('→')

    await act(async () => { await saveSettings(hideFeatures(settings, [{ group: 'general', action: 'seekBackward' }])) })
    expect(within(pair).queryByRole('group', { name: 'Rewind 10 seconds' })).not.toBeInTheDocument()
    expect(within(pair).getByRole('group', { name: 'Forward 10 seconds' })).toBeVisible()
  })

  it('searches all categories by action and physical key without persisting temporary navigation', async () => {
    const popup = render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Subtitle language and size')
    vi.mocked(chrome.storage.sync.set).mockClear()
    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'SHIFT + keyd' } })
    expect(screen.getByText('Next audio language')).toBeVisible()
    expect(screen.queryByText('Toggle subtitles')).not.toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('SHIFT + keyd')
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'no-such-action' } })
    expect(screen.getByText('No shortcuts found. Try another action or key.')).toBeVisible()
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' })
    expect(screen.getByRole('combobox', { name: 'Shortcut category' })).toHaveTextContent('Subtitles')
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    popup.unmount()
    render(<PopupApp />)
    await getPopupShortcuts()
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    expect(screen.getByRole('combobox', { name: 'Shortcut category' })).toHaveTextContent('Playback')
  })

  it('finds translated categories and actions while keeping the current interface language', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'en' })
    render(<PopupApp />)
    await getPopupShortcuts()
    const search = screen.getByRole('searchbox')
    for (const query of ['字幕', '자막']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Toggle subtitles')).toBeVisible()
      expect(screen.getByText('Previous subtitle')).toBeVisible()
      expect(screen.queryByText('Mute')).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: '画面' } })
    expect(screen.getByText('Fullscreen')).toBeVisible()
    fireEvent.change(search, { target: { value: '音軌 SHIFT＋KeyD' } })
    expect(screen.getByText('Next audio language')).toBeVisible()
    expect(screen.queryByText('Previous audio language')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '앞으로' } })
    expect(screen.getByRole('group', { name: 'Forward 10 seconds' })).toBeVisible()
  })

  it('uses shared language and function aliases to find shortcuts', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale: 'en' })
    render(<PopupApp />)
    await getPopupShortcuts()
    const search = screen.getByRole('searchbox')
    for (const query of ['日語', '일어', 'US English', '불어']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Next subtitle language')).toBeVisible()
      expect(screen.getByText('Previous subtitle language')).toBeVisible()
      expect(screen.getByText('Next audio language')).toBeVisible()
      expect(screen.getByText('Previous audio language')).toBeVisible()
      expect(screen.queryByText('Toggle subtitles')).not.toBeInTheDocument()
      expect(screen.queryByText('Mute')).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: '日語 shift+KeyD' } })
    expect(screen.getByText('Next audio language')).toBeVisible()
    expect(screen.queryByText('Previous audio language')).not.toBeInTheDocument()
    for (const query of ['pause', '暫停', 'resume']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Play / Pause')).toBeVisible()
    }
    fireEvent.change(search, { target: { value: 'floating player' } })
    expect(screen.getByText('Picture-in-Picture')).toBeVisible()
    expect(screen.queryByText('Fullscreen')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: 'repeat sentence' } })
    expect(screen.getByText('Replay current subtitle')).toBeVisible()
  })

  it.each([
    ['Seeking and navigation', 'seeking'], ['Subtitles', 'subtitles'], ['Playback speed', 'speed'],
  ] as const)('opens the matching Options category for %s without restoring playback focus', async (label, category) => {
    render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory(label)
    fireEvent.click(screen.getByRole('button', { name: `Open settings: ${label}` }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: `chrome-extension://test-extension-id/options.html${OPTIONS_PAGE_HASHES[category]}` })
    act(() => window.dispatchEvent(new Event('pagehide')))
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })

  it('reports Firefox Picture-in-Picture support in its category', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Firefox/156.0')
    render(<PopupApp />)
    await getPopupShortcuts()
    const display = await selectCategory('Playback')
    expect(within(display).getByText('Picture-in-Picture').closest('div')).toHaveTextContent('Unsupported')
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
    await getPopupShortcuts()
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
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
    expect((await getSettings()).subtitleNavigation.enabled).toBe(false)
  })

  it('preserves the subtitle preference when toggling the global switch', async () => {
    await saveSettings({ ...structuredClone(DEFAULT_SETTINGS), subtitleNavigation: { ...structuredClone(DEFAULT_SETTINGS.subtitleNavigation), enabled: true } })
    render(<PopupApp />)
    await getPopupShortcuts()
    const section = await selectCategory('Sentence jumps and replay')
    const saved = await getSettings()
    const globalToggle = screen.getByRole('switch', { name: 'Enable extension' })
    fireEvent.click(globalToggle)
    await waitFor(async () => expect(await getSettings()).toEqual({ ...saved, enabled: false }))
    expect(globalToggle).not.toBeChecked()
    expect(within(section).getByText('Previous subtitle')).toBeVisible()
    expect(within(section).queryByRole('switch')).not.toBeInTheDocument()
    fireEvent.click(globalToggle)
    await waitFor(async () => expect(await getSettings()).toEqual(saved))
    expect(globalToggle).toBeChecked()
    expect(within(section).getByText('Previous subtitle')).toBeVisible()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it('persists dismissal across popup sessions while leaving the feature disabled', async () => {
    await recordEligibleUpgrade()
    const first = render(<PopupApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
    first.unmount()
    render(<PopupApp />)
    await getPopupShortcuts()
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
    settings.subtitleNavigation.enabled = true
    await act(async () => { await saveSettings(settings) })
    await waitFor(() => expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument())
    settings.subtitleNavigation.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
  })

  it('keeps the card when activation fails to save', async () => {
    await recordEligibleUpgrade()
    render(<PopupApp />)
    await screen.findByRole('region', { name: 'New: Subtitle navigation' })
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
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
    await subtitleNavigationAnnouncement.recordInstall({ reason: 'install' } as chrome.runtime.InstalledDetails, '0.6.3')
    render(<PopupApp />)
    await getPopupShortcuts()
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(screen.queryByRole('region', { name: 'New: Subtitle navigation' })).not.toBeInTheDocument()
    await act(async () => { await recordEligibleUpgrade() })
    expect(await screen.findByRole('region', { name: 'New: Subtitle navigation' })).toBeInTheDocument()
  })

  it.each(['Chrome/140.0', 'Firefox/156.0'])('shows configured subtitle keys and precedence in %s', async browser => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(`Mozilla/5.0 ${browser}`)
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    settings.subtitleNavigation.bindings.previous.key = {
      code: 'KeyZ', key: 'z', ctrl: true, alt: false, shift: false, meta: false,
    }
    settings.bindings.volumeUp.key = { ...settings.subtitleNavigation.bindings.previous.key }
    settings.subtitleNavigation.bindings.next.enabled = false
    await saveSettings(settings)
    render(<PopupApp />)

    await getPopupShortcuts()
    const section = await selectCategory('Sentence jumps and replay')
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
    expect(within(replay).getByText('Shortcut priority')).toHaveAttribute('aria-label', 'This key is used by Skip intro. Choose another key for subtitle navigation.')
    expect(within(previous).getByText('Shortcut priority')).toHaveAttribute('aria-label', 'This key is used by Volume up. Choose another key for subtitle navigation.')
    expect(chrome.permissions.request).not.toHaveBeenCalled()
  })

  it('updates legacy subtitle conflict status when a row or master is disabled in Options', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.replay = { enabled: true, key: { ...DEFAULT_SETTINGS.bindings.skipIntro.key } }
    await saveSettings(settings)
    render(<PopupApp />)
    await getPopupShortcuts()
    await selectCategory('Sentence jumps and replay')
    await screen.findByText('Shortcut priority')

    settings.subtitleNavigation.bindings.replay.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(screen.queryByText('Shortcut priority')).not.toBeInTheDocument()
    const section = screen.getByRole('region', { name: 'Sentence jumps and replay' })
    const replay = within(section).getByText('Replay current subtitle').closest('div') as HTMLElement
    expect(within(replay).getByText('Disabled')).toBeInTheDocument()

    settings.subtitleNavigation.enabled = false
    await act(async () => { await saveSettings(settings) })
    expect(within(section).getByText('Replay current subtitle')).toBeVisible()
    expect(screen.queryByText('Shortcut priority')).not.toBeInTheDocument()
  })

  it('uses physical keys and modifiers for localized custom subtitle precedence', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.locale = 'zh-TW'
    settings.subtitleNavigation.enabled = true
    settings.subtitleNavigation.bindings.previous.key = { ...settings.bindings.seekForward.key!, key: 'custom label' }
    await saveSettings(settings)
    render(<PopupApp />)
    fireEvent.click(await screen.findByRole('combobox', { name: '快捷鍵分類' }))
    fireEvent.click(screen.getByRole('option', { name: '字幕' }))
    const section = await screen.findByRole('region', { name: '逐句跳轉與重播' })
    expect(within(section).getByText('一般快捷鍵優先')).toHaveAttribute('aria-label', '這個按鍵由「快轉」使用，請為字幕導航設定其他按鍵。')
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

  it('opens the full options page', async () => {
    render(<PopupApp />)

    const openOptionsButton = await screen.findByRole('button', { name: 'Open options' })
    expect(openOptionsButton).toHaveAttribute('data-variant', 'ghost')
    expect(openOptionsButton).toHaveAttribute('title', 'Open options')
    expect(screen.getByRole('banner')).toContainElement(openOptionsButton)
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

    expect(await screen.findByText('Shortcuts only run in Netflix playback contexts.')).toBeVisible()
    expect(screen.queryByText('Compatibility')).not.toBeInTheDocument()
  })

  it.each([false, true])('clears the pending header after readiness recovers (visit diagnostics: %s)', async visitDiagnostics => {
    vi.useFakeTimers()
    let requests = 0
    vi.mocked(chrome.tabs.sendMessage).mockImplementation(
      (_tabId, _message, optionsOrCallback, maybeCallback) => {
        const callback = typeof optionsOrCallback === 'function' ? optionsOrCallback : maybeCallback
        requests += 1
        callback?.({
          contentScriptReady: true, settingsLoaded: true, enabled: true, videoFound: true,
          bridgeReady: true, playerApiFound: true, playerFound: requests > (visitDiagnostics ? 3 : 1), pipSupported: true, pipActive: false,
        })
      },
    )
    try {
      render(<PopupApp />)
      await act(async () => { await vi.advanceTimersByTimeAsync(0) })
      const header = screen.getByRole('banner')
      expect(within(header).getByRole('status')).toHaveTextContent('The Netflix player is not ready yet. Retrying automatically…')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      if (visitDiagnostics) {
        fireEvent.click(screen.getByRole('button', { name: 'Compatibility' }))
        await act(async () => { await vi.advanceTimersByTimeAsync(0) })
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
        await act(async () => { await vi.advanceTimersByTimeAsync(0) })
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      }
      await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
      expect(within(header).queryByRole('status')).not.toBeInTheDocument()
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(visitDiagnostics ? 4 : 2)
      await act(async () => { await vi.advanceTimersByTimeAsync(4_000) })
      expect(chrome.tabs.sendMessage).toHaveBeenCalledTimes(visitDiagnostics ? 4 : 2)
    } finally {
      vi.useRealTimers()
    }
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
    const retryingStatus = await within(screen.getByRole('dialog')).findByText(
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
    const warningStatus = await within(screen.getByRole('dialog')).findByText('Some playback features may be unavailable.')
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
    expect(within(screen.getByRole('banner')).getByRole('status')).toHaveTextContent('Checking compatibility…')

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
    expect(within(screen.getByRole('banner')).queryByRole('status')).not.toBeInTheDocument()
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
