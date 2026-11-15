import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'
import { setupContentIndexTests } from './shortcuts/content-script.test-support'

const appendButton = (marker = 'next-episode-seamless-button') => {
  const button = document.createElement('button')
  button.dataset.uia = marker
  button.textContent = 'Next episode'
  button.getBoundingClientRect = () => new DOMRect(0, 0, 120, 32)
  const click = vi.fn()
  button.addEventListener('click', click)
  document.body.append(button)
  return { button, click }
}

const enable = () => saveSettings({ ...DEFAULT_SETTINGS, autoNextEpisode: true })

describe('auto next episode', () => {
  setupContentIndexTests()
  afterEach(() => saveSettings(DEFAULT_SETTINGS))

  it.each(['next-episode-seamless-button', 'next-episode-seamless-button-draining'])(
    'clicks the %s end card only when enabled and bounds retries', async marker => {
      vi.useFakeTimers()
      document.body.append(document.createElement('video'))
      const next = appendButton(marker)
      const toolbar = appendButton('control-next')
      const credits = appendButton('player-skip-credits')
      await vi.advanceTimersByTimeAsync(100)
      expect(next.click).not.toHaveBeenCalled()
      await enable()
      await vi.advanceTimersByTimeAsync(100)
      expect(next.click).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(5_000)
      expect(next.click).toHaveBeenCalledTimes(2)
      next.button.remove()
      const replacement = appendButton(marker)
      await vi.advanceTimersByTimeAsync(5_000)
      expect(replacement.click).not.toHaveBeenCalled()
      expect(toolbar.click).not.toHaveBeenCalled()
      expect(credits.click).not.toHaveBeenCalled()
    }
  )

  it('waits for an actionable end card and a completed seek', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    let seeking = true
    Object.defineProperty(video, 'seeking', { get: () => seeking })
    document.body.append(video)
    const next = appendButton()
    next.button.hidden = true
    await enable()
    await vi.advanceTimersByTimeAsync(100)
    next.button.hidden = false
    next.button.disabled = true
    await vi.advanceTimersByTimeAsync(100)
    next.button.disabled = false
    await vi.advanceTimersByTimeAsync(100)
    expect(next.click).not.toHaveBeenCalled()
    seeking = false
    video.dispatchEvent(new Event('seeked'))
    await vi.advanceTimersByTimeAsync(100)
    expect(next.click).toHaveBeenCalledTimes(1)
  })

  it('clicks as an end card becomes visible during its entrance animation', async () => {
    vi.useFakeTimers()
    document.body.append(document.createElement('video'))
    const next = appendButton()
    let visible = false
    next.button.getBoundingClientRect = () => new DOMRect(0, 0, visible ? 120 : 0, 32)
    await enable()
    next.button.dispatchEvent(new Event('transitionrun', { bubbles: true }))
    await vi.advanceTimersByTimeAsync(100)
    expect(next.click).not.toHaveBeenCalled()

    // CSS changes the rendered geometry without another DOM mutation. The end
    // event can arrive much later than the first visible frame of the button.
    visible = true
    await vi.advanceTimersByTimeAsync(150)
    expect(next.click).toHaveBeenCalledTimes(1)
  })

  it.each(['preference', 'global switch', 'page'])(
    'cancels the pending retry when the %s is disabled or left', async condition => {
      vi.useFakeTimers()
      document.body.append(document.createElement('video'))
      const next = appendButton()
      await enable()
      await vi.advanceTimersByTimeAsync(100)
      expect(next.click).toHaveBeenCalledTimes(1)
      if (condition === 'page') window.history.replaceState(null, '', '/browse')
      else await saveSettings({
        ...DEFAULT_SETTINGS,
        enabled: condition !== 'global switch',
        autoNextEpisode: condition !== 'preference',
      })
      await vi.advanceTimersByTimeAsync(5_000)
      expect(next.click).toHaveBeenCalledTimes(1)
    }
  )

  it('advances successive episodes without clicking a lingering previous end card', async () => {
    vi.useFakeTimers()
    document.body.append(document.createElement('video'))
    const first = appendButton()
    first.button.addEventListener('click', () => window.history.replaceState(null, '', '/watch/456'))
    await enable()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(first.click).toHaveBeenCalledTimes(1)
    first.button.remove()
    const second = appendButton()
    await vi.advanceTimersByTimeAsync(100)
    expect(second.click).toHaveBeenCalledTimes(1)
  })

  it('ignores browse pages and watch pages without a video', async () => {
    vi.useFakeTimers()
    const next = appendButton()
    await enable()
    await vi.advanceTimersByTimeAsync(100)
    expect(next.click).not.toHaveBeenCalled()
    window.history.replaceState(null, '', '/browse')
    document.body.append(document.createElement('video'))
    await vi.advanceTimersByTimeAsync(100)
    expect(next.click).not.toHaveBeenCalled()
  })
})
