import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OptionsApp } from '@/options/options-app'
import { OPTIONS_LAYOUT_COPY, OPTIONS_PAGE_HASHES } from '@/shared/options-navigation'
import { LOCALES } from '@/shared/shortcut-types'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getCopy } from '@/shared/i18n'
import { saveSettings } from '@/shared/storage'

describe('Options category links', () => {
  afterEach(() => { window.history.replaceState(null, '', '/') })

  it('keeps playback controls separate from position and episode navigation', async () => {
    render(<OptionsApp />)
    expect(await screen.findByRole('button', { name: 'Edit Play / Pause' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit Fullscreen' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit Picture-in-Picture' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Edit Previous frame' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Seeking and navigation' }))
    for (const action of ['Previous frame', 'Next frame', 'Skip intro', 'Previous episode', 'Next episode', 'Forward / Rewind 10 seconds']) {
      expect(screen.getByRole('button', { name: `Edit ${action}` })).toBeVisible()
    }
    expect(screen.queryByRole('button', { name: 'Edit Play / Pause' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Manage page features' }))
    expect(screen.getByRole('checkbox', { name: 'Show Previous frame' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Show Previous episode' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Show Forward / Rewind 10 seconds' })).toBeVisible()
  })

  it('opens the merged playback category from an old Display link', async () => {
    window.history.replaceState(null, '', '/options.html#display')
    render(<OptionsApp />)
    expect(await screen.findByRole('button', { name: 'Playback' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: 'Edit Fullscreen' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Edit Picture-in-Picture' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Display' })).not.toBeInTheDocument()
  })


  it('opens the sentence section on the shared subtitle page from its existing link', async () => {
    window.history.replaceState(null, '', '/options.html#subtitle-navigation')
    render(<OptionsApp />)
    expect(await screen.findByRole('button', { name: 'Subtitles' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('group', { name: 'Subtitle language and size' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Sentence jumps and replay' })).toBeVisible()
  })

  it.each(LOCALES)('groups both subtitle sections under one category in %s', async locale => {
    await saveSettings({ ...DEFAULT_SETTINGS, locale })
    render(<OptionsApp />)
    const copy = OPTIONS_LAYOUT_COPY[locale]
    fireEvent.click(await screen.findByRole('button', { name: getCopy(locale).shortcutGroups.subtitles }))
    expect(screen.getByRole('group', { name: copy.subtitles })).toBeVisible()
    expect(screen.getByRole('group', { name: copy.subtitleNavigation })).toBeVisible()
    expect(screen.queryByRole('button', { name: copy.subtitleNavigation })).not.toBeInTheDocument()
  })

  it.each([
    ['playback', 'Playback'], ['seeking', 'Seeking and navigation'], ['subtitles', 'Subtitles'],
    ['volume', 'Volume and audio'],
    ['speed', 'Playback speed'], ['general', 'General settings'], ['automation', 'Playback automation'], ['backup', 'Backup and restore'],
  ] as const)('opens %s from a direct category link', async (page, label) => {
    window.history.replaceState(null, '', `/options.html${OPTIONS_PAGE_HASHES[page]}`)
    render(<OptionsApp />)
    expect(await screen.findByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
  })

  it('does not open the subtitle introduction when selecting its sidebar page', async () => {
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Subtitles' }))
    expect(window.location.hash).toBe('#subtitles')
    expect(screen.queryByRole('dialog', { name: 'Sentence jumps and replay' })).not.toBeInTheDocument()
  })

  it('follows another category link while clearing an existing search', async () => {
    render(<OptionsApp />)
    fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'subtitle' } })
    await act(async () => {
      window.history.replaceState(null, '', `/options.html${OPTIONS_PAGE_HASHES.speed}`)
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Playback speed' })).toHaveAttribute('aria-current', 'page')
  })

  it.each([
    ['playback', 'Playback'], ['seeking', 'Seeking and navigation'], ['subtitles', 'Subtitles'],
    ['volume', 'Volume and audio'],
    ['speed', 'Playback speed'], ['general', 'General settings'], ['automation', 'Playback automation'], ['backup', 'Backup and restore'],
  ] as const)('keeps %s selected after refreshing a sidebar selection', async (page, label) => {
    window.history.replaceState(null, '', '/options.html#seeking')
    const view = render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: label }))
    expect(window.location.hash).toBe(OPTIONS_PAGE_HASHES[page])
    view.unmount()
    render(<OptionsApp />)
    expect(await screen.findByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
  })
})

describe('Options numbered navigation', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    window.history.replaceState(null, '', '/')
  })

  it.each([
    ['MacIntel', 'Meta', { metaKey: true }, 'Meta'],
    ['Win32', 'Control', { ctrlKey: true }, 'Control'],
    ['Linux x86_64', 'Control', { ctrlKey: true }, 'Control'],
  ] as const)('reveals numbers only while holding the primary modifier on %s', async (platform, key, modifier, ariaModifier) => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
    render(<OptionsApp />)
    await screen.findByRole('searchbox')
    const buttons = within(screen.getByRole('navigation', { name: 'Settings navigation' })).getAllByRole('button')
    const hints = buttons.map(button => button.querySelector('kbd')!)
    expect(hints).toHaveLength(8)
    buttons.forEach((button, index) => expect(button).toHaveAttribute('aria-keyshortcuts', `${ariaModifier}+${index + 1}`))
    hints.forEach(hint => expect(hint).toBeEmptyDOMElement())

    vi.useFakeTimers()
    fireEvent.keyDown(window, { key, ...modifier })
    act(() => vi.advanceTimersByTime(299))
    hints.forEach(hint => expect(hint).toBeEmptyDOMElement())
    act(() => vi.advanceTimersByTime(1))
    hints.forEach((hint, index) => {
      expect(hint).toBeVisible()
      expect(hint).toHaveTextContent(String(index + 1))
    })
    fireEvent.keyUp(window, { key })
    hints.forEach(hint => expect(hint).toBeEmptyDOMElement())
  })

  it.each(['MacIntel', 'Win32', 'Linux x86_64'])('jumps through both sidebar groups and clears search on %s', async platform => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
    render(<OptionsApp />)
    const search = await screen.findByRole('searchbox')
    const pages = [
      ['playback', 'Playback'], ['seeking', 'Seeking and navigation'], ['subtitles', 'Subtitles'],
      ['volume', 'Volume and audio'], ['speed', 'Playback speed'], ['general', 'General settings'],
      ['automation', 'Playback automation'], ['backup', 'Backup and restore'],
    ] as const
    pages.forEach(([page, label], index) => {
      fireEvent.change(search, { target: { value: 'subtitle' } })
      expect(fireEvent.keyDown(search, { key: String(index + 1), code: `Digit${index + 1}`, metaKey: platform === 'MacIntel', ctrlKey: platform !== 'MacIntel' })).toBe(false)
      expect(search).toHaveValue('')
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-current', 'page')
      expect(window.location.hash).toBe(OPTIONS_PAGE_HASHES[page])
    })
  })

  it('cancels pending hints on release and hides them when the window loses focus or visibility', async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    render(<OptionsApp />)
    const playback = await screen.findByRole('button', { name: 'Playback' })
    const hint = playback.querySelector('kbd')!
    vi.useFakeTimers()
    fireEvent.keyDown(window, { key: 'Meta', metaKey: true })
    fireEvent.keyUp(window, { key: 'Meta' })
    act(() => vi.advanceTimersByTime(300))
    expect(hint).toBeEmptyDOMElement()

    for (const reset of [() => fireEvent.blur(window), () => fireEvent(document, new Event('visibilitychange'))]) {
      fireEvent.keyDown(window, { key: 'Meta', metaKey: true })
      act(() => vi.advanceTimersByTime(300))
      expect(hint).toHaveTextContent('1')
      reset()
      expect(hint).toBeEmptyDOMElement()
    }
  })

  it('leaves other key combinations, IME input, unknown numbers and repeated keys alone', async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    render(<OptionsApp />)
    await screen.findByRole('searchbox')
    for (const modifiers of [{}, { ctrlKey: true }, { metaKey: true, ctrlKey: true }, { metaKey: true, altKey: true }, { metaKey: true, shiftKey: true }, { metaKey: true, isComposing: true }]) {
      expect(fireEvent.keyDown(window, { key: '2', code: 'Digit2', ...modifiers })).toBe(true)
    }
    expect(fireEvent.keyDown(window, { key: '9', code: 'Digit9', metaKey: true })).toBe(true)
    fireEvent.keyDown(window, { key: '2', code: 'Digit2', metaKey: true, repeat: true })
    expect(screen.getByRole('button', { name: 'Playback' })).toHaveAttribute('aria-current', 'page')
    expect(window.location.hash).toBe('')
  })

  it('records a numbered shortcut without navigating away from the current page', async () => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel')
    render(<OptionsApp />)
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Play / Pause' }))
    const dialog = await screen.findByRole('dialog', { name: 'Record shortcut' })
    const recorder = within(dialog).getByRole('group', { name: 'Record shortcut' })
    fireEvent.keyDown(recorder, { key: '2', code: 'Digit2', metaKey: true })
    expect(recorder).toHaveTextContent('⌘2')
    expect(dialog).toBeVisible()
    expect(window.location.hash).toBe('')
  })
})
