import { afterEach, expect, it, vi } from 'vitest'
import { createSubtitlePractice, requestCaptionMetadata } from './subtitle-practice'
import { createNetflixPlaybackSession } from './netflix-playback-session'
import { getHintManager } from './hints/hint-manager'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'

const metadata = { key: '123:player:en', watchId: '123', url: 'https://a.nflxvideo.net/sub.vtt', currentMs: 3500 }
afterEach(() => { getHintManager(document).destroy(); vi.restoreAllMocks() })

it('explains missing subtitle host access and allows retry after granting it', async () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/156.0')
  let granted = false
  vi.mocked(chrome.runtime.sendMessage).mockImplementation((message, callback) => {
    const response = (message as unknown as { type?: string }).type === 'FETCH_NETFLIX_CAPTION'
      ? granted ? { text: captionText } : { error: true, code: 'CAPTION_PERMISSION_REQUIRED' }
      : { success: true, result: { captionMetadata: metadata } }
    if (typeof callback === 'function') callback(response)
    return Promise.resolve(response) as never
  })
  const session = createNetflixPlaybackSession()
  const seek = vi.spyOn(session, 'seekTo').mockResolvedValue({ response: { success: true }, failureLabel: null })
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.locale = 'zh-TW'
  settings.subtitlePractice.enabled = true
  const practice = createSubtitlePractice(() => settings, session, vi.fn())
  await practice.execute('next', document)
  expect(document.getElementById('shortcut-override-text-hint-label')).toHaveTextContent('字幕來源未授權')
  expect(document.querySelector('[data-hint-loading]')).toBeNull()
  expect(seek).not.toHaveBeenCalled()
  granted = true
  await practice.execute('next', document)
  expect(seek).toHaveBeenCalledWith(6000)
})

it('gets subtitle metadata in Firefox without a page bridge', async () => {
  vi.useFakeTimers()
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/143.0')
  const send = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation((_message, callback) => {
    if ((_message as { type?: string }).type === 'FETCH_NETFLIX_CAPTION') {
      return Promise.resolve({ text: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:06.000 --> 00:00:07.000\nThree' }) as never
    }
    const reply = { success: true, result: { captionMetadata: metadata } }
    if (typeof callback === 'function') callback(reply)
    return Promise.resolve(reply) as never
  })
  const outcome = requestCaptionMetadata().then(value => ({ metadata: value }), error => ({ error: error.message }))
  try {
    await vi.advanceTimersByTimeAsync(1001)
    expect(await outcome).toEqual({ metadata })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'EXECUTE_NETFLIX_API', action: 'getCaptionMetadata' }), expect.any(Function))
    const video = document.createElement('video')
    document.body.append(video)
    try {
      const session = createNetflixPlaybackSession()
      const success = { response: { success: true }, failureLabel: null }
      const seek = vi.spyOn(session, 'seekTo').mockResolvedValue(success)
      const play = vi.spyOn(session, 'play').mockResolvedValue(success)
      const practice = createSubtitlePractice(() => ({ ...DEFAULT_SETTINGS, subtitlePractice: { ...DEFAULT_SETTINGS.subtitlePractice, enabled: true } }), session, vi.fn())
      await practice.execute('next', document)
      expect(seek).toHaveBeenLastCalledWith(6000)
      await practice.execute('previous', document)
      expect(seek).toHaveBeenLastCalledWith(1000)
      expect(play).not.toHaveBeenCalled()
      await practice.execute('replay', document)
      expect(seek).toHaveBeenLastCalledWith(3000)
      expect(play).toHaveBeenCalledWith(video)
      expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
    } finally { video.remove() }
  } finally { vi.useRealTimers() }
})

it('sends string metadata requests and ignores malformed or unrelated replies', async () => {
  const respond = (event: Event) => {
    expect(typeof (event as CustomEvent).detail).toBe('string')
    const { id } = JSON.parse((event as CustomEvent<string>).detail)
    for (const detail of ['{', 'null', JSON.stringify({ id, metadata }), JSON.stringify({ source: 'shortcut-override', id: 'other', metadata })]) {
      window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail }))
    }
    window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', {
      detail: JSON.stringify({ source: 'shortcut-override', id, metadata }),
    }))
  }
  window.addEventListener('shortcut-override:caption-request', respond)
  try { await expect(requestCaptionMetadata()).resolves.toEqual(metadata) }
  finally { window.removeEventListener('shortcut-override:caption-request', respond) }
})

it('fetches once per track, preserves navigation state, and explicitly plays only replay', async () => {
  const video = document.createElement('video')
  document.body.append(video)
  const session = createNetflixPlaybackSession()
  const success = { response: { success: true }, failureLabel: null }
  const seek = vi.spyOn(session, 'seekTo').mockResolvedValue(success)
  const play = vi.spyOn(session, 'play').mockResolvedValue(success)
  const onSeek = vi.fn()
  const showHint = vi.spyOn(getHintManager(document), 'show')
  const fetch = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => Promise.resolve({ text: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:06.000 --> 00:00:07.000\nThree' }) as never)
  const respond = (event: Event) => {
    const { id } = JSON.parse((event as CustomEvent<string>).detail)
    window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail: JSON.stringify({ source: 'shortcut-override', id, metadata }) }))
  }
  window.addEventListener('shortcut-override:caption-request', respond)
  try {
    const practice = createSubtitlePractice(() => ({ ...DEFAULT_SETTINGS, subtitlePractice: { ...DEFAULT_SETTINGS.subtitlePractice, enabled: true } }), session, onSeek)
    await practice.execute('next', document)
    expect(seek).toHaveBeenLastCalledWith(6000)
    expect(play).not.toHaveBeenCalled()
    await practice.execute('replay', document)
    expect(seek).toHaveBeenLastCalledWith(3000)
    expect(play).toHaveBeenCalledWith(video)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(onSeek).toHaveBeenCalledTimes(2)
    expect(showHint).toHaveBeenCalledExactlyOnceWith({ type: 'text', label: 'Loading subtitles…', durationMs: null, loading: true })
    expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
  } finally { window.removeEventListener('shortcut-override:caption-request', respond); video.remove() }
})

it('does not seek when disabled while a subtitle download is pending', async () => {
  const session = createNetflixPlaybackSession()
  const seek = vi.spyOn(session, 'seekTo')
  let finish!: (value: { text: string }) => void
  vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => new Promise(resolve => { finish = resolve }) as never)
  const respond = (event: Event) => window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail: JSON.stringify({ source: 'shortcut-override', id: JSON.parse((event as CustomEvent<string>).detail).id, metadata }) }))
  window.addEventListener('shortcut-override:caption-request', respond)
  try {
    const practice = createSubtitlePractice(() => ({ ...DEFAULT_SETTINGS, subtitlePractice: { ...DEFAULT_SETTINGS.subtitlePractice, enabled: true } }), session, vi.fn())
    const request = practice.execute('next', document)
    await Promise.resolve()
    practice.cancel()
    finish({ text: 'WEBVTT\n\n00:00:06.000 --> 00:00:07.000\nThree' })
    await request
    expect(seek).not.toHaveBeenCalled()
  } finally { window.removeEventListener('shortcut-override:caption-request', respond) }
})

it('ends a stalled subtitle delivery with an actionable timeout and allows retry', async () => {
  vi.useFakeTimers()
  const session = createNetflixPlaybackSession()
  const seek = vi.spyOn(session, 'seekTo')
  const deliver = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => new Promise(() => {}) as never)
  const respond = (event: Event) => window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail: JSON.stringify({ source: 'shortcut-override', id: JSON.parse((event as CustomEvent<string>).detail).id, metadata }) }))
  window.addEventListener('shortcut-override:caption-request', respond)
  try {
    const practice = createSubtitlePractice(() => ({ ...DEFAULT_SETTINGS, subtitlePractice: { ...DEFAULT_SETTINGS.subtitlePractice, enabled: true } }), session, vi.fn())
    void practice.execute('next', document)
    await vi.advanceTimersByTimeAsync(12500)
    expect(document.getElementById('shortcut-override-text-hint-label')).toHaveTextContent('Subtitle download timed out')
    expect(document.getElementById('shortcut-override-text-hint')?.querySelector('svg')).toBeNull()
    expect(document.querySelector('[data-hint-loading]')).toBeNull()
    expect(seek).not.toHaveBeenCalled()
    void practice.execute('next', document)
    await Promise.resolve()
    expect(deliver).toHaveBeenCalledTimes(2)
    practice.cancel()
    await vi.advanceTimersByTimeAsync(12500)
  } finally { window.removeEventListener('shortcut-override:caption-request', respond); vi.useRealTimers() }
})

const captionText = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:06.000 --> 00:00:07.000\nTwo'

function pendingPractice(currentMs = metadata.currentMs) {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.subtitlePractice.enabled = true
  const video = document.createElement('video')
  document.body.append(video)
  const session = createNetflixPlaybackSession()
  const success = { response: { success: true }, failureLabel: null }
  const seek = vi.spyOn(session, 'seekTo').mockResolvedValue(success)
  const play = vi.spyOn(session, 'play').mockImplementation(async () => {
    video.dispatchEvent(new Event('play'))
    return success
  })
  let finish!: (value: { text: string }) => void
  const fetch = vi.spyOn(chrome.runtime, 'sendMessage').mockImplementation(() => new Promise(resolve => { finish = resolve }) as never)
  const respond = (event: Event) => window.dispatchEvent(new CustomEvent('shortcut-override:caption-response', { detail: JSON.stringify({ source: 'shortcut-override', id: JSON.parse((event as CustomEvent<string>).detail).id, metadata: { ...metadata, currentMs } }) }))
  window.addEventListener('shortcut-override:caption-request', respond)
  const practice = createSubtitlePractice(() => settings, session, vi.fn())
  return { settings, video, seek, play, fetch, practice,
    deliver: () => finish({ text: captionText }),
    cleanup: () => { practice.cancel(); window.removeEventListener('shortcut-override:caption-request', respond); video.remove() },
  }
}

it.each(['pause', 'play'])('cancels pending replay on a native video %s event and allows retry', async event => {
  const fixture = pendingPractice()
  try {
    const request = fixture.practice.execute('replay', document)
    await Promise.resolve()
    fixture.video.dispatchEvent(new Event(event))
    fixture.deliver()
    await request
    expect(fixture.seek).not.toHaveBeenCalled()
    expect(fixture.play).not.toHaveBeenCalled()
    expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
    const retry = fixture.practice.execute('replay', document)
    await Promise.resolve()
    fixture.deliver()
    await retry
    expect(fixture.seek).toHaveBeenCalledWith(3000)
    expect(fixture.play).toHaveBeenCalledOnce()
    expect(document.querySelector('[id^="shortcut-override-"][id$="hint"]')).toBeNull()
    await fixture.practice.execute('next', document)
    expect(fixture.fetch).toHaveBeenCalledTimes(2)
    expect(fixture.seek).toHaveBeenLastCalledWith(6000)
  } finally { fixture.cleanup() }
})

it.each(['pause', 'play'])('cancels pending replay on a replacement video %s event and allows retry', async event => {
  const fixture = pendingPractice()
  const replacement = document.createElement('video')
  fixture.play.mockImplementation(async video => {
    video.dispatchEvent(new Event('play'))
    return { response: { success: true }, failureLabel: null }
  })
  try {
    const request = fixture.practice.execute('replay', document)
    await Promise.resolve()
    fixture.video.replaceWith(replacement)
    replacement.dispatchEvent(new Event(event))
    fixture.deliver()
    await request
    expect(fixture.seek).not.toHaveBeenCalled()
    expect(fixture.play).not.toHaveBeenCalled()
    expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
    const retry = fixture.practice.execute('replay', document)
    await Promise.resolve()
    fixture.deliver()
    await retry
    expect(fixture.seek).toHaveBeenCalledWith(3000)
    expect(fixture.play).toHaveBeenCalledExactlyOnceWith(replacement)
    // Playback changes after completion preserve cached timings.
    replacement.dispatchEvent(new Event('pause'))
    await fixture.practice.execute('next', document)
    expect(fixture.fetch).toHaveBeenCalledTimes(2)
    expect(fixture.seek).toHaveBeenLastCalledWith(6000)
  } finally { replacement.remove(); fixture.cleanup() }
})

it('does not cancel pending replay for a pause event from an unrelated video', async () => {
  const fixture = pendingPractice()
  const unrelated = document.createElement('video')
  document.body.append(unrelated)
  try {
    const request = fixture.practice.execute('replay', document)
    await Promise.resolve()
    unrelated.dispatchEvent(new Event('pause'))
    fixture.deliver()
    await request
    expect(fixture.seek).toHaveBeenCalledWith(3000)
    expect(fixture.play).toHaveBeenCalledExactlyOnceWith(fixture.video)
  } finally { unrelated.remove(); fixture.cleanup() }
})

it('does not resume playback if the target window exits while a seek is pending', async () => {
  const fixture = pendingPractice()
  let finishSeek!: () => void
  fixture.seek.mockImplementation(() => new Promise(resolve => {
    finishSeek = () => resolve({ response: { success: true }, failureLabel: null })
  }))
  try {
    const request = fixture.practice.execute('replay', document)
    await Promise.resolve()
    fixture.deliver()
    await vi.waitFor(() => expect(finishSeek).toBeTypeOf('function'))
    window.dispatchEvent(new Event('pagehide'))
    finishSeek()
    await request
    expect(fixture.play).not.toHaveBeenCalled()
    expect(document.querySelector('[data-hint-loading]')).toBeNull()
  } finally { fixture.cleanup() }
})

it.each(['previous', 'next', 'replay'] as const)('does not execute pending %s when its row is disabled', async action => {
  const fixture = pendingPractice()
  try {
    const request = fixture.practice.execute(action, document)
    await Promise.resolve()
    fixture.settings.subtitlePractice.bindings[action].enabled = false
    fixture.deliver()
    await request
    expect(fixture.seek).not.toHaveBeenCalled()
    expect(fixture.play).not.toHaveBeenCalled()
  } finally { fixture.cleanup() }
})

it('keeps a pending subtitle action when a different row is disabled', async () => {
  const fixture = pendingPractice()
  try {
    const request = fixture.practice.execute('next', document)
    await Promise.resolve()
    fixture.settings.subtitlePractice.bindings.replay.enabled = false
    fixture.practice.updateSettings(fixture.settings)
    fixture.deliver()
    await request
    expect(fixture.seek).toHaveBeenCalledWith(6000)
    expect(fixture.play).not.toHaveBeenCalled()
  } finally { fixture.cleanup() }
})

it('shows a loading hint during delivery and no hint at the subtitle boundary', async () => {
  const fixture = pendingPractice(500)
  const showHint = vi.spyOn(getHintManager(document), 'show')
  try {
    const request = fixture.practice.execute('previous', document)
    await Promise.resolve()
    expect(document.getElementById('shortcut-override-text-hint-label')).toHaveTextContent('Loading subtitles…')
    fixture.deliver()
    await request
    expect(fixture.seek).not.toHaveBeenCalled()
    expect(showHint).toHaveBeenCalledExactlyOnceWith({ type: 'text', label: 'Loading subtitles…', durationMs: null, loading: true })
    expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
  } finally { fixture.cleanup() }
})

it('keeps loading feedback visible beyond two seconds until delivery finishes', async () => {
  vi.useFakeTimers()
  const fixture = pendingPractice()
  try {
    const request = fixture.practice.execute('next', document)
    await vi.advanceTimersByTimeAsync(8000)
    const label = document.getElementById('shortcut-override-text-hint-label')
    expect(label).toHaveTextContent('Loading subtitles…')
    expect(label?.style.opacity).toBe('1')
    expect(label?.querySelector('[data-hint-loading]')).toBeInTheDocument()
    fixture.deliver()
    await request
    expect(document.getElementById('shortcut-override-text-hint')).toBeNull()
    expect(fixture.seek).toHaveBeenCalledWith(6000)
  } finally { fixture.cleanup(); vi.useRealTimers() }
})
