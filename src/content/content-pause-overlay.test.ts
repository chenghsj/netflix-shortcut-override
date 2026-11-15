import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'
import { setupContentIndexTests } from './shortcuts/content-script.test-support'

describe('Netflix pause overlay', () => {
  setupContentIndexTests()
  beforeEach(async () => saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: true }))
  afterEach(() => vi.restoreAllMocks())

  it('keeps Netflix pause overlays visible by default', async () => {
    await saveSettings(DEFAULT_SETTINGS)
    document.body.innerHTML = '<div class="watch-video"><video></video><div class="watch-video--evidence-overlay-container">Title</div></div>'
    expect(getComputedStyle(document.querySelector('.watch-video--evidence-overlay-container')!).display).not.toBe('none')
  })

  it.each(['Netflix controls', 'play/pause shortcut', 'frame shortcut'])(
    'keeps the paused picture clear after pausing with %s and waiting', async source => {
      vi.useFakeTimers()
      document.body.innerHTML = '<div class="watch-video"><div data-uia="player"><video></video><div class="player-timedtext">Subtitle</div><button>Play</button><div role="dialog">Playback error</div></div></div>'
      const video = document.querySelector('video')!
      let paused = false
      Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
      const play = vi.spyOn(video, 'play').mockResolvedValue(undefined)
      const pause = vi.spyOn(video, 'pause').mockImplementation(() => {
        paused = true
        video.dispatchEvent(new Event('pause'))
      })
      if (source === 'Netflix controls') video.pause()
      else if (source === 'play/pause shortcut') {
        await saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: true, holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, enabled: false } })
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true }))
      } else {
        video.pause()
        vi.mocked(chrome.runtime.sendMessage).mockImplementationOnce((_message, callback) => {
          if (typeof callback === 'function') callback({ success: true, result: { seekCalled: true } })
          return Promise.resolve()
        })
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Period', key: '.', bubbles: true, cancelable: true }))
      }
      play.mockClear()
      pause.mockClear()
      await vi.advanceTimersByTimeAsync(60_000)
      const overlay = document.createElement('div')
      overlay.className = 'watch-video--evidence-overlay-container'
      overlay.innerHTML = '<div data-uia="evidence-overlay">Title and paused label</div>'
      video.parentElement!.append(overlay)

      expect(getComputedStyle(overlay).display).toBe('none')
      for (const selector of ['video', '.player-timedtext', 'button', '[role="dialog"]']) {
        expect(getComputedStyle(document.querySelector(selector)!).display).not.toBe('none')
      }
      expect(video.paused).toBe(true)
      expect(video.currentTime).toBe(0)
      expect(play).not.toHaveBeenCalled()
      expect(pause).not.toHaveBeenCalled()
    },
  )

  it('restores the ordinary pause overlay on disable and hides it immediately on re-enable', async () => {
    document.body.innerHTML = '<div class="watch-video"><video></video><div class="watch-video--evidence-overlay-container">Title</div></div>'
    const overlay = document.querySelector('.watch-video--evidence-overlay-container')!
    expect(getComputedStyle(overlay).display).toBe('none')
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false })
    expect(getComputedStyle(overlay).display).not.toBe('none')
    await saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: true })
    expect(getComputedStyle(overlay).display).toBe('none')
  })

  it('applies the independent preference immediately and retains it through global disable and re-enable', async () => {
    document.body.innerHTML = '<div class="watch-video"><video></video><div class="watch-video--evidence-overlay-container">Title</div></div>'
    const overlay = document.querySelector('.watch-video--evidence-overlay-container')!
    await saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: false })
    expect(getComputedStyle(overlay).display).not.toBe('none')
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: false, hidePauseOverlay: false })
    await saveSettings({ ...DEFAULT_SETTINGS, enabled: true, hidePauseOverlay: false })
    expect(getComputedStyle(overlay).display).not.toBe('none')
    await saveSettings({ ...DEFAULT_SETTINGS, hidePauseOverlay: true })
    expect(getComputedStyle(overlay).display).toBe('none')
  })

  it('covers replacement watch players and repeated pauses without hiding other page content', () => {
    const mountPlayer = () => {
      document.body.innerHTML = '<div data-uia="watch-video"><video></video><div class="watch-video--evidence-overlay-container">Title</div><button>Start playback</button></div><div data-uia="player"><div data-uia="evidence-overlay">Other page content</div></div>'
    }
    mountPlayer()
    const video = document.querySelector('video')!
    video.dispatchEvent(new Event('play'))
    video.dispatchEvent(new Event('pause'))
    window.history.replaceState(null, '', '/watch/456')
    mountPlayer()
    expect(getComputedStyle(document.querySelector('.watch-video--evidence-overlay-container')!).display).toBe('none')
    expect(getComputedStyle(document.querySelector('button')!).display).not.toBe('none')
    expect(getComputedStyle(document.querySelector('[data-uia="evidence-overlay"]')!).display).not.toBe('none')
  })
})
