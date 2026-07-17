import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PipManager } from './pip-manager'

const flushPipFrames = async (targetWindow: Window): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>(resolve => targetWindow.requestAnimationFrame(() => resolve()))
  await Promise.resolve()
}

describe('PipManager', () => {
  let manager: PipManager
  let iframe: HTMLIFrameElement
  let pipWindow: Window
  let requestWindow: ReturnType<typeof vi.fn>

  beforeEach(() => {
    document.body.innerHTML = ''

    iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    if (!iframe.contentWindow) throw new Error('Expected iframe window for PiP test')
    pipWindow = iframe.contentWindow

    Object.defineProperty(pipWindow, 'close', {
      configurable: true,
      value: vi.fn(),
    })

    requestWindow = vi.fn().mockResolvedValue(pipWindow)
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { requestWindow },
    })

    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
    })
  })

  afterEach(() => {
    manager.destroy()
    iframe.remove()
    delete (window as Window & { documentPictureInPicture?: unknown }).documentPictureInPicture
  })

  it('toggles entry and exit with the same manager operation', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.toggle()).toBe(true)
    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(video)

    expect(await manager.toggle()).toBe(true)
    expect(manager.isActive).toBe(false)
    expect(video.parentElement).toBe(document.body)
    expect(pipWindow.close).toHaveBeenCalledTimes(1)
  })

  it('does not start a second entry while the PiP window request is pending', async () => {
    let resolveWindow!: (value: Window) => void
    requestWindow.mockImplementationOnce(
      () =>
        new Promise<Window>(resolve => {
          resolveWindow = resolve
        })
    )

    const video = document.createElement('video')
    document.body.appendChild(video)

    const firstEntry = manager.toggle()
    expect(await manager.toggle()).toBe(false)
    expect(requestWindow).toHaveBeenCalledTimes(1)

    resolveWindow(pipWindow)
    expect(await firstEntry).toBe(true)
  })

  it('does not resurrect PiP after destruction cancels a pending entry', async () => {
    let resolveWindow!: (value: Window) => void
    requestWindow.mockImplementationOnce(
      () =>
        new Promise<Window>(resolve => {
          resolveWindow = resolve
        })
    )

    const video = document.createElement('video')
    document.body.appendChild(video)

    const entry = manager.enter()
    manager.destroy()
    resolveWindow(pipWindow)

    expect(await entry).toBe(false)
    expect(manager.isActive).toBe(false)
    expect(video.parentElement).toBe(document.body)
    expect(document.querySelector('[data-shortcut-override-pip-placeholder]')).toBeNull()
    expect(pipWindow.close).toHaveBeenCalledTimes(1)
  })

  it('mirrors Netflix subtitles and restores the original video order', async () => {
    const video = document.createElement('video')
    video.setAttribute('style', 'width: 77%; height: auto;')
    video.controls = true
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.setAttribute('style', 'color: white;')
    subtitle.textContent = 'first subtitle'
    document.body.append(video, subtitle)

    expect(await manager.enter()).toBe(true)
    await flushPipFrames(pipWindow)

    const mirror = pipWindow.document.getElementById('shortcut-override-pip-subtitle')
    expect(mirror).not.toBeNull()
    expect(mirror).toHaveTextContent('first subtitle')
    expect(mirror).toHaveStyle({ visibility: 'visible' })
    expect(mirror?.firstElementChild).toHaveAttribute(
      'style',
      expect.stringContaining('color: white')
    )

    subtitle.textContent = 'updated subtitle'
    await flushPipFrames(pipWindow)
    expect(mirror).toHaveTextContent('updated subtitle')

    subtitle.setAttribute('style', 'color: red;')
    await flushPipFrames(pipWindow)
    expect(mirror?.firstElementChild).toHaveAttribute(
      'style',
      expect.stringContaining('color: red')
    )

    subtitle.textContent = 'subtitle remains in the hidden source'
    subtitle.style.display = 'none'
    await flushPipFrames(pipWindow)
    expect(mirror).toHaveTextContent('subtitle remains in the hidden source')
    expect(mirror).toHaveStyle({ visibility: 'visible' })

    subtitle.textContent = ''
    await flushPipFrames(pipWindow)
    expect(mirror).toHaveStyle({ visibility: 'hidden' })

    manager.exit()

    expect(Array.from(document.body.children).filter(child => child !== iframe)).toEqual([
      video,
      subtitle,
    ])
    expect(video.getAttribute('style')).toBe('width: 77%; height: auto;')
    expect(video.controls).toBe(true)
  })

  it('detects a subtitle source that appears after PiP entry', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.textContent = 'late subtitle'
    document.body.appendChild(subtitle)
    await flushPipFrames(pipWindow)

    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveTextContent(
      'late subtitle'
    )
  })

  it('restores the video when the PiP window emits pagehide', async () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    pipWindow.dispatchEvent(new Event('pagehide'))

    expect(manager.isActive).toBe(false)
    expect(video.parentElement).toBe(document.body)
    expect(video.nextElementSibling).toBeNull()
  })

  it('notifies the keyboard handler when the PiP window loses focus', async () => {
    const onBlur = vi.fn()
    const video = document.createElement('video')
    document.body.appendChild(video)

    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      onBlur,
    })

    expect(await manager.enter()).toBe(true)
    pipWindow.dispatchEvent(new Event('blur'))

    expect(onBlur).toHaveBeenCalledWith(pipWindow.document)
  })

  it('notifies the keyboard handler before exiting PiP', async () => {
    const onBlur = vi.fn()
    const video = document.createElement('video')
    document.body.appendChild(video)

    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      onBlur,
    })

    expect(await manager.enter()).toBe(true)
    manager.exit()

    expect(onBlur).toHaveBeenCalledWith(pipWindow.document)
  })

  it('uses the first click to focus PiP and later clicks for the click handler', async () => {
    const onClick = vi.fn()
    const video = document.createElement('video')
    document.body.appendChild(video)

    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      onClick,
    })

    expect(await manager.enter()).toBe(true)

    pipWindow.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }))
    expect(onClick).not.toHaveBeenCalled()

    pipWindow.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)

    pipWindow.dispatchEvent(new Event('blur'))
    pipWindow.dispatchEvent(new Event('focus'))
    pipWindow.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(1)

    pipWindow.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true }))
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('cleans up the placeholder when creating the PiP window fails', async () => {
    requestWindow.mockRejectedValueOnce(new Error('PiP denied'))
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(false)
    expect(manager.isActive).toBe(false)
    expect(video.parentElement).toBe(document.body)
    expect(document.querySelector('[data-shortcut-override-pip-placeholder]')).toBeNull()
  })
})
