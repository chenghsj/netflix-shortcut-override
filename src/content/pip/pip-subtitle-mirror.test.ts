import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SubtitleMirror } from './pip-subtitle-mirror'

const flushFrames = async (sourceWindow: Window, pipWindow: Window): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>(resolve => sourceWindow.requestAnimationFrame(() => resolve()))
  await Promise.resolve()
  await new Promise<void>(resolve => pipWindow.requestAnimationFrame(() => resolve()))
  await Promise.resolve()
}

describe('SubtitleMirror', () => {
  let iframe: HTMLIFrameElement

  beforeEach(() => {
    document.body.innerHTML = ''
    iframe = document.createElement('iframe')
    document.body.append(iframe)
  })

  afterEach(() => {
    iframe.remove()
  })

  it('discovers a subtitle source that appears after start', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    player.append(video)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'late subtitle'
    player.append(subtitle)
    await flushFrames(window, pipWindow)

    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveTextContent(
      'late subtitle'
    )
    mirror.destroy()
  })

  it('switches to a new subtitle source and hides when the text is empty', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    const first = document.createElement('div')
    first.className = 'player-timedtext'
    first.textContent = 'first'
    player.append(video, first)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)
    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveTextContent('first')

    first.remove()
    const second = document.createElement('div')
    second.className = 'player-timedtext'
    second.textContent = 'second'
    player.append(second)
    await flushFrames(window, pipWindow)
    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveTextContent('second')

    second.textContent = ''
    await flushFrames(window, pipWindow)
    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveStyle({
      visibility: 'hidden',
    })
    mirror.destroy()
  })

  it('does not rescan subtitles for unrelated player mutations', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'stable subtitle'
    const getBoundingClientRect = vi.fn(
      () => ({ width: 800, height: 100, top: 0, left: 0, right: 800, bottom: 100 }) as DOMRect
    )
    subtitle.getBoundingClientRect = getBoundingClientRect
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)
    getBoundingClientRect.mockClear()

    player.append(document.createElement('div'))
    await flushFrames(window, pipWindow)

    expect(getBoundingClientRect).not.toHaveBeenCalled()
    mirror.destroy()
  })

  it('preserves subtitle data attributes and computed visual styles', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')

    const style = document.createElement('style')
    style.textContent =
      '.player-timedtext[data-uia="subtitle-text"] { color: rgb(12, 34, 56); font-size: 20px; }'
    document.head.append(style)

    const player = document.createElement('div')
    const video = document.createElement('video')
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.dataset.uia = 'subtitle-text'
    subtitle.textContent = 'styled subtitle'
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)

    const inner = pipWindow.document.querySelector<HTMLElement>(
      '#shortcut-override-pip-subtitle > div'
    )
    expect(inner).toHaveAttribute('data-uia', 'subtitle-text')
    expect(inner?.style.color).toBe(getComputedStyle(subtitle).color)
    expect(inner?.style.fontSize).toBe('20px')
    mirror.destroy()
    style.remove()
  })

  it('overrides source layout rules when positioning the PiP subtitle', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.style.cssText =
      'position: absolute; inset: auto 0 10% 0; margin: 20px; max-width: 100%; min-width: 400px; box-sizing: content-box; float: left;'
    subtitle.textContent = 'positioned subtitle'
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)

    const inner = pipWindow.document.querySelector<HTMLElement>(
      '#shortcut-override-pip-subtitle > div'
    )
    expect(inner?.style.top).toBe('0px')
    expect(inner?.style.right).toBe('auto')
    expect(inner?.style.bottom).toBe('auto')
    expect(inner?.style.left).toBe('0px')
    expect(inner?.style.margin).toBe('0px')
    expect(inner?.style.maxWidth).toBe('none')
    expect(inner?.style.minWidth).toBe('0px')
    expect(inner?.style.boxSizing).toBe('border-box')
    expect(inner?.style.float).toBe('none')
    mirror.destroy()
  })

  it('maps subtitles to the contained video when the PiP area is not 16:9', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'wide video'
    subtitle.getBoundingClientRect = () =>
      ({ width: 1000, height: 1000, top: 0, left: 0, right: 1000, bottom: 1000 }) as DOMRect
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    Object.defineProperties(videoArea, {
      clientWidth: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 1000 },
    })
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)

    expect(pipWindow.document.querySelector('#shortcut-override-pip-subtitle > div'))
      .toHaveStyle({ transform: 'translate(0px, 218.75px) scale(1)' })
    mirror.destroy()
  })

  it('keeps the subtitle frame stable when controls change the source height', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'stable subtitle frame'
    let sourceHeight = 600
    subtitle.getBoundingClientRect = () =>
      ({ width: 800, height: sourceHeight, top: 0, left: 0, right: 800, bottom: sourceHeight }) as DOMRect
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)
    const inner = pipWindow.document.querySelector<HTMLElement>('#shortcut-override-pip-subtitle > div')
    const firstTransform = inner?.style.transform
    expect(inner?.style.height).toBe('450px')

    sourceHeight = 500
    subtitle.style.setProperty('--controls-visible', 'true')
    await flushFrames(window, pipWindow)

    expect(inner?.style.transform).toBe(firstTransform)
    expect(inner?.style.height).toBe('450px')
    mirror.destroy()
  })

  it('keeps lower subtitles at the PiP video bottom when Netflix moves them for controls', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    const textContainer = document.createElement('div')
    textContainer.className = 'player-timedtext-text-container'
    textContainer.style.cssText = 'position:absolute; left:20%; top:72%;'
    textContainer.textContent = 'lower subtitle'
    subtitle.append(textContainer)
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)
    const mirrored = pipWindow.document.querySelector<HTMLElement>(
      '#shortcut-override-pip-subtitle .player-timedtext-text-container'
    )
    expect(mirrored?.style.top).toBe('auto')
    expect(mirrored?.style.bottom).toBe('8%')

    textContainer.style.top = '58%'
    await flushFrames(window, pipWindow)

    expect(mirrored?.style.top).toBe('auto')
    expect(mirrored?.style.bottom).toBe('8%')
    mirror.destroy()
  })

  it('resyncs after PiP resize', async () => {
    const pipWindow = iframe.contentWindow
    if (!pipWindow) throw new Error('Expected PiP window')
    const player = document.createElement('div')
    const video = document.createElement('video')
    Object.defineProperties(video, {
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'resize me'
    subtitle.getBoundingClientRect = () =>
      ({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600 }) as DOMRect
    player.append(video, subtitle)
    document.body.append(player)
    const videoArea = pipWindow.document.createElement('div')
    let width = 800
    Object.defineProperties(videoArea, {
      clientWidth: { configurable: true, get: () => width },
      clientHeight: { configurable: true, value: 600 },
    })
    pipWindow.document.body.append(videoArea)
    const mirror = new SubtitleMirror({
      sourceDocument: document,
      searchRoot: player,
      pipWindow,
      video,
      videoArea,
    })

    mirror.start()
    await flushFrames(window, pipWindow)
    const inner = pipWindow.document.querySelector<HTMLElement>('#shortcut-override-pip-subtitle > div')
    const firstTransform = inner?.style.transform
    width = 1_000
    pipWindow.dispatchEvent(new Event('resize'))
    await flushFrames(window, pipWindow)

    expect(inner?.style.transform).not.toBe(firstTransform)
    mirror.destroy()
  })
})
