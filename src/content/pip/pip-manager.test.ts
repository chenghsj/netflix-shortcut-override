import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { PipManager } from './pip-manager'
import { VideoPlacement } from './video-placement'

const flushPipFrames = async (targetWindow: Window): Promise<void> => {
  await Promise.resolve()
  await new Promise<void>(resolve => targetWindow.requestAnimationFrame(() => resolve()))
  await Promise.resolve()
}

const createRenderableVideo = (): HTMLVideoElement => {
  const video = document.createElement('video')
  video.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      right: 640,
      bottom: 360,
      left: 0,
      width: 640,
      height: 360,
      toJSON: () => ({}),
    }) as DOMRect
  return video
}

const appendNetflixVideoTitle = (text = 'Series S1:E2 Next episode'): HTMLElement => {
  const title = document.createElement('div')
  title.dataset.uia = 'video-title'
  title.textContent = text
  document.body.appendChild(title)
  return title
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

  it('keeps PiP command routing and settings changes behind the manager', async () => {
    const transport = vi.fn().mockResolvedValue({ success: true })
    const onSettingsChange = vi.fn()
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
      onSettingsChange,
      settings: {
        ...DEFAULT_SETTINGS,
        locale: 'zh-TW',
        seek: { seconds: 5 },
      },
    })
    const video = document.createElement('video')
    video.volume = 0.7
    const subtitle = document.createElement('div')
    subtitle.className = 'player-timedtext'
    subtitle.style.fontSize = '16px'
    subtitle.textContent = '字幕'
    document.body.append(video, subtitle)

    expect(await manager.enter()).toBe(true)
    await flushPipFrames(pipWindow)
    const rewind = pipWindow.document.querySelector<HTMLButtonElement>(
      '[data-pip-control="seek-backward"]'
    )
    const volume = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="volume"]'
    )
    expect(rewind).toHaveAccessibleName('倒轉 5 秒')

    rewind?.click()
    expect(transport).toHaveBeenCalledWith('seek', -5_000)

    manager.updateSettings({
      ...DEFAULT_SETTINGS,
      locale: 'zh-TW',
      seek: { seconds: 25 },
      pip: {
        subtitlesEnabled: true,
        subtitleSize: 'large',
        subtitleBackground: 'translucent',
      },
    })
    await flushPipFrames(pipWindow)
    expect(rewind).toHaveAccessibleName('倒轉 25 秒')
    expect(
      pipWindow.document.querySelector<HTMLElement>('#shortcut-override-pip-subtitle > div')?.style
        .fontSize
    ).toBe('20px')

    if (!volume) throw new Error('Expected volume slider')
    volume.value = '40'
    volume.dispatchEvent(new Event('change', { bubbles: true }))
    expect(transport).toHaveBeenCalledWith('setVolume', 0.4)

    pipWindow.document
      .querySelector<HTMLButtonElement>('[data-pip-control="subtitles-button"]')
      ?.click()
    pipWindow.document
      .querySelector<HTMLButtonElement>('[data-pip-control="subtitle-switch"]')
      ?.click()
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pip: {
          subtitlesEnabled: false,
          subtitleSize: 'large',
          subtitleBackground: 'translucent',
        },
      })
    )
    await flushPipFrames(pipWindow)
    expect(pipWindow.document.getElementById('shortcut-override-pip-subtitle')).toHaveStyle({
      visibility: 'hidden',
    })
  })

  it('resumes an ended Netflix episode after seeking back from PiP', async () => {
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: { seekCalled: true },
    })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    Object.defineProperties(video, {
      currentTime: { configurable: true, value: 240 },
      duration: { configurable: true, value: 240 },
      ended: { configurable: true, value: true },
      paused: { configurable: true, value: true },
      play: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
    })
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    expect(video.ended).toBe(true)
    const timeline = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="timeline"]'
    )
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '180'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(transport.mock.calls.map(([action]) => action)).toEqual(['seekTo', 'play'])
  })

  it('cancels an ended-episode resume when PiP closes during a seek', async () => {
    let resolveSeek: (response: { success: boolean; result?: { seekCalled: boolean } }) => void = () => undefined
    const transport = vi.fn().mockImplementation((action: string) => {
      if (action === 'seekTo') {
        return new Promise<{ success: boolean; result?: { seekCalled: boolean } }>(resolve => {
          resolveSeek = resolve
        })
      }
      return Promise.resolve({ success: true, result: { action } })
    })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    Object.defineProperties(video, {
      currentTime: { configurable: true, value: 240 },
      duration: { configurable: true, value: 240 },
      ended: { configurable: true, value: true },
      paused: { configurable: true, value: true },
      play: { configurable: true, value: vi.fn().mockResolvedValue(undefined) },
    })
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    const timeline = pipWindow.document.querySelector<HTMLInputElement>(
      '[data-pip-control="timeline"]'
    )
    if (!timeline) throw new Error('Expected PiP timeline')

    timeline.value = '180'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    manager.exit()
    resolveSeek({ success: true, result: { seekCalled: true } })
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(transport.mock.calls.map(([action]) => action)).toEqual(['seekTo'])
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

  it('uses Document PiP even when the browser video PiP API is available', async () => {
    const browserVideoPipWindow = { width: 640, height: 360 }
    const requestPictureInPicture = vi.fn().mockResolvedValue(browserVideoPipWindow)
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

  it('closes PiP when the source leaves the Netflix playback context', async () => {
    vi.useFakeTimers()
    const originalUrl = window.location.href
    window.history.replaceState({}, '', '/watch/123')
    const video = document.createElement('video')
    document.body.appendChild(video)

    try {
      expect(await manager.enter()).toBe(true)

      window.history.pushState({}, '', '/browse')
      await vi.advanceTimersByTimeAsync(300)

      expect(manager.isActive).toBe(false)
      expect(pipWindow.close).toHaveBeenCalledOnce()
      expect(video.ownerDocument).toBe(document)
      expect(video.parentElement).toBe(document.body)
    } finally {
      window.history.replaceState({}, '', originalUrl)
    }
  })

  it('closes PiP when the source tab switches to a different watch title', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const originalUrl = window.location.href
    window.history.replaceState({}, '', '/watch/123?trackId=old')
    const video = document.createElement('video')
    document.body.appendChild(video)

    try {
      expect(await manager.enter()).toBe(true)

      document.dispatchEvent(new Event('pointerdown'))
      window.history.pushState({}, '', '/watch/456?trackId=new')
      video.dispatchEvent(new Event('emptied'))
      const nextVideo = createRenderableVideo()
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)

      expect(manager.isActive).toBe(false)
      expect(pipWindow.close).toHaveBeenCalledOnce()
      expect(video.ownerDocument).toBe(document)
      expect(video.parentElement).toBe(document.body)
      expect(transport).not.toHaveBeenCalledWith('pause')
    } finally {
      window.history.replaceState({}, '', originalUrl)
    }
  })

  it('pauses an automatic episode transition when the watch ID changes first', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const originalUrl = window.location.href
    window.history.replaceState({}, '', '/watch/123')
    const video = document.createElement('video')
    document.body.appendChild(video)

    try {
      expect(await manager.enter()).toBe(true)

      window.history.pushState({}, '', '/watch/456')
      await vi.advanceTimersByTimeAsync(300)
      video.dispatchEvent(new Event('ended'))
      await vi.advanceTimersByTimeAsync(500)

      expect(manager.isActive).toBe(true)

      const nextVideo = createRenderableVideo()
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)
      appendNetflixVideoTitle()
      nextVideo.dispatchEvent(new Event('playing'))
      await Promise.resolve()

      expect(transport).toHaveBeenCalledWith('pause')
      expect(manager.isActive).toBe(false)
      expect(pipWindow.close).toHaveBeenCalledOnce()
    } finally {
      window.history.replaceState({}, '', originalUrl)
    }
  })

  it('keeps PiP open when only the current watch URL query changes', async () => {
    vi.useFakeTimers()
    const originalUrl = window.location.href
    window.history.replaceState({}, '', '/watch/123?trackId=old')
    const video = document.createElement('video')
    document.body.appendChild(video)

    try {
      expect(await manager.enter()).toBe(true)

      window.history.pushState({}, '', '/watch/123?trackId=new')
      await vi.advanceTimersByTimeAsync(300)

      expect(manager.isActive).toBe(true)
      expect(pipWindow.close).not.toHaveBeenCalled()
    } finally {
      window.history.replaceState({}, '', originalUrl)
    }
  })

  it('keeps PiP open and adopts the next Netflix video element', async () => {
    vi.useFakeTimers()
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    document.body.appendChild(initialVideo)
    const nextVideo = createRenderableVideo()
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
    const video = createRenderableVideo()
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
    const initialVideo = createRenderableVideo()
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    document.body.appendChild(initialVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)
    expect(pipWindow.document.querySelector('video')).toBe(initialVideo)

    const nextVideo = createRenderableVideo()
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)

    initialVideo.dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(300)
    expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
  })

  it('adopts the highest-ranked presentation-ready replacement', async () => {
    vi.useFakeTimers()
    const player = document.createElement('div')
    player.className = 'watch-video'
    const initialVideo = document.createElement('video')
    player.appendChild(initialVideo)
    document.body.appendChild(player)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('error'))
    const staleVideo = document.createElement('video')
    Object.defineProperty(staleVideo, 'readyState', { configurable: true, value: 0 })
    const readyVideo = document.createElement('video')
    Object.defineProperties(readyVideo, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    player.append(staleVideo, readyVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(readyVideo)
    expect(staleVideo.ownerDocument).toBe(document)
  })

  it('ranks replacement candidates globally across Netflix player roots', async () => {
    vi.useFakeTimers()
    const rememberedPlayer = document.createElement('div')
    rememberedPlayer.className = 'watch-video'
    const otherPlayer = document.createElement('div')
    otherPlayer.className = 'watch-video--player-view'
    const initialVideo = document.createElement('video')
    rememberedPlayer.appendChild(initialVideo)
    document.body.append(rememberedPlayer, otherPlayer)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('error'))
    const staleVideo = document.createElement('video')
    Object.defineProperty(staleVideo, 'readyState', { configurable: true, value: 0 })
    const readyVideo = document.createElement('video')
    Object.defineProperties(readyVideo, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    rememberedPlayer.appendChild(staleVideo)
    otherPlayer.appendChild(readyVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(readyVideo)
    expect(staleVideo.ownerDocument).toBe(document)
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

  it('does not treat a sibling video observed before the boundary as the next episode', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const player = document.createElement('div')
    player.className = 'watch-video'
    const currentVideo = document.createElement('video')
    const preBoundarySibling = createRenderableVideo()
    player.append(currentVideo, preBoundarySibling)
    document.body.appendChild(player)

    expect(await manager.enter()).toBe(true)

    currentVideo.dispatchEvent(new Event('ended'))
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(preBoundarySibling)
    expect(transport).not.toHaveBeenCalledWith('pause')
    expect(pipWindow.close).not.toHaveBeenCalled()
  })

  it('pauses a detected next episode once playback initializes without focusing its page', async () => {
    vi.useFakeTimers()
    const replaceVideo = vi.spyOn(VideoPlacement.prototype, 'replaceVideo')
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const focus = vi.spyOn(window, 'focus')
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    Object.defineProperties(nextVideo, {
      currentTime: {
        configurable: true,
        value: 0,
      },
      readyState: {
        configurable: true,
        value: HTMLMediaElement.HAVE_CURRENT_DATA,
      },
    })
    const pause = vi.spyOn(nextVideo, 'pause')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()

    appendNetflixVideoTitle()
    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(transport).toHaveBeenCalledWith('pause')
    expect(replaceVideo).not.toHaveBeenCalled()
    expect(nextVideo.ownerDocument).toBe(document)
    expect(focus).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(8_001)
    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(4)
  })

  it('pauses a replacement next-episode video that Netflix starts after PiP closes', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const player = document.createElement('div')
    player.className = 'watch-video'
    const initialVideo = document.createElement('video')
    player.appendChild(initialVideo)
    document.body.appendChild(player)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const detectedNextVideo = createRenderableVideo()
    Object.defineProperty(detectedNextVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    player.appendChild(detectedNextVideo)
    await Promise.resolve()
    await Promise.resolve()

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()

    detectedNextVideo.remove()
    const playingNextVideo = createRenderableVideo()
    const pause = vi.spyOn(playingNextVideo, 'pause')
    player.appendChild(playingNextVideo)
    appendNetflixVideoTitle()
    playingNextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(2)
  })

  it('pauses next-episode playback after Netflix replaces its player root', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const initialPlayer = document.createElement('div')
    initialPlayer.className = 'watch-video'
    const initialVideo = document.createElement('video')
    initialPlayer.appendChild(initialVideo)
    document.body.appendChild(initialPlayer)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const detectedNextVideo = createRenderableVideo()
    Object.defineProperty(detectedNextVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    initialPlayer.appendChild(detectedNextVideo)
    await Promise.resolve()
    await Promise.resolve()

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()

    initialPlayer.remove()
    const nextPlayer = document.createElement('div')
    nextPlayer.className = 'watch-video'
    const playingNextVideo = createRenderableVideo()
    const pause = vi.spyOn(playingNextVideo, 'pause')
    nextPlayer.appendChild(playingNextVideo)
    document.body.appendChild(nextPlayer)
    appendNetflixVideoTitle()
    playingNextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(transport).toHaveBeenCalledWith('pause')
  })

  it('lets Netflix bind the next-episode UI before pausing it in the next microtask', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const previousPlayer = document.createElement('div')
    previousPlayer.className = 'watch-video'
    const initialVideo = document.createElement('video')
    previousPlayer.appendChild(initialVideo)
    document.body.appendChild(previousPlayer)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const detectedNextVideo = createRenderableVideo()
    Object.defineProperty(detectedNextVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    previousPlayer.appendChild(detectedNextVideo)
    await Promise.resolve()
    await Promise.resolve()

    expect(manager.isActive).toBe(false)
    expect(previousPlayer.isConnected).toBe(true)

    const activePlayer = document.createElement('div')
    activePlayer.className = 'watch-video'
    const playingNextVideo = createRenderableVideo()
    Object.defineProperty(playingNextVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    let nextVideoPaused = false
    Object.defineProperty(playingNextVideo, 'paused', {
      configurable: true,
      get: () => nextVideoPaused,
    })
    const pause = vi.spyOn(playingNextVideo, 'pause').mockImplementation(() => {
      nextVideoPaused = true
    })
    let netflixUiBound = false
    playingNextVideo.addEventListener('playing', () => {
      if (playingNextVideo.paused) return
      netflixUiBound = true
      appendNetflixVideoTitle()
    })
    activePlayer.appendChild(playingNextVideo)
    document.body.appendChild(activePlayer)
    playingNextVideo.dispatchEvent(new Event('playing'))

    expect(netflixUiBound).toBe(true)
    expect(pause).not.toHaveBeenCalled()

    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(transport).toHaveBeenCalledWith('pause')
  })

  it('does not pause an unrelated player root before next-episode identity advances', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const player = document.createElement('div')
    player.className = 'watch-video'
    const initialVideo = document.createElement('video')
    player.appendChild(initialVideo)
    const previewRoot = document.createElement('div')
    previewRoot.className = 'watch-video'
    document.body.append(player, previewRoot)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    player.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    const previewVideo = createRenderableVideo()
    Object.defineProperty(previewVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    Object.defineProperty(previewVideo, 'paused', { configurable: true, value: false })
    const previewPause = vi.spyOn(previewVideo, 'pause')
    previewRoot.appendChild(previewVideo)
    previewVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(previewPause).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalledWith('pause')

    appendNetflixVideoTitle()
    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(transport).toHaveBeenCalledWith('pause')
  })

  it('waits for Netflix title metadata before pausing initialized next-episode playback', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)
    const title = appendNetflixVideoTitle('Series S1:E1 Previous episode')

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    const pause = vi.spyOn(nextVideo, 'pause')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalledOnce()
    expect(transport).not.toHaveBeenCalledWith('pause')

    title.textContent = 'Series S1:E2 Next episode'
    await Promise.resolve()
    await Promise.resolve()

    expect(pause).toHaveBeenCalledTimes(2)
    expect(transport).toHaveBeenCalledWith('pause')
  })

  it('pauses next-episode playback after a short fallback when title metadata never appears', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    const pause = vi.spyOn(nextVideo, 'pause')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    nextVideo.dispatchEvent(new Event('playing'))
    await vi.advanceTimersByTimeAsync(1_999)
    expect(pause).toHaveBeenCalledOnce()

    await vi.advanceTimersByTimeAsync(1)
    expect(pause).toHaveBeenCalledTimes(2)
  })

  it('does not extend the fallback deadline when Netflix retries playing', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    nextVideo.dispatchEvent(new Event('playing'))
    await vi.advanceTimersByTimeAsync(1_000)
    nextVideo.dispatchEvent(new Event('playing'))
    await vi.advanceTimersByTimeAsync(999)

    expect(transport).not.toHaveBeenCalledWith('pause')

    await vi.advanceTimersByTimeAsync(1)

    expect(transport).toHaveBeenCalledWith('pause')
  })

  it('does not auto-pause the next episode after the user takes over', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)
    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('ended'))
    const nextVideo = createRenderableVideo()
    Object.defineProperty(nextVideo, 'readyState', {
      configurable: true,
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    })
    const pause = vi.spyOn(nextVideo, 'pause')
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalledWith('pause')

    document.dispatchEvent(new Event('pointerdown'))
    nextVideo.dispatchEvent(new Event('play'))
    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
  })

  it('leaves the next episode video in Netflix so its controls and metadata stay bound', async () => {
    vi.useFakeTimers()
    const player = document.createElement('div')
    player.className = 'watch-video'
    const initialVideo = document.createElement('video')
    player.appendChild(initialVideo)
    document.body.appendChild(player)
    expect(await manager.enter()).toBe(true)

    let nextVideoRemovalCount = 0
    const observer = new MutationObserver(records => {
      nextVideoRemovalCount += records.filter(record =>
        Array.from(record.removedNodes).includes(nextVideo)
      ).length
    })
    observer.observe(player, { childList: true, subtree: true })
    const nextVideo = createRenderableVideo()

    try {
      initialVideo.dispatchEvent(new Event('ended'))
      player.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)
      await Promise.resolve()

      expect(manager.isActive).toBe(false)
      expect(nextVideo.parentElement).toBe(player)
      expect(nextVideoRemovalCount).toBe(0)
    } finally {
      observer.disconnect()
    }
  })

  it('does not detach the next episode after Netflix binds its metadata and controls', async () => {
    vi.useFakeTimers()
    const player = document.createElement('div')
    player.className = 'watch-video'
    const initialVideo = document.createElement('video')
    player.appendChild(initialVideo)
    document.body.appendChild(player)

    expect(await manager.enter()).toBe(true)

    let nextReadyState: number = HTMLMediaElement.HAVE_NOTHING
    let netflixSessionBound = false
    let netflixSessionValid = true
    const nextVideo = document.createElement('video')
    Object.defineProperty(nextVideo, 'readyState', {
      configurable: true,
      get: () => nextReadyState,
    })
    const netflixPlayerObserver = new MutationObserver(records => {
      const removedAfterBinding = records.some(record =>
        Array.from(record.removedNodes).includes(nextVideo)
      )
      if (netflixSessionBound && removedAfterBinding) netflixSessionValid = false
    })
    netflixPlayerObserver.observe(player, { childList: true, subtree: true })

    try {
      initialVideo.dispatchEvent(new Event('ended'))
      player.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(250)

      netflixSessionBound = true
      nextReadyState = HTMLMediaElement.HAVE_CURRENT_DATA
      await vi.advanceTimersByTimeAsync(300)
      await Promise.resolve()

      expect(manager.isActive).toBe(false)
      expect(netflixSessionValid).toBe(true)
      expect(nextVideo.parentElement).toBe(player)
    } finally {
      netflixPlayerObserver.disconnect()
    }
  })

  it('reopens PiP with the ready previous-episode video instead of a stale black video', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const player = document.createElement('div')
    player.className = 'watch-video'
    const endingVideo = document.createElement('video')
    player.appendChild(endingVideo)
    document.body.appendChild(player)

    expect(await manager.enter()).toBe(true)

    endingVideo.dispatchEvent(new Event('ended'))
    const pausedNextVideo = document.createElement('video')
    Object.defineProperty(pausedNextVideo, 'readyState', { configurable: true, value: 0 })
    player.appendChild(pausedNextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(false)
    endingVideo.remove()

    const readyPreviousVideo = document.createElement('video')
    Object.defineProperties(readyPreviousVideo, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_CURRENT_DATA },
      videoWidth: { configurable: true, value: 1920 },
      videoHeight: { configurable: true, value: 1080 },
    })
    player.appendChild(readyPreviousVideo)

    expect(await manager.enter()).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(readyPreviousVideo)
    expect(pausedNextVideo.ownerDocument).toBe(document)
  })

  it('uses the previous video size while replacement metadata is still unavailable', async () => {
    vi.useFakeTimers()
    const initialVideo = document.createElement('video')
    Object.defineProperty(initialVideo, 'videoWidth', { configurable: true, value: 1920 })
    Object.defineProperty(initialVideo, 'videoHeight', { configurable: true, value: 1080 })
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('error'))
    const nextVideo = createRenderableVideo()
    document.body.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(nextVideo.style.aspectRatio).toBe('1920 / 1080')
    expect(nextVideo.style.objectFit).toBe('contain')

    Object.defineProperty(nextVideo, 'videoWidth', { configurable: true, value: 1920 })
    Object.defineProperty(nextVideo, 'videoHeight', { configurable: true, value: 1080 })
    nextVideo.dispatchEvent(new Event('loadedmetadata'))

    expect(nextVideo.style.aspectRatio).toBe('1920 / 1080')
    expect(nextVideo.style.objectFit).toBe('contain')
  })

  it('pauses the next episode beside a stale Netflix player and closes PiP', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const stalePlayer = document.createElement('div')
    stalePlayer.className = 'watch-video'
    const activePlayer = document.createElement('div')
    activePlayer.className = 'watch-video--player-view'
    const initialVideo = document.createElement('video')
    activePlayer.appendChild(initialVideo)
    document.body.append(stalePlayer, activePlayer)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('emptied'))
    const nextVideo = createRenderableVideo()
    const pause = vi.spyOn(nextVideo, 'pause')
    activePlayer.appendChild(nextVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)
    appendNetflixVideoTitle()
    nextVideo.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalled()
    expect(transport).toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
    expect(nextVideo.parentElement).toBe(activePlayer)
  })

  it('tracks a replacement Netflix player root during recovery', async () => {
    vi.useFakeTimers()
    const firstPlayer = document.createElement('div')
    firstPlayer.className = 'watch-video'
    const initialVideo = document.createElement('video')
    firstPlayer.appendChild(initialVideo)
    document.body.appendChild(firstPlayer)

    expect(await manager.enter()).toBe(true)

    initialVideo.dispatchEvent(new Event('error'))
    const nextPlayer = document.createElement('div')
    nextPlayer.className = 'watch-video--player-view'
    const nextVideo = createRenderableVideo()
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
    const video = createRenderableVideo()
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

  it('waits for an unusable replacement placeholder and closes on timeout', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('error'))
    const placeholderVideo = document.createElement('video')
    Object.defineProperties(placeholderVideo, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_NOTHING },
      videoWidth: { configurable: true, value: 0 },
      videoHeight: { configurable: true, value: 0 },
    })
    document.body.appendChild(placeholderVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(video)
    expect(placeholderVideo.ownerDocument).toBe(document)

    await vi.advanceTimersByTimeAsync(8_000)

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
  })

  it('adopts a replacement placeholder after it becomes renderable', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('error'))
    const replacementVideo = document.createElement('video')
    document.body.appendChild(replacementVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(pipWindow.document.querySelector('video')).toBe(video)

    replacementVideo.getBoundingClientRect = createRenderableVideo().getBoundingClientRect
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(replacementVideo)
    expect(pipWindow.close).not.toHaveBeenCalled()
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

  it('keeps the final-episode video area pinned to the PiP viewport while awaiting timeout', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    video.dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(300)

    const videoArea = pipWindow.document.querySelector<HTMLElement>(
      '[data-shortcut-override-pip-controls]'
    )?.parentElement
    expect(videoArea).not.toBeNull()
    expect(videoArea).toHaveStyle({ position: 'fixed', inset: '0' })
  })

  it('restores full-size PiP video styles when Netflix shrinks the video at final credits', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)
    video.dispatchEvent(new Event('ended'))
    video.style.width = '360px'
    video.style.height = '203px'
    video.style.maxWidth = '360px'
    video.style.maxHeight = '203px'
    await Promise.resolve()
    await Promise.resolve()

    expect(video.style.getPropertyValue('width')).toBe('100%')
    expect(video.style.getPropertyPriority('width')).toBe('important')
    expect(video.style.getPropertyValue('height')).toBe('100%')
    expect(video.style.getPropertyPriority('height')).toBe('important')
    expect(video.style.getPropertyValue('max-width')).toBe('100%')
    expect(video.style.getPropertyValue('max-height')).toBe('100%')
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

      video.dispatchEvent(new Event('error'))
      document.body.appendChild(createRenderableVideo())
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

  it('closes PiP on the third recovery cycle even when every adoption succeeds', async () => {
    vi.useFakeTimers()
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const currentVideo = pipWindow.document.querySelector('video')
      expect(currentVideo).not.toBeNull()
      currentVideo?.dispatchEvent(new Event('error'))
      const nextVideo = createRenderableVideo()
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)

      if (attempt < 2) {
        expect(manager.isActive).toBe(true)
        expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
      }
      document.querySelectorAll('video').forEach(video => {
        if (video !== nextVideo) video.remove()
      })
    }

    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
  })

  it('forgets recovery cycles after five stable seconds', async () => {
    vi.useFakeTimers()
    const initialVideo = document.createElement('video')
    document.body.appendChild(initialVideo)

    expect(await manager.enter()).toBe(true)

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const currentVideo = pipWindow.document.querySelector('video')
      currentVideo?.dispatchEvent(new Event('error'))
      const nextVideo = createRenderableVideo()
      document.body.appendChild(nextVideo)
      await Promise.resolve()
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(300)
      expect(pipWindow.document.querySelector('video')).toBe(nextVideo)
      document.querySelectorAll('video').forEach(video => {
        if (video !== nextVideo) video.remove()
      })
    }

    await vi.advanceTimersByTimeAsync(5_000)
    const currentVideo = pipWindow.document.querySelector('video')
    currentVideo?.dispatchEvent(new Event('error'))
    const recoveredVideo = createRenderableVideo()
    document.body.appendChild(recoveredVideo)
    await Promise.resolve()
    await Promise.resolve()
    await vi.advanceTimersByTimeAsync(300)

    expect(manager.isActive).toBe(true)
    expect(pipWindow.document.querySelector('video')).toBe(recoveredVideo)
    expect(pipWindow.close).not.toHaveBeenCalled()
  })

  it('treats emptied as a new boundary that supersedes earlier user-seek evidence', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    let currentTime = 1_400
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
    })
    const pause = vi.spyOn(video, 'pause')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    manager.recordUserSeek()
    currentTime = 0
    video.dispatchEvent(new Event('emptied'))
    video.dispatchEvent(new Event('loadedmetadata'))
    appendNetflixVideoTitle()
    video.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalled()
    expect(transport).toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
    expect(video.ownerDocument).toBe(document)
  })

  it('keeps PiP open when a seek occurs after an emptied boundary', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    let currentTime = 1_400
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
    })
    const pause = vi.spyOn(video, 'pause')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('emptied'))
    manager.recordUserSeek()
    currentTime = 10
    video.dispatchEvent(new Event('seeking'))
    video.dispatchEvent(new Event('loadedmetadata'))
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalled()
    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
  })

  it('does not treat an automatic media seek as user intent during an episode transition', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    let currentTime = 1_400
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
    })
    const pause = vi.spyOn(video, 'pause')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    currentTime = 10
    video.dispatchEvent(new Event('seeking'))
    appendNetflixVideoTitle()
    video.dispatchEvent(new Event('playing'))
    video.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalled()
    expect(transport).toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
  })

  it('keeps episode-transition evidence when playing fires before the reused video time resets', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    let currentTime = 1_400
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
    })
    const pause = vi.spyOn(video, 'pause')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    video.dispatchEvent(new Event('playing'))
    currentTime = 10
    video.dispatchEvent(new Event('timeupdate'))
    video.dispatchEvent(new Event('loadedmetadata'))
    appendNetflixVideoTitle()
    video.dispatchEvent(new Event('playing'))
    await Promise.resolve()

    expect(pause).toHaveBeenCalled()
    expect(transport).toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(false)
    expect(pipWindow.close).toHaveBeenCalledOnce()
  })

  it('recovers the same video when playback continues beyond the episode boundary', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({ success: true })
    manager = new PipManager({
      onKeydown: vi.fn(),
      onKeyup: vi.fn(),
      playbackSession: createNetflixPlaybackSession(transport),
    })
    const video = document.createElement('video')
    let currentTime = 1_400
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => currentTime,
    })
    const pause = vi.spyOn(video, 'pause')
    document.body.appendChild(video)

    expect(await manager.enter()).toBe(true)

    video.dispatchEvent(new Event('ended'))
    video.dispatchEvent(new Event('playing'))
    currentTime = 1_401
    video.dispatchEvent(new Event('timeupdate'))
    await Promise.resolve()

    expect(pause).not.toHaveBeenCalled()
    expect(transport).not.toHaveBeenCalledWith('pause')
    expect(manager.isActive).toBe(true)
    expect(pipWindow.close).not.toHaveBeenCalled()
  })

  it('does not send video clicks to playback while a replacement is being handed off', async () => {
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
    video.dispatchEvent(new Event('error'))

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
