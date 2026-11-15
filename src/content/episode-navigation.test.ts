import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateEpisode } from './episode-navigation'

describe('episode navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/watch/123')
    document.body.innerHTML = ''
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('clicks the next control once and ignores a disabled control', async () => {
    document.body.innerHTML = '<button data-uia="control-next">Next episode</button>'
    const button = document.querySelector('button')!
    const click = vi.fn()
    button.addEventListener('click', click)
    expect(await navigateEpisode(document, 1, () => true)).toBe(true)
    expect(click).toHaveBeenCalledOnce()
    button.disabled = true
    const unavailable = navigateEpisode(document, 1, () => true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await unavailable).toBe(false)
    expect(click).toHaveBeenCalledOnce()
  })

  it('opens the picker and plays the previous episode rather than the menu header', async () => {
    document.body.innerHTML = '<button data-uia="control-episodes">Episodes</button>'
    const previous = vi.fn()
    const current = vi.fn()
    document.querySelector('button')!.addEventListener('click', () => {
      const list = document.createElement('div')
      list.setAttribute('role', 'listbox')
      list.innerHTML = '<div data-uia="episode-pane-back" role="option">Season</div><div data-uia="episode-pane-item" role="option"><button class="play-button">Previous</button></div><div data-uia="episode-pane-item" role="option" aria-selected="true"><button class="play-button">Current</button></div>'
      list.querySelectorAll('button')[0].addEventListener('click', previous)
      list.querySelectorAll('button')[1].addEventListener('click', current)
      document.body.append(list)
    })
    expect(await navigateEpisode(document, -1, () => true)).toBe(true)
    expect(previous).toHaveBeenCalledOnce()
    expect(current).not.toHaveBeenCalled()
  })

  it('expands the previous episode before playing through its pointer-driven row', async () => {
    document.body.innerHTML = '<button data-uia="control-episodes">Episodes</button>'
    const play = vi.fn()
    const expand = vi.fn()
    document.querySelector('button')!.addEventListener('click', () => {
      const list = document.createElement('div')
      list.setAttribute('role', 'listbox')
      list.innerHTML = '<div data-uia="episode-pane-back" role="option">Season</div><div data-uia="episode-pane-item" role="option"><div data-uia="episode-pane-item-preview-closed" style="display: none"><button class="play-button" aria-hidden="true" tabindex="-1">Play</button></div></div><div data-uia="episode-pane-item" role="option" aria-selected="true">Current</div>'
      const previous = list.querySelector<HTMLElement>('[data-uia="episode-pane-item"]')!
      const preview = previous.firstElementChild as HTMLElement
      // Netflix selects on pointerdown. Its first press expands the preview;
      // playback needs a second press after React commits that preview.
      previous.addEventListener('pointerdown', () => {
        if (preview.dataset.uia === 'episode-pane-item-preview-open') {
          play()
        } else {
          expand()
          queueMicrotask(() => {
            preview.dataset.uia = 'episode-pane-item-preview-open'
            preview.style.display = ''
          })
        }
      })
      document.body.append(list)
    })

    expect(await navigateEpisode(document, -1, () => true)).toBe(true)
    expect(expand).toHaveBeenCalledOnce()
    expect(play).toHaveBeenCalledOnce()
  })

  it.each(['cancelled', 'watch changed', 'timed out'])('does not play a delayed episode preview after navigation is %s', async reason => {
    document.body.innerHTML = '<div role="listbox"><div data-uia="episode-pane-item"><div data-uia="episode-pane-item-preview-closed"></div></div><div data-uia="episode-pane-item" aria-selected="true">Current</div></div>'
    const previous = document.querySelector<HTMLElement>('[data-uia="episode-pane-item"]')!
    const press = vi.fn()
    previous.addEventListener('pointerdown', press)
    let current = true
    const navigation = navigateEpisode(document, -1, () => current)
    expect(press).toHaveBeenCalledOnce()

    if (reason === 'cancelled') current = false
    if (reason === 'watch changed') window.history.replaceState(null, '', '/watch/456')
    if (reason === 'timed out') await vi.advanceTimersByTimeAsync(1500)
    previous.firstElementChild!.setAttribute('data-uia', 'episode-pane-item-preview-open')

    expect(await navigation).toBe(false)
    expect(press).toHaveBeenCalledOnce()
  })

  it('reveals idle controls and cancels stale work before a delayed picker appears', async () => {
    document.body.innerHTML = '<div class="watch-video"></div>'
    const root = document.querySelector('.watch-video')!
    const reveal = vi.fn()
    root.addEventListener('mousemove', reveal)
    let current = true
    const navigation = navigateEpisode(document, -1, () => current)
    expect(reveal).toHaveBeenCalledOnce()
    current = false
    const button = document.createElement('button')
    button.dataset.uia = 'control-episodes'
    const click = vi.fn()
    button.addEventListener('click', click)
    root.append(button)
    expect(await navigation).toBe(false)
    expect(click).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2000)
    expect(click).not.toHaveBeenCalled()
  })

  it('does not wrap the first episode or choose a selected episode from a hidden picker', async () => {
    document.body.innerHTML = '<div role="listbox"><div data-uia="episode-pane-item" aria-selected="true"><button class="play-button">First episode</button></div></div>'
    const click = vi.fn()
    document.querySelector('button')!.addEventListener('click', click)
    expect(await navigateEpisode(document, -1, () => true)).toBe(false)
    document.querySelector('[role="listbox"]')!.setAttribute('aria-hidden', 'true')
    const hidden = navigateEpisode(document, 1, () => true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await hidden).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })
})
