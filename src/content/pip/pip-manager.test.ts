import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PipManager } from './pip-manager'
import { VideoPlacement } from './video-placement'

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
    vi.useRealTimers()
  })

  it('reports Document PiP as unsupported on Firefox', () => {
    const firefoxWindow = {
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0',
      },
      documentPictureInPicture: {
        requestWindow: vi.fn(),
      },
    } as unknown as Window

    expect(PipManager.isSupported(firefoxWindow)).toBe(false)
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

  it('mounts custom controls and does not route control clicks to the video click handler', async () => {
    const onClick = vi.fn()
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      onClick,
    })
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    const controls = pipWindow.document.querySelector<HTMLElement>(
      '[data-shortcut-override-pip-controls]'
    )
    const timeline = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="timeline"]'
    )
    expect(controls).not.toBeNull()
    expect(timeline).not.toBeNull()

    const timelineClick = new MouseEvent('click', {
      button: 0,
      bubbles: true,
      cancelable: true,
    })
    timeline?.dispatchEvent(timelineClick)
    timeline?.dispatchEvent(new MouseEvent('click', { button: 0, bubbles: true, cancelable: true }))

    expect(timelineClick.defaultPrevented).toBe(false)
    expect(onClick).not.toHaveBeenCalled()

    manager.exit()
    expect(pipWindow.document.querySelector('[data-shortcut-override-pip-controls]')).toBeNull()
  })

  it('restores PiP shortcuts after the timeline is released', async () => {
    const onKeydown = vi.fn()
    manager = new PipManager({
      onKeydown,
      onKeyup: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    const timeline = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="timeline"]'
    )
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.focus()
    timeline.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    timeline.dispatchEvent(new Event('pointerup', { bubbles: true }))

    const keyboardTarget = pipWindow.document.activeElement ?? pipWindow.document.body
    keyboardTarget.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true, cancelable: true })
    )

    expect(pipWindow.document.activeElement).not.toBe(timeline)
    expect(onKeydown).toHaveBeenCalledOnce()
  })

  it('requests a fixed 640px initial width while preserving the video aspect ratio', async () => {
    const video = document.createElement('video')
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1920 })
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: 1080 })
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    expect(requestWindow).toHaveBeenCalledWith({ width: 640, height: 360 })
  })

  it('uses Document PiP even when native video PiP is available', async () => {
    const nativePipWindow = { width: 640, height: 360 }
    const requestPictureInPicture = vi.fn().mockResolvedValue(nativePipWindow)
    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      value: requestPictureInPicture,
    })
    Object.defineProperty(document, 'exitPictureInPicture', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    })

    try {
      const video = document.createElement('video')
      document.body.appendChild(video)

      expect(await manager.enter()).toBe(true)
      expect(requestPictureInPicture).not.toHaveBeenCalled()
      expect(requestWindow).toHaveBeenCalledOnce()
      expect(pipWindow.document.querySelector('video')).toBe(video)
    } finally {
      manager.destroy()
      delete (HTMLVideoElement.prototype as { requestPictureInPicture?: unknown })
        .requestPictureInPicture
      delete (document as { exitPictureInPicture?: unknown }).exitPictureInPicture
    }
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

  it('keeps PiP open and adopts the next Netflix video element', async () => {
    vi.useFakeTimers()
    const firstVideo = document.createElement('video')
    document.body.appendChild(firstVideo)

    expect(await manager.enter()).toBe(true)

    document.body.appendChild(firstVideo)
    const nextVideo = document.createElement('video')
    Object.defineProperty(nextVideo, 'currentTime', { configurable: true, value: 4 })
    Object.defineProperty(nextVideo, 'duration', { configurable: true, value: 1_800 })
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
    expect(
      pipWindow.document.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    ).toHaveAttribute('max', '1800')
    expect(pipWindow.document.querySelectorAll('[data-shortcut-override-pip-controls]')).toHaveLength(
      1
    )

    manager.exit()
    expect(nextVideo.ownerDocument).toBe(document)
    expect(nextVideo.parentElement).toBe(document.body)
    expect(document.querySelector('[data-shortcut-override-pip-placeholder]')).toBeNull()
  })

  it('keeps PiP open when Netflix reuses the same video element for the next episode', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    document.body.appendChild(video)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
    expect(pipWindow.document.querySelector('video')).toBe(video)
  })

  it('adopts a replacement video that appears after the old video was reattached', async () => {
    vi.useFakeTimers()
    const firstVideo = document.createElement('video')
    document.body.appendChild(firstVideo)

    expect(await manager.enter()).toBe(true)

    document.body.appendChild(firstVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)
    expect(pipWindow.document.querySelector('video')).toBe(firstVideo)

    const nextVideo = document.createElement('video')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)

    firstVideo.dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(300)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
  })

  it('ignores unrelated source videos when the PiP video never detached', async () => {
    vi.useFakeTimers()
    const currentVideo = document.createElement('video')
    document.body.appendChild(currentVideo)

    expect(await manager.enter()).toBe(true)

    const unrelatedVideo = document.createElement('video')
    document.body.appendChild(unrelatedVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(currentVideo)
    expect(unrelatedVideo.ownerDocument).toBe(document)
  })

  it('adopts the next episode when Netflix ends the PiP video without detaching it', async () => {
    vi.useFakeTimers()
    const firstVideo = document.createElement('video')
    document.body.appendChild(firstVideo)

    expect(await manager.enter()).toBe(true)

    firstVideo.dispatchEvent(new Event('ended'))
    const nextVideo = document.createElement('video')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
  })

  it('uses the previous video size while the next episode metadata is still unavailable', async () => {
    vi.useFakeTimers()
    const firstVideo = document.createElement('video')
    Object.defineProperty(firstVideo, 'videoWidth', { configurable: true, value: 1920 })
    Object.defineProperty(firstVideo, 'videoHeight', { configurable: true, value: 1080 })
    document.body.appendChild(firstVideo)

    expect(await manager.enter()).toBe(true)

    firstVideo.dispatchEvent(new Event('ended'))
    const nextVideo = document.createElement('video')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(nextVideo.style.aspectRatio).toBe('1920 / 1080')
    expect(nextVideo.style.objectFit).toBe('fill')

    Object.defineProperty(nextVideo, 'videoWidth', { configurable: true, value: 1920 })
    Object.defineProperty(nextVideo, 'videoHeight', { configurable: true, value: 1080 })
    nextVideo.dispatchEvent(new Event('loadedmetadata'))

    expect(nextVideo.style.aspectRatio).toBe('1920 / 1080')
    expect(nextVideo.style.objectFit).toBe('contain')
  })

  it('finds the next episode video when a stale Netflix player is still first in the DOM', async () => {
    vi.useFakeTimers()
    const stalePlayer = document.createElement('div')
    stalePlayer.className = 'watch-video'
    const activePlayer = document.createElement('div')
    activePlayer.className = 'watch-video--player-view'
    const firstVideo = document.createElement('video')
    activePlayer.appendChild(firstVideo)
    document.body.append(stalePlayer, activePlayer)

    expect(await manager.enter()).toBe(true)

    firstVideo.dispatchEvent(new Event('emptied'))
    const nextVideo = document.createElement('video')
    activePlayer.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
  })

  it('tracks a replacement Netflix player root during handoff', async () => {
    vi.useFakeTimers()
    const firstPlayer = document.createElement('div')
    firstPlayer.className = 'watch-video'
    const firstVideo = document.createElement('video')
    firstPlayer.appendChild(firstVideo)
    document.body.appendChild(firstPlayer)

    expect(await manager.enter()).toBe(true)

    firstVideo.dispatchEvent(new Event('ended'))
    const nextPlayer = document.createElement('div')
    nextPlayer.className = 'watch-video--player-view'
    const nextVideo = document.createElement('video')
    nextPlayer.appendChild(nextVideo)
    firstPlayer.replaceWith(nextPlayer)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
  })

  it('re-adopts the same video in its new player root and restores it there', async () => {
    vi.useFakeTimers()
    const firstPlayer = document.createElement('div')
    firstPlayer.className = 'watch-video'
    const video = document.createElement('video')
    firstPlayer.appendChild(video)
    document.body.appendChild(firstPlayer)

    expect(await manager.enter()).toBe(true)

    const nextPlayer = document.createElement('div')
    nextPlayer.className = 'watch-video--player-view'
    nextPlayer.appendChild(video)
    document.body.appendChild(nextPlayer)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(video)

    manager.exit()
    expect(video.parentElement).toBe(nextPlayer)
  })

  it('closes PiP instead of leaving a black window when no next video appears', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.remove()
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(8_100)

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
    expect(document.querySelector('[data-shortcut-override-pip-placeholder]')).toBeNull()
  })

  it('closes a black PiP when the ended video remains attached and no replacement appears', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(8_100)

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
  })

  it('closes PiP after repeated video handoff failures', async () => {
    vi.useFakeTimers()
    const replaceVideo = vi
      .spyOn(VideoPlacement.prototype, 'replaceVideo')
      .mockImplementation(() => {
        throw new Error('simulated handoff failure')
      })
    const video = document.createElement('video')
    document.body.appendChild(video)

    try {
      expect(await manager.enter()).toBe(true)

      video.dispatchEvent(new Event('ended'))
      document.body.appendChild(document.createElement('video'))
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(1_000)

      expect(manager.isActive).toBe(false)
      expect(replaceVideo).toHaveBeenCalledTimes(3)
      expect(pipWindow.close).toHaveBeenCalledOnce()
    } finally {
      replaceVideo.mockRestore()
    }
  })

  it('keeps PiP open across repeated successful video adoptions', async () => {
    vi.useFakeTimers()
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const currentVideo = pipWindow.document.querySelector('video')
      expect(currentVideo).not.toBeNull()
      currentVideo?.dispatchEvent(new Event('ended'))
      const nextVideo = document.createElement('video')
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)

      expect(manager.isActive).toBe(true)
      expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
      document.querySelectorAll('video').forEach(video => {
        if (video !== nextVideo) video.remove()
      })
    }

    expect(pipWindow.close).not.toHaveBeenCalled()
  })

  it('keeps PiP open when Netflix loads the next episode into the same attached video', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    video.dispatchEvent(new Event('loadedmetadata'))
    await vi.advanceTimersByTimeAsync(8_100)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
    expect(pipWindow.document.querySelector('video')).toBe(video)
  })

  it('does not send video clicks to playback while the next episode is being handed off', async () => {
    vi.useFakeTimers()
    const onClick = vi.fn()
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      onClick,
    })
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    video.dispatchEvent(new Event('ended'))

    const timeline = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="timeline"]'
    )
    timeline?.dispatchEvent(
      new MouseEvent('click', { button: 0, bubbles: true, cancelable: true })
    )

    const click = new MouseEvent('click', { button: 0, bubbles: true, cancelable: true })
    pipWindow.dispatchEvent(click)

    expect(click.defaultPrevented).toBe(true)
    expect(onClick).not.toHaveBeenCalled()

    video.dispatchEvent(new Event('loadedmetadata'))
    const recoveredClick = new MouseEvent('click', {
      button: 0,
      bubbles: true,
      cancelable: true,
    })
    pipWindow.dispatchEvent(recoveredClick)

    expect(recoveredClick.defaultPrevented).toBe(false)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('ignores late handoff events after destroy', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    manager.destroy()

    const lateVideo = document.createElement('video')
    video.dispatchEvent(new Event('ended'))
    document.body.appendChild(lateVideo)
    await vi.advanceTimersByTimeAsync(8_100)

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
    expect(lateVideo.parentElement).toBe(document.body)
    expect(
      pipWindow.document.querySelector('[data-shortcut-override-pip-controls]')
    ).toBeNull()
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

  it('uses the first video click for the click handler, including after refocus', async () => {
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
    expect(onClick).toHaveBeenCalledTimes(1)

    pipWindow.dispatchEvent(new Event('blur'))
    pipWindow.dispatchEvent(new Event('focus'))
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
