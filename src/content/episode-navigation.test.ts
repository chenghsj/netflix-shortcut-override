import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { navigateEpisode } from './episode-navigation'

describe('episode navigation', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/watch/123')
    document.body.innerHTML = ''
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, 100, 24))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

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

  it.each(['disabled', 'aria-disabled', 'aria-hidden', 'hidden', 'inert'])(
    'clicks Next when the control becomes ready after losing %s',
    async attribute => {
      document.body.innerHTML = '<button data-uia="control-next">Next episode</button>'
      const button = document.querySelector('button')!
      const click = vi.fn()
      button.setAttribute(attribute, 'true')
      button.addEventListener('click', click)

      const navigation = navigateEpisode(document, 1, () => true)
      expect(click).not.toHaveBeenCalled()
      button.removeAttribute(attribute)
      await vi.advanceTimersByTimeAsync(1500)

      expect(await navigation).toBe(true)
      expect(click).toHaveBeenCalledOnce()
    }
  )

  it('uses an available Next control when a disabled one appears first', async () => {
    document.body.innerHTML = '<button data-uia="control-next" disabled>Next</button><button data-uia="next-episode-seamless-button">Next</button>'
    const click = vi.fn()
    document.querySelectorAll('button')[1].addEventListener('click', click)

    const navigation = navigateEpisode(document, 1, () => true)
    await vi.advanceTimersByTimeAsync(1500)

    expect(await navigation).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('uses the episode picker when the Next controls are disabled or hidden', async () => {
    document.body.innerHTML = `
      <button data-uia="control-next" disabled>Next</button>
      <div style="opacity: 0"><button data-uia="next-episode-seamless-button">Next</button></div>
      <div role="listbox">
        <div data-uia="episode-pane-item" aria-selected="true" aria-disabled="true">Current</div>
        <button data-uia="episode-pane-item">Following</button>
      </div>
    `
    const hiddenClick = vi.fn()
    const followingClick = vi.fn()
    document.querySelector('[data-uia="next-episode-seamless-button"]')!.addEventListener('click', hiddenClick)
    document.querySelector('button[data-uia="episode-pane-item"]')!.addEventListener('click', followingClick)

    expect(await navigateEpisode(document, 1, () => true)).toBe(true)
    expect(hiddenClick).not.toHaveBeenCalled()
    expect(followingClick).toHaveBeenCalledOnce()
  })

  it('rescans when a mounted Next control obtains layout without a DOM mutation', async () => {
    document.body.innerHTML = '<button data-uia="control-next">Next</button>'
    const button = document.querySelector('button')!
    const click = vi.fn()
    let laidOut = false
    button.getBoundingClientRect = () => new DOMRect(0, 0, laidOut ? 100 : 0, laidOut ? 24 : 0)
    button.addEventListener('click', click)

    const navigation = navigateEpisode(document, 1, () => true)
    expect(click).not.toHaveBeenCalled()
    laidOut = true
    await vi.advanceTimersByTimeAsync(200)
    expect(click).toHaveBeenCalledOnce()
    expect(await navigation).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('chooses an available picker, selected episode and Play button after stale matches', async () => {
    document.body.innerHTML = `
      <button data-uia="control-episodes" style="visibility: hidden">Stale picker</button>
      <button data-uia="control-episodes">Episodes</button>
      <div role="listbox" aria-hidden="true"><div data-uia="episode-pane-item" aria-selected="true">Stale selection</div></div>
    `
    const [stalePicker, picker] = document.querySelectorAll('button')
    const staleClick = vi.fn()
    const play = vi.fn()
    stalePicker.addEventListener('click', staleClick)
    picker.addEventListener('click', () => {
      const pane = document.createElement('div')
      pane.innerHTML = `
        <div data-uia="episode-pane-item">
          <button class="play-button" aria-hidden="true">Stale Play</button>
          <button class="play-button">Play previous</button>
        </div>
        <div data-uia="episode-pane-item" aria-selected="true">Current</div>
      `
      const [stalePlay, availablePlay] = pane.querySelectorAll('button')
      stalePlay.addEventListener('click', staleClick)
      availablePlay.addEventListener('click', play)
      document.body.append(pane)
    })

    const navigation = navigateEpisode(document, -1, () => true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await navigation).toBe(true)
    expect(play).toHaveBeenCalledOnce()
    expect(staleClick).not.toHaveBeenCalled()
  })

  it('waits for a temporarily disabled previous episode in the picker', async () => {
    document.body.innerHTML = '<div role="listbox"><button data-uia="episode-pane-item" aria-disabled="true">Previous</button><div data-uia="episode-pane-item" aria-selected="true">Current</div></div>'
    const previous = document.querySelector('button')!
    const click = vi.fn()
    previous.addEventListener('click', click)

    const navigation = navigateEpisode(document, -1, () => true)
    expect(click).not.toHaveBeenCalled()
    previous.removeAttribute('aria-disabled')
    await vi.advanceTimersByTimeAsync(1500)

    expect(await navigation).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('waits for the previous row when the picker renders the current episode first', async () => {
    document.body.innerHTML = '<div role="listbox"><div data-uia="episode-pane-item" aria-selected="true">Current</div></div>'
    const list = document.querySelector('[role="listbox"]')!
    const previous = document.createElement('button')
    previous.dataset.uia = 'episode-pane-item'
    const click = vi.fn()
    previous.addEventListener('click', click)

    const navigation = navigateEpisode(document, -1, () => true)
    list.prepend(previous)
    await vi.advanceTimersByTimeAsync(1500)

    expect(await navigation).toBe(true)
    expect(click).toHaveBeenCalledOnce()
  })

  it('waits for the Play button inside a newly rendered episode row', async () => {
    document.body.innerHTML = '<div role="listbox"><div data-uia="episode-pane-item" aria-selected="true">Current</div></div>'
    const list = document.querySelector('[role="listbox"]')!
    const previous = document.createElement('div')
    previous.dataset.uia = 'episode-pane-item'
    previous.innerHTML = '<button class="play-button" disabled>Play previous</button>'
    const play = previous.querySelector('button')!
    const playClick = vi.fn()
    play.addEventListener('click', playClick)

    const navigation = navigateEpisode(document, -1, () => true)
    list.prepend(previous)
    await vi.advanceTimersByTimeAsync(0)
    expect(playClick).not.toHaveBeenCalled()

    play.disabled = false
    await vi.advanceTimersByTimeAsync(1500)
    expect(await navigation).toBe(true)
    expect(playClick).toHaveBeenCalledOnce()
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
    const atBoundary = navigateEpisode(document, -1, () => true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await atBoundary).toBe(false)
    document.querySelector('[role="listbox"]')!.setAttribute('aria-hidden', 'true')
    const hidden = navigateEpisode(document, 1, () => true)
    await vi.advanceTimersByTimeAsync(1500)
    expect(await hidden).toBe(false)
    expect(click).not.toHaveBeenCalled()
  })
})
