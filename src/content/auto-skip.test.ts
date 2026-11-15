import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'
import { setupContentIndexTests } from './shortcuts/content-script.test-support'

const appendButton = (marker: string, label: string, hidden = false) => {
  const button = document.createElement('button')
  button.dataset.uia = marker
  button.textContent = label
  button.hidden = hidden
  button.getBoundingClientRect = () => new DOMRect(0, 0, 120, 32)
  const onClick = vi.fn()
  button.addEventListener('click', onClick)
  document.body.append(button)
  return { button, onClick }
}

const appendVideo = () => {
  const video = document.createElement('video')
  document.body.append(video)
  return video
}

const finishSeek = (video: HTMLVideoElement, seconds: number) => {
  video.currentTime = seconds
  video.dispatchEvent(new Event('seeked'))
}

describe('auto skip on Netflix playback pages', () => {
  setupContentIndexTests()
  afterEach(() => saveSettings(DEFAULT_SETTINGS))

  it('distinguishes recaps from intros even when Netflix shares the intro marker', async () => {
    vi.useFakeTimers()
    const video = appendVideo()
    const recap = appendButton('player-skip-intro', '略過前情提要')
    const intro = appendButton('player-skip-intro', '略過片頭')
    intro.button.addEventListener('click', () => finishSeek(video, 30))
    const credits = appendButton('player-skip-credits', 'Skip Credits')
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).not.toHaveBeenCalled()

    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: true, recap: false } })
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).toHaveBeenCalledTimes(1)
    expect(recap.onClick).not.toHaveBeenCalled()

    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: false, recap: true } })
    await vi.advanceTimersByTimeAsync(100)
    expect(recap.onClick).toHaveBeenCalledTimes(1)
    expect(credits.onClick).not.toHaveBeenCalled()
  })

  it('waits for a visible control and skips once per episode, even if Netflix replaces the button', async () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/watch/456')
    const video = appendVideo()
    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: true, recap: false } })
    const intro = appendButton('', 'Skip Intro', true)
    intro.button.disabled = true
    await vi.advanceTimersByTimeAsync(100)
    intro.button.hidden = false
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).not.toHaveBeenCalled()

    intro.button.disabled = false
    intro.button.addEventListener('click', () => finishSeek(video, 35))
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).toHaveBeenCalledTimes(1)
    intro.button.remove()
    const replacement = appendButton('', 'Skip Intro')
    await vi.advanceTimersByTimeAsync(5_000)
    expect(replacement.onClick).not.toHaveBeenCalled()

    replacement.button.remove()
    window.history.replaceState(null, '', '/watch/457')
    const nextEpisode = appendButton('player-skip-intro', 'Skip Intro')
    await vi.advanceTimersByTimeAsync(100)
    expect(nextEpisode.onClick).toHaveBeenCalledTimes(1)
  })

  it('ignores browse pages and cancels pending clicks when the extension is turned off', async () => {
    vi.useFakeTimers()
    appendVideo()
    const settings = { ...DEFAULT_SETTINGS, autoSkip: { intro: true, recap: true } }
    window.history.replaceState(null, '', '/browse')
    await saveSettings(settings)
    const intro = appendButton('player-skip-intro', 'Skip Intro')
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).not.toHaveBeenCalled()

    window.history.replaceState(null, '', '/watch/123')
    const recap = appendButton('player-skip-recap', 'Skip Recap')
    await saveSettings({ ...settings, enabled: false })
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).not.toHaveBeenCalled()
    expect(recap.onClick).not.toHaveBeenCalled()
  })

  it('skips the recap again after rewinding into it on the same Netflix watch page', async () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/watch/789')
    const video = appendVideo()
    video.currentTime = 1.78
    const recap = appendButton('player-skip-recap', '略過前情提要')
    recap.button.addEventListener('click', () => {
      finishSeek(video, 35)
      recap.button.remove()
    })
    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: false, recap: true } })
    await vi.advanceTimersByTimeAsync(100)
    expect(video.currentTime).toBe(35)

    finishSeek(video, 1.78)
    const replay = appendButton('player-skip-recap', '略過前情提要')
    await vi.advanceTimersByTimeAsync(100)
    expect(replay.onClick).toHaveBeenCalledTimes(1)
  })

  it('waits for a seek to finish before clicking a newly displayed recap button', async () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/watch/790')
    const video = appendVideo()
    let seeking = true
    Object.defineProperty(video, 'seeking', { get: () => seeking })
    const recap = appendButton('player-skip-recap', '略過前情提要')
    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: false, recap: true } })
    await vi.advanceTimersByTimeAsync(100)
    expect(recap.onClick).not.toHaveBeenCalled()

    seeking = false
    video.dispatchEvent(new Event('seeked'))
    await vi.advanceTimersByTimeAsync(100)
    expect(recap.onClick).toHaveBeenCalledTimes(1)
  })

  it('retries once if normal playback continues and the skip button remains visible', async () => {
    vi.useFakeTimers()
    window.history.replaceState(null, '', '/watch/791')
    const video = appendVideo()
    const intro = appendButton('player-skip-intro', 'Skip Intro')
    await saveSettings({ ...DEFAULT_SETTINGS, autoSkip: { intro: true, recap: false } })
    await vi.advanceTimersByTimeAsync(100)
    expect(intro.onClick).toHaveBeenCalledTimes(1)

    video.currentTime = 1
    video.dispatchEvent(new Event('timeupdate'))
    await vi.advanceTimersByTimeAsync(5_000)
    expect(intro.onClick).toHaveBeenCalledTimes(2)

    intro.button.className = 'changed'
    await vi.advanceTimersByTimeAsync(5_000)
    expect(intro.onClick).toHaveBeenCalledTimes(2)
  })

  it.each(['button hidden', 'preference disabled', 'watch page changed'])(
    'cancels the pending retry when the %s',
    async condition => {
      vi.useFakeTimers()
      window.history.replaceState(null, '', '/watch/792')
      appendVideo()
      const recap = appendButton('player-skip-recap', 'Skip Recap')
      const settings = { ...DEFAULT_SETTINGS, autoSkip: { intro: true, recap: true } }
      await saveSettings(settings)
      await vi.advanceTimersByTimeAsync(100)
      expect(recap.onClick).toHaveBeenCalledTimes(1)

      if (condition === 'button hidden') recap.button.hidden = true
      if (condition === 'preference disabled') {
        await saveSettings({ ...settings, autoSkip: { intro: true, recap: false } })
      }
      if (condition === 'watch page changed') window.history.replaceState(null, '', '/browse')
      await vi.advanceTimersByTimeAsync(5_000)
      expect(recap.onClick).toHaveBeenCalledTimes(1)
    }
  )
})
