import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
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
})
