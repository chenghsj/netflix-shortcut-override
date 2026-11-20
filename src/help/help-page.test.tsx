import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OptionsApp } from '@/options/options-app'
import { PopupApp } from '@/popup/popup-app'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { LOCALES, type ShortcutSettings } from '@/shared/shortcut-types'
import { getSettings, saveSettings } from '@/shared/storage'
import { HelpPage } from './help-page'
import { HELP_UI_COPY } from './help-copy'
import { createHelpTopics, HELP_TOPIC_COPY, matchesHelpTopic } from './help-topics'
import { SPECIAL_KEY_GUIDE_COPY } from './special-key-copy'

const configuredSettings = (): ShortcutSettings => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.seekShortcuts = [{ id: 'seek:forty', kind: 'relative', value: 40 }, { id: 'seek:half', kind: 'percentage', value: 50 }]
  settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:large', kind: 'fixed', sizes: [175] }]
  settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:fast', speed: 4.5 }]
  for (const [index, action] of ['seek:forty-forward', 'seek:forty-backward', 'seek:half', 'subtitle-size:large', 'preferred-speed:fast'].entries()) {
    settings.bindings[action as keyof typeof settings.bindings] = { enabled: true, key: { code: `Digit${index + 1}`, key: String(index + 1), alt: true, ctrl: false, meta: false, shift: false } }
  }
  settings.bindings.playPause.key = { code: 'KeyJ', key: 'j', alt: false, ctrl: false, meta: false, shift: false }
  return settings
}

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('Guide coverage and search', () => {
  it.each(LOCALES)('finds special keys and aliases without showing technical code lists in %s', locale => {
    const topics = createHelpTopics(locale)
    for (const query of ['MediaTrackNext', 'MediaNextTrack', 'VolumeMute', 'BrowserBack', '上一頁']) {
      expect(topics.filter(topic => matchesHelpTopic(topic, query)).map(topic => topic.id)).toContain('supportedKeys')
    }
    render(<HelpPage locale={locale} query="BrowserBack" />)
    const instructions = screen.getByRole('article', { name: HELP_TOPIC_COPY[locale].supportedKeys[0] })
    expect(instructions).toBeVisible()
    const copy = SPECIAL_KEY_GUIDE_COPY[locale]
    expect(within(instructions).getByRole('heading', { name: copy.reservedTitle })).toBeVisible()
    expect(within(instructions).getByText(/Win.*Command/)).toBeVisible()
    expect(within(instructions).getByText(/^Fn\s*[:：]/)).toBeVisible()
    expect(within(instructions).queryByText(copy.aliasesTitle)).not.toBeInTheDocument()
    expect(instructions.querySelector('code')).toBeNull()
    expect(within(instructions).getByRole('link')).toHaveAttribute('href', '#playback')
  })

  it('keeps four essential categories and shows totals only for search results', () => {
    const props = { locale: 'en' as const }
    const view = render(<HelpPage {...props} query="" />)
    for (const category of HELP_UI_COPY.en.categories) {
      expect(screen.getByRole('button', { name: new RegExp(`^${category}`) })).toHaveAttribute('aria-expanded', 'false')
    }
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText('Find a feature, learn its controls, and open its settings.')).not.toBeInTheDocument()
    expect(document.querySelector('#help-playback')).toBeNull()
    expect(document.querySelector('#help-volume')).toBeNull()
    expect(document.querySelector('#help-general')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Feature behavior and limitations/ })).not.toBeInTheDocument()
    view.rerender(<HelpPage {...props} query="MediaNextTrack" />)
    expect(screen.getByRole('status')).toHaveTextContent('1 matching topics')
    expect(screen.getByRole('heading', { name: HELP_TOPIC_COPY.en.supportedKeys[0] })).toBeVisible()
    view.rerender(<HelpPage {...props} query="" />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it.each(LOCALES)('keeps translated workflow instructions without standalone feature guides in %s', locale => {
    const topics = createHelpTopics(locale)
    expect(new Set(topics.map(topic => topic.id))).toEqual(new Set(Object.keys(HELP_TOPIC_COPY[locale])))
    for (const removed of ['hold', 'pip', 'frames', 'subtitleFavorites', 'audioFavorites', 'sentenceActivation', 'sentenceReplay', 'preferredSpeed']) {
      expect(topics.map(topic => topic.id)).not.toContain(removed)
    }
    expect(Object.keys(HELP_TOPIC_COPY[locale])).toEqual(Object.keys(HELP_TOPIC_COPY.en))
    expect(topics.every(topic => topic.title.length > 0 && topic.body.length > 0)).toBe(true)
  })

  it('finds translated workflow instructions and permission recovery', () => {
    const topics = createHelpTopics('en')
    expect(topics.filter(topic => matchesHelpTopic(topic, '匯入')).map(topic => topic.id)).toContain('backup')
    expect(topics.filter(topic => matchesHelpTopic(topic, '快捷鍵衝突')).map(topic => topic.id)).toContain('conflicts')
    expect(topics.filter(topic => matchesHelpTopic(topic, 'nflxvideo.net')).map(topic => topic.id)).toContain('permissions')
    expect(topics.filter(topic => matchesHelpTopic(topic, 'zznonexistent'))).toEqual([])
  })
})

describe('Guide interaction', () => {
  it('navigates accordion headings with arrow keys and Home/End', () => {
    render(<HelpPage locale="en" query="" />)
    const first = screen.getByRole('button', { name: /^Quick start/ })
    const second = screen.getByRole('button', { name: /^Shortcut settings/ })
    const last = screen.getByRole('button', { name: /^Permissions and privacy/ })
    first.focus()
    fireEvent.keyDown(first, { key: 'ArrowDown' })
    expect(second).toHaveFocus()
    fireEvent.keyDown(second, { key: 'End' })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'ArrowDown' })
    expect(first).toHaveFocus()
    fireEvent.keyDown(first, { key: 'ArrowUp' })
    expect(last).toHaveFocus()
    fireEvent.keyDown(last, { key: 'Home' })
    expect(first).toHaveFocus()
    fireEvent.click(first)
    expect(screen.getByRole('region', { name: /^Quick start/ })).toBeVisible()
  })

  it.each(LOCALES)('renders setup steps and editor choices as separate lists in %s', locale => {
    const props = { locale }
    const view = render(<HelpPage {...props} query={HELP_TOPIC_COPY[locale].start[0]} />)
    const start = screen.getByRole('article', { name: HELP_TOPIC_COPY[locale].start[0] })
    const steps = within(start).getByRole('list')
    expect(steps.tagName).toBe('OL')
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3)
    view.rerender(<HelpPage {...props} query={HELP_TOPIC_COPY[locale].edit[0]} />)
    const editor = screen.getByRole('article', { name: HELP_TOPIC_COPY[locale].edit[0] })
    const lists = within(editor).getAllByRole('list')
    expect(lists.map(list => list.tagName)).toEqual(['OL', 'UL'])
    expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(3)
    expect(within(lists[1]).getAllByRole('listitem')).toHaveLength(4)
    expect(editor.textContent).not.toContain('\n- ')
  })

  it('opens matches, allows collapsing results, and restores manual collapse choices after clearing search', () => {
    const props = { locale: 'en' as const, query: '' }
    const view = render(<HelpPage {...props} />)
    const start = screen.getByRole('button', { name: /^Quick start/ })
    const editing = screen.getByRole('button', { name: /^Shortcut settings/ })
    expect(start).toHaveAttribute('aria-expanded', 'false')
    expect(editing).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(start)
    fireEvent.click(editing)
    view.rerender(<HelpPage {...props} query="nflxvideo.net" />)
    const result = screen.getByRole('button', { name: /^Permissions and privacy/ })
    expect(result).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('heading', { name: 'Website access and subtitle errors' })).toBeVisible()
    fireEvent.click(result)
    expect(result).toHaveAttribute('aria-expanded', 'false')
    view.rerender(<HelpPage {...props} query="shortcut conflicts" />)
    expect(screen.getByRole('button', { name: /^Shortcut settings/ })).toHaveAttribute('aria-expanded', 'true')
    view.rerender(<HelpPage {...props} />)
    expect(screen.getByRole('button', { name: /^Quick start/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^Shortcut settings/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /^Permissions and privacy/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Collapse all' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.queryByRole('button', { name: 'Expand all' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }))
    expect(screen.queryByRole('heading', { name: 'Start watching' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Expand all' }))
    expect(screen.getByRole('heading', { name: 'Privacy and data use' })).toBeVisible()
  })

  it('shows an empty result with no dead expand controls', () => {
    render(<HelpPage locale="zh-TW" query="zznonexistent" />)
    expect(screen.getByText(HELP_UI_COPY['zh-TW'].empty)).toBeVisible()
    expect(screen.getByRole('button', { name: '全部展開' })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('0')
  })
})

describe('Guide entry points', () => {
  it('opens from the settings sidebar, preserves the direct route, searches and links back to settings', async () => {
    await saveSettings(configuredSettings())
    const before = await getSettings()
    const view = render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'User guide' }))
    expect(window.location.hash).toBe('#help')
    const search = screen.getByRole('searchbox', { name: HELP_UI_COPY.en.search })
    fireEvent.change(search, { target: { value: '快捷鍵衝突' } })
    expect(screen.getByRole('heading', { name: 'Resolve shortcut conflicts' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Manage page features' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'User guide' })).toHaveAttribute('aria-current', 'page')
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(search).toHaveValue('')
    view.unmount()
    render(<OptionsApp />)
    expect(await screen.findByRole('heading', { name: 'User guide' })).toBeVisible()
    await act(async () => {
      window.location.hash = '#volume'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('button', { name: 'Volume and audio' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(await getSettings()).toEqual(before)
  })

  it.each(LOCALES)('opens the same guide from the popup in %s', async locale => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale })
    render(<PopupApp />)
    fireEvent.click(await screen.findByRole('button', { name: HELP_UI_COPY[locale].title }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: chrome.runtime.getURL('options.html#help') })
  })

  it('closes the Firefox popup after opening the guide', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/128.0')
    const close = vi.spyOn(window, 'close').mockImplementation(() => {})
    render(<PopupApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'User guide' }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: chrome.runtime.getURL('options.html#help') })
    expect(close).toHaveBeenCalledOnce()
  })
})
