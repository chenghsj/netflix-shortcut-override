import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import type { NetflixApiResponse } from '@/shared/netflix-api'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { AdoptedVideoBinding } from './adopted-video-binding'
import { SubtitleMirror } from './pip-subtitle-mirror'

describe('AdoptedVideoBinding', () => {
  let iframe: HTMLIFrameElement
  let pipWindow: Window
  let binding: AdoptedVideoBinding

  beforeEach(() => {
    document.body.innerHTML = ''
    iframe = document.createElement('iframe')
    document.body.appendChild(iframe)
    if (!iframe.contentWindow) throw new Error('Expected PiP window')
    pipWindow = iframe.contentWindow
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: true })),
      settings: DEFAULT_SETTINGS,
      onUserSeek: vi.fn(),
    })
  })

  afterEach(() => {
    binding.destroy()
    iframe.remove()
  })

  it('adopts a video with its controls and subtitle mirror', () => {
    const video = document.createElement('video')
    document.body.appendChild(video)

    const area = binding.adopt(video)

    expect(binding.currentVideo).toBe(video)
    expect(area.parentElement).toBeNull()
    expect(video.parentElement).toBe(area)
    expect(area.querySelector('[data-shortcut-override-pip-controls]')).not.toBeNull()
    expect(area.querySelector('#shortcut-override-pip-subtitle')).not.toBeNull()
  })

  it('replaces a recoverable video without leaving stale bindings', () => {
    const initialVideo = document.createElement('video')
    const replacementVideo = document.createElement('video')
    document.body.append(initialVideo, replacementVideo)
    const area = binding.adopt(initialVideo)

    expect(binding.replace(replacementVideo)).toBe(true)

    expect(binding.currentVideo).toBe(replacementVideo)
    expect(initialVideo.parentElement).toBe(document.body)
    expect(replacementVideo.parentElement).toBe(area)
    expect(area.ownerDocument).toBe(pipWindow.document)
    expect(area.querySelectorAll('[data-shortcut-override-pip-controls]')).toHaveLength(1)
    expect(area.querySelectorAll('#shortcut-override-pip-subtitle')).toHaveLength(1)
  })

  it('updates controls and restores the adopted video through idempotent cleanup', () => {
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const setSubtitleSettings = vi.spyOn(SubtitleMirror.prototype, 'setSettings')

    binding.updateSettings({
      ...DEFAULT_SETTINGS,
      locale: 'zh-TW',
      seek: { seconds: 25 },
      pip: {
        subtitlesEnabled: false,
        subtitleSize: 'large',
        subtitleBackground: 'dark',
      },
    })

    expect(
      area.querySelector<HTMLButtonElement>('[data-pip-control="seek-backward"]')
    ).toHaveAccessibleName('倒轉 25 秒')
    expect(setSubtitleSettings).toHaveBeenCalledWith({
      subtitlesEnabled: false,
      subtitleSize: 'large',
      subtitleBackground: 'dark',
    })

    binding.destroy()
    binding.destroy()

    expect(video.parentElement).toBe(document.body)
    expect(area.querySelector('[data-shortcut-override-pip-controls]')).toBeNull()
    expect(area.querySelector('#shortcut-override-pip-subtitle')).toBeNull()
  })

  it('restores the confirmed subtitle switch state when Netflix rejects the toggle', async () => {
    binding.destroy()
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        error: 'Netflix subtitle track API is unavailable.',
      },
    })
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(transport),
      settings: DEFAULT_SETTINGS,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    toggle?.click()
    await vi.waitFor(() => expect(transport).toHaveBeenCalledWith('toggleSubtitles'))

    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('keeps the stored subtitle fallback when Netflix state is unavailable', async () => {
    binding.destroy()
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'getSubtitleState',
        playerApiFound: false,
        playerFound: false,
        seekCalled: false,
        sessionIds: [],
      },
    })
    const onSettingsChange = vi.fn()
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(transport),
      settings: DEFAULT_SETTINGS,
      onSettingsChange,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    await vi.waitFor(() => expect(transport).toHaveBeenCalledWith('getSubtitleState'))

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(onSettingsChange).not.toHaveBeenCalled()
  })

  it('serializes rapid subtitle switch clicks', async () => {
    binding.destroy()
    const resolvers: Array<(response: NetflixApiResponse) => void> = []
    const transport = vi.fn((action: string) =>
      action === 'getSubtitleState'
        ? Promise.resolve({
            success: true,
            result: {
              action: 'getSubtitleState' as const,
              playerApiFound: true,
              playerFound: true,
              seekCalled: false,
              sessionIds: ['session-id'],
              subtitlesEnabled: true,
            },
          })
        : new Promise<NetflixApiResponse>(resolve => resolvers.push(resolve))
    )
    const onSettingsChange = vi.fn()
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(transport),
      settings: DEFAULT_SETTINGS,
      onSettingsChange,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    toggle?.click()
    toggle?.click()
    await vi.waitFor(() => {
      expect(transport.mock.calls.filter(([action]) => action === 'toggleSubtitles')).toHaveLength(1)
    })

    resolvers[0]?.({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitleToggleCalled: true,
        subtitlesEnabled: false,
      },
    })
    await vi.waitFor(() => {
      expect(transport.mock.calls.filter(([action]) => action === 'toggleSubtitles')).toHaveLength(2)
    })

    resolvers[1]?.({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitleToggleCalled: true,
        subtitlesEnabled: true,
      },
    })
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pip: expect.objectContaining({ subtitlesEnabled: true }),
      })
    )
  })

  it('shares subtitle serialization with callers outside the PiP controls', async () => {
    binding.destroy()
    const resolvers: Array<(response: NetflixApiResponse) => void> = []
    const transport = vi.fn((action: string) =>
      action === 'getSubtitleState'
        ? Promise.resolve({
            success: true,
            result: {
              action: 'getSubtitleState' as const,
              playerApiFound: true,
              playerFound: true,
              seekCalled: false,
              sessionIds: ['session-id'],
              subtitlesEnabled: true,
            },
          })
        : new Promise<NetflixApiResponse>(resolve => resolvers.push(resolve))
    )
    const playbackSession = createNetflixPlaybackSession(transport)
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession,
      settings: DEFAULT_SETTINGS,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    const externalToggle = playbackSession.toggleSubtitles()
    toggle?.click()
    expect(transport.mock.calls.filter(([action]) => action === 'toggleSubtitles')).toHaveLength(1)

    resolvers[0]?.({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitleToggleCalled: true,
        subtitlesEnabled: false,
      },
    })
    await externalToggle
    await vi.waitFor(() => {
      expect(transport.mock.calls.filter(([action]) => action === 'toggleSubtitles')).toHaveLength(2)
    })

    resolvers[1]?.({
      success: true,
      result: {
        action: 'toggleSubtitles',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitleToggleCalled: true,
        subtitlesEnabled: true,
      },
    })
    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
  })

  it('ignores a stale initial subtitle read after a newer toggle result', async () => {
    binding.destroy()
    let resolveInitialRead: (response: NetflixApiResponse) => void = () => undefined
    const transport = vi.fn((action: string) => {
      if (action === 'getSubtitleState') {
        return new Promise<NetflixApiResponse>(resolve => {
          resolveInitialRead = resolve
        })
      }
      return Promise.resolve({
        success: true,
        result: {
          action: 'toggleSubtitles' as const,
          playerApiFound: true,
          playerFound: true,
          seekCalled: false,
          sessionIds: ['session-id'],
          subtitleToggleCalled: true,
          subtitlesEnabled: true,
        },
      })
    })
    const onSettingsChange = vi.fn()
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(transport),
      settings: DEFAULT_SETTINGS,
      onSettingsChange,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    toggle?.click()
    await vi.waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pip: expect.objectContaining({ subtitlesEnabled: true }),
        })
      )
    })

    resolveInitialRead({
      success: true,
      result: {
        action: 'getSubtitleState',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitlesEnabled: false,
      },
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pip: expect.objectContaining({ subtitlesEnabled: true }),
      })
    )
  })

  it('applies the initial Netflix subtitle state after an unrelated settings update', async () => {
    binding.destroy()
    let resolveInitialRead: (response: NetflixApiResponse) => void = () => undefined
    const transport = vi.fn(
      () =>
        new Promise<NetflixApiResponse>(resolve => {
          resolveInitialRead = resolve
        })
    )
    const onSettingsChange = vi.fn()
    binding = new AdoptedVideoBinding({
      sourceDocument: document,
      pipWindow,
      playbackSession: createNetflixPlaybackSession(transport),
      settings: DEFAULT_SETTINGS,
      onSettingsChange,
      onUserSeek: vi.fn(),
    })
    const video = document.createElement('video')
    document.body.appendChild(video)
    const area = binding.adopt(video)
    const toggle = area.querySelector<HTMLButtonElement>(
      '[data-pip-control="subtitle-switch"]'
    )

    binding.updateSettings({
      ...DEFAULT_SETTINGS,
      pip: { ...DEFAULT_SETTINGS.pip, subtitleSize: 'large' },
    })
    resolveInitialRead({
      success: true,
      result: {
        action: 'getSubtitleState',
        playerApiFound: true,
        playerFound: true,
        seekCalled: false,
        sessionIds: ['session-id'],
        subtitlesEnabled: false,
      },
    })

    await vi.waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'))
    expect(onSettingsChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pip: expect.objectContaining({
          subtitlesEnabled: false,
          subtitleSize: 'large',
        }),
      })
    )
  })
})
