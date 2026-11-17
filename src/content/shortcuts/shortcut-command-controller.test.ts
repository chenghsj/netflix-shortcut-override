import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHintManager } from '@/content/hints/hint-manager'
import { createNetflixPlaybackSession } from '@/content/netflix-playback-session'
import type { NetflixApiResponse } from '@/shared/netflix-api'
import { createShortcutCommandController } from './shortcut-command-controller'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { PipControls } from '@/content/pip/pip-controls'

const subtitleTrackResponse: NetflixApiResponse = {
  success: true,
  result: {
    action: 'cycleSubtitleTrack', playerApiFound: true, playerFound: true,
    seekCalled: false, sessionIds: ['session-id'], subtitlesEnabled: true,
  },
}

describe('ShortcutCommandController', () => {
  it('applies each custom preferred speed and keeps it after a held speed ends', () => {
    vi.useFakeTimers()
    document.body.innerHTML = '<video></video>'
    const video = document.querySelector('video')!
    Object.defineProperty(video, 'paused', { configurable: true, get: () => false })
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:slow', speed: 0.75 }, { id: 'preferred-speed:fast', speed: 3.35 }]
    for (const shortcut of settings.preferredSpeedShortcuts) settings.bindings[shortcut.id] = { enabled: true, key: null }
    const controller = createShortcutCommandController(() => settings)
    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(1000)
    expect(video.playbackRate).toBe(settings.holdSpeed.speed)
    expect(controller.execute('preferred-speed:slow', document)).toBe(true)
    controller.completeHoldSpeedInteraction('Space')
    expect(video.playbackRate).toBe(0.75)
    expect(controller.execute('preferred-speed:fast', document)).toBe(true)
    expect(video.playbackRate).toBe(3.35)
    settings.bindings['preferred-speed:fast'].enabled = false
    expect(controller.execute('preferred-speed:fast', document)).toBe(false)
    expect(controller.execute('preferred-speed:missing', document)).toBe(false)
  })
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    getHintManager(document).destroy()
    vi.useRealTimers()
  })

  it('shows frame feedback and keeps the audio track label including audio description', async () => {
    document.body.innerHTML = '<video></video>'
    const transport = vi.fn().mockResolvedValueOnce({ success: true, result: { seekCalled: true } })
      .mockResolvedValueOnce({ success: true, result: { audioTrackSwitchCalled: true, audioTrack: 'English (Audio Description)' } })
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, createNetflixPlaybackSession(transport))
    controller.execute('nextFrame', document)
    await vi.waitFor(() => expect(document.querySelector('[data-hint-icon="frame-forward"]')).toBeInTheDocument())
    expect(document.body).not.toHaveTextContent('Next frame')
    controller.execute('nextAudioTrack', document)
    await vi.waitFor(() => expect(document.body).toHaveTextContent('English (Audio Description)'))
    expect(transport).toHaveBeenCalledWith('cycleAudioTrack', 1)
  })

  it.each([
    { locale: 'en', expected: 'Japanese' },
    { locale: 'zh-TW', expected: '日語' },
    { locale: 'zh-CN', expected: '日语' },
    { locale: 'ja', expected: '日本語' },
    { locale: 'ko', expected: '일본어' },
  ] as const)('localizes original audio to $expected for the $locale hint without the original marker', async ({ locale, expected }) => {
    document.body.innerHTML = '<video></video>'
    const settings = { ...DEFAULT_SETTINGS, locale }
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: { audioTrackSwitchCalled: true, audioTrack: '日語 [原始]', audioTrackLanguage: 'ja' },
    })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute('nextAudioTrack', document)
    await vi.waitFor(() => expect(document.getElementById('shortcut-override-media-hint')?.textContent).toBe(expected))
  })

  it.each([
    { locale: 'en', expected: 'English (Audio Description)' },
    { locale: 'zh-TW', expected: '英文 (口述影像)' },
    { locale: 'zh-CN', expected: '英语 (口述影像)' },
    { locale: 'ja', expected: '英語 (音声ガイド)' },
    { locale: 'ko', expected: '영어 (화면 해설)' },
  ] as const)('localizes the audio-description distinction for the $locale hint', async ({ locale, expected }) => {
    document.body.innerHTML = '<video></video>'
    const settings = { ...DEFAULT_SETTINGS, locale }
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        audioTrackSwitchCalled: true, audioTrack: 'English (Audio Description)',
        audioTrackLanguage: 'en', audioTrackIsAudioDescription: true,
      },
    })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute('previousAudioTrack', document)
    await vi.waitFor(() => expect(document.getElementById('shortcut-override-media-hint')?.textContent).toBe(expected))
  })

  it.each([
    { name: '日語 [原始]', language: undefined, expected: '日語' },
    { name: 'English (Original)', language: 'invalid language tag', expected: 'English' },
    { name: '日本語（オリジナル）', language: 'unknown', expected: '日本語' },
    { name: 'English (Audio Description)', language: undefined, expected: 'English (Audio Description)' },
  ])('keeps a usable Netflix label without the original marker when language is $language', async ({ name, language, expected }) => {
    document.body.innerHTML = '<video></video>'
    const settings = { ...DEFAULT_SETTINGS, locale: 'zh-TW' as const }
    const transport = vi.fn().mockResolvedValue({
      success: true, result: { audioTrackSwitchCalled: true, audioTrack: name, audioTrackLanguage: language },
    })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute('nextAudioTrack', document)
    await vi.waitFor(() => expect(document.getElementById('shortcut-override-media-hint')?.textContent).toBe(expected))
  })

  it('sends favorite audio preferences and localizes the unavailable hint', async () => {
    document.body.innerHTML = '<video></video>'
    const settings = { ...DEFAULT_SETTINGS, locale: 'zh-TW' as const,
      audioFavorites: [{ language: 'ja', audioDescription: false }] }
    const transport = vi.fn().mockResolvedValue({ success: true, result: { audioCycleOutcome: 'no-tracks-available' } })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute('nextAudioTrack', document)
    await vi.waitFor(() => expect(document.body).toHaveTextContent('影片未提供清單中的常用音軌'))
    expect(transport).toHaveBeenCalledWith('cycleAudioTrack', 1, undefined, settings.audioFavorites)
  })

  it.each([
    ['nextAudioTrack', 'audioFavorites', 'cycleAudioTrack', 1],
    ['cycleSubtitleTrack', 'subtitleFavorites', 'cycleSubtitleTrack', undefined],
  ] as const)('ignores disabled favorite filtering for %s and restores it when enabled', async (action, feature, apiAction, value) => {
    document.body.innerHTML = '<video></video>'
    const settings: ShortcutSettings = { ...structuredClone(DEFAULT_SETTINGS), locale: 'en',
      audioFavorites: [{ language: 'ja', audioDescription: false }], subtitleFavorites: [{ language: 'ja' }], hiddenFeatures: [feature] }
    const transport = vi.fn().mockResolvedValue({ success: true, result: {} })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    expect(controller.execute(action, document)).toBe(true)
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1))
    expect(transport.mock.calls[0]).toEqual(value === undefined ? [apiAction] : [apiAction, value])
    settings.hiddenFeatures = []
    expect(controller.execute(action, document)).toBe(true)
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2))
    expect(transport.mock.calls[1]).toEqual(feature === 'audioFavorites'
      ? [apiAction, value, undefined, settings.audioFavorites] : [apiAction, value, settings.subtitleFavorites])
    expect(settings[feature]).toHaveLength(1)
  })

  it('uses the ordinary no-audio-tracks hint while favorite filtering is disabled', async () => {
    document.body.innerHTML = '<video></video>'
    const settings: ShortcutSettings = { ...structuredClone(DEFAULT_SETTINGS), locale: 'en', audioFavorites: [{ language: 'ja', audioDescription: false }], hiddenFeatures: ['audioFavorites'] }
    const transport = vi.fn().mockResolvedValue({ success: true, result: { audioCycleOutcome: 'no-tracks-available' } })
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute('nextAudioTrack', document)
    await vi.waitFor(() => expect(document.body).toHaveTextContent('No audio tracks available'))
    expect(document.body).not.toHaveTextContent('No favorite audio tracks available')
  })

  it('seeks custom seconds and percentages through Netflix without assigning native currentTime', () => {
    const transport = vi.fn().mockResolvedValue({ success: true, result: { seekCalled: true } })
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:back', kind: 'relative', value: 15 }, { id: 'seek:percent', kind: 'percentage', value: 37 }]
    settings.bindings['seek:back-backward'] = { ...settings.bindings.seekBackward }
    settings.bindings['seek:back-forward'] = { ...settings.bindings.seekForward }
    settings.bindings['seek:percent'] = { ...settings.bindings.seekForward }
    const video = document.createElement('video')
    const nativeSeek = vi.fn()
    Object.defineProperty(video, 'duration', { configurable: true, value: 200 })
    Object.defineProperty(video, 'currentTime', { get: () => 12, set: nativeSeek })
    document.body.append(video)
    const onSeekRequested = vi.fn()
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport), { onSeekRequested })
    expect(controller.execute('seek:back-backward', document)).toBe(true)
    expect(transport).toHaveBeenLastCalledWith('seek', -15000)
    expect(controller.execute('seek:back-forward', document)).toBe(true)
    expect(transport).toHaveBeenLastCalledWith('seek', 15000)
    expect(controller.execute('seek:percent', document)).toBe(true)
    expect(transport).toHaveBeenLastCalledWith('seekTo', 74000)
    expect(onSeekRequested).toHaveBeenCalledTimes(3)
    expect(nativeSeek).not.toHaveBeenCalled()
    expect(controller.execute('seek:deleted', document)).toBe(false)
    settings.bindings['seek:percent'].enabled = false
    expect(controller.execute('seek:percent', document)).toBe(false)
  })

  it.each([NaN, Infinity, 0])('does not submit a percentage seek when duration is %s', duration => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:percent', kind: 'percentage', value: 50 }]
    settings.bindings['seek:percent'] = { ...settings.bindings.seekForward }
    const video = document.createElement('video')
    Object.defineProperty(video, 'duration', { value: duration })
    document.body.append(video)
    const transport = vi.fn()
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    expect(controller.execute('seek:percent', document)).toBe(false)
    expect(transport).not.toHaveBeenCalled()
  })

  it('routes keyboard, hold-speed, and PiP commands through one playback session', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({
      success: true,
      result: {
        action: 'seek',
        playerApiFound: true,
        playerFound: true,
        seekCalled: true,
        sessionIds: ['session-id'],
      },
    })
    const playbackSession = createNetflixPlaybackSession(transport)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession)
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { configurable: true, value: false })
    video.playbackRate = 1
    document.body.append(video)

    controller.execute('seekForward', document)
    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)
    controller.completeHoldSpeedInteraction('Space')

    const videoArea = document.createElement('div')
    document.body.append(videoArea)
    Object.defineProperty(video, 'currentTime', { configurable: true, value: 12 })
    Object.defineProperty(video, 'duration', { configurable: true, value: 240 })
    const pipControls = new PipControls({
      pipWindow: window,
      video,
      videoArea,
      seekTo: milliseconds => playbackSession.seekTo(milliseconds),
    })
    pipControls.start()
    const timeline = videoArea.querySelector<HTMLInputElement>('[data-pip-control="timeline"]')
    if (!timeline) throw new Error('Expected PiP timeline')
    timeline.value = '90'
    timeline.dispatchEvent(new Event('input', { bubbles: true }))
    timeline.dispatchEvent(new Event('change', { bubbles: true }))
    await Promise.resolve()
    await Promise.resolve()

    expect(transport).toHaveBeenNthCalledWith(1, 'seek', 10_000)
    expect(transport).toHaveBeenNthCalledWith(2, 'setPlaybackRate', 2)
    expect(transport).toHaveBeenNthCalledWith(3, 'setPlaybackRate', 1)
    expect(transport).toHaveBeenNthCalledWith(4, 'seekTo', 90_000)
    pipControls.destroy()
  })

  it('ignores a late seek failure after a newer action', async () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('seekBackward', document)
    const seekRequest = vi.mocked(chrome.runtime.sendMessage).mock.calls[0]
    controller.execute('speedUp', document)

    const respondToSeek = seekRequest?.[1]
    if (typeof respondToSeek !== 'function') throw new Error('Expected seek response callback')
    respondToSeek({ success: false, error: 'stale seek' })
    await Promise.resolve()

    expect(document.getElementById('shortcut-override-speed-hint')?.textContent).toContain('1.25x')
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()
  })

  it('uses opposite directional icons for speed up and speed down', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('speedUp', document)
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toHaveAttribute(
      'stroke-linejoin',
      'round'
    )

    controller.execute('speedDown', document)
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toHaveAttribute(
      'stroke-linejoin',
      'round'
    )
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeNull()
  })

  it('uses the playback icon when resetting speed', () => {
    const video = document.createElement('video')
    video.playbackRate = 1.5
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('speedReset', document)

    expect(document.querySelector('[data-hint-icon="playback-play"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="playback-play"] path')).toHaveAttribute(
      'transform',
      'translate(1.25 0)'
    )
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeNull()
    expect(document.querySelector('[data-hint-icon="speed-down"]')).toBeNull()
  })

  it('sets the configured preferred speed without toggling', () => {
    const video = document.createElement('video')
    video.playbackRate = 0.75
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('setPreferredSpeed', document)).toBe(true)
    expect(video.playbackRate).toBe(1.5)
    expect(document.getElementById('shortcut-override-speed-hint')).toHaveTextContent('1.5x')
    expect(document.querySelector('[data-hint-icon="speed-up"]')).toBeInTheDocument()

    expect(controller.execute('setPreferredSpeed', document)).toBe(true)
    expect(video.playbackRate).toBe(1.5)
  })

  it('toggles Netflix subtitles and shows the shared icon in the standard circular hint', async () => {
    const transport = vi.fn().mockResolvedValue({
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
    const playbackSession = createNetflixPlaybackSession(transport)
    const onSubtitlesToggled = vi.fn()
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession, {
      onSubtitlesToggled,
    })

    expect(controller.execute('toggleSubtitles', document)).toBe(true)
    await vi.waitFor(() => {
      expect(document.getElementById('shortcut-override-playback-hint')).toBeInTheDocument()
    })

    expect(transport).toHaveBeenCalledWith('toggleSubtitles')
    expect(onSubtitlesToggled).toHaveBeenCalledWith(false, document)
    const hint = document.getElementById('shortcut-override-playback-hint')
    const icon = hint?.querySelector('[data-hint-icon="subtitles"]')
    expect(hint).toHaveTextContent('')
    expect(hint).toHaveStyle({
      width: '92px',
      height: '92px',
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.68)',
      color: 'rgba(255, 255, 255, 0.62)',
    })
    expect(icon).toHaveAttribute('data-pip-icon', 'subtitles')
    expect(icon).toHaveAttribute('width', '56')
    expect(icon).toHaveAttribute('height', '56')
    expect(icon).toHaveAttribute('stroke', 'currentColor')
    expect(icon?.querySelector('[data-pip-icon-part="subtitle-lines"]')).toHaveAttribute(
      'd',
      'M6 11.5h7.5M16 11.5h4M6 16.5h3.5M12.5 16.5H20'
    )
  })

  it('serializes rapid subtitle shortcut commands', async () => {
    const resolvers: Array<(response: NetflixApiResponse) => void> = []
    const transport = vi.fn(
      () => new Promise<NetflixApiResponse>(resolve => resolvers.push(resolve))
    )
    const playbackSession = createNetflixPlaybackSession(transport)
    const onSubtitlesToggled = vi.fn()
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, playbackSession, {
      onSubtitlesToggled,
    })

    controller.execute('toggleSubtitles', document)
    controller.execute('toggleSubtitles', document)
    expect(transport).toHaveBeenCalledTimes(1)

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
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2))

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
    await vi.waitFor(() => {
      expect(onSubtitlesToggled).toHaveBeenCalledWith(true, document)
    })
  })

  it.each(['cycleSubtitleTrack', 'previousSubtitleTrack'] as const)('keeps rapid %s requests in order', async action => {
    document.body.innerHTML = '<video></video>'
    let finishFirst!: (response: NetflixApiResponse) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<NetflixApiResponse>(resolve => { finishFirst = resolve }))
      .mockResolvedValue(subtitleTrackResponse)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, createNetflixPlaybackSession(transport))
    controller.execute(action, document)
    controller.execute(action, document)
    expect(transport).toHaveBeenCalledTimes(1)
    finishFirst(subtitleTrackResponse)
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(2))
    expect(transport.mock.calls).toEqual(action === 'previousSubtitleTrack'
      ? [['cycleSubtitleTrack', -1], ['cycleSubtitleTrack', -1]]
      : [['cycleSubtitleTrack'], ['cycleSubtitleTrack']])
  })

  it.each(['previousAudioTrack', 'nextAudioTrack'] as const)('drops queued %s requests when their PiP window closes', async action => {
    document.body.innerHTML = '<video></video><iframe></iframe>'
    const pipWindow = document.querySelector('iframe')!.contentWindow!
    let closed = false
    Object.defineProperty(pipWindow, 'closed', { configurable: true, get: () => closed })
    const response: NetflixApiResponse = {
      success: true,
      result: {
        action: 'cycleAudioTrack', playerApiFound: true, playerFound: true,
        seekCalled: false, sessionIds: ['session-id'], audioTrackSwitchCalled: true, audioTrack: 'English',
      },
    }
    let finishFirst!: (response: NetflixApiResponse) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<NetflixApiResponse>(resolve => { finishFirst = resolve }))
      .mockResolvedValue(response)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS, createNetflixPlaybackSession(transport))
    controller.execute(action, pipWindow.document)
    controller.execute(action, pipWindow.document)
    expect(transport).toHaveBeenCalledTimes(1)

    closed = true
    finishFirst(response)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it.each(
    ['global disable', 'row disable', 'watch change', 'video replacement', 'cancel and re-enable'].flatMap(reason =>
      (['cycleSubtitleTrack', 'previousSubtitleTrack'] as const).map(action => ({ reason, action }))),
  )('drops queued $action requests after $reason', async ({ action, reason }) => {
    document.body.innerHTML = '<video></video>'
    window.history.replaceState(null, '', '/watch/123')
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    let finishFirst!: (response: NetflixApiResponse) => void
    const transport = vi.fn().mockImplementationOnce(() => new Promise<NetflixApiResponse>(resolve => { finishFirst = resolve }))
      .mockResolvedValue(subtitleTrackResponse)
    const controller = createShortcutCommandController(() => settings, createNetflixPlaybackSession(transport))
    controller.execute(action, document)
    controller.execute(action, document)
    expect(transport).toHaveBeenCalledTimes(1)

    if (reason === 'global disable') settings.enabled = false
    if (reason === 'row disable') settings.bindings[action].enabled = false
    if (reason === 'watch change') window.history.replaceState(null, '', '/watch/456')
    if (reason === 'video replacement') document.querySelector('video')!.replaceWith(document.createElement('video'))
    if (reason === 'cancel and re-enable') {
      settings.enabled = false
      controller.cancelPendingAction()
      settings.enabled = true
    }
    finishFirst(subtitleTrackResponse)
    // Drain both the transport completion and the queued command continuation.
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(transport, reason).toHaveBeenCalledTimes(1)
    window.history.replaceState(null, '', '/')
  })

  it('restores the playback rate and hides the hold hint on completion', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: true }))
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    expect(controller.shouldInterceptHoldSpeedRepeat('Space')).toBe(true)
    await vi.advanceTimersByTimeAsync(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).not.toBeNull()

    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)

    expect(video.playbackRate).toBe(1)
    expect(controller.shouldInterceptHoldSpeedRepeat('Space')).toBe(false)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
  })

  it('shows the hold hint while Netflix confirmation is still pending', () => {
    vi.useFakeTimers()
    const transport = vi.fn(() => new Promise<NetflixApiResponse>(() => undefined))
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(transport)
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toHaveTextContent('2x')

    controller.completeHoldSpeedInteraction('Space')
  })

  it('does not show the hold-speed rate hint when it is disabled', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const settings = {
      ...DEFAULT_SETTINGS,
      holdSpeed: { ...DEFAULT_SETTINGS.holdSpeed, showHint: false },
    }
    const controller = createShortcutCommandController(() => settings)

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()

    controller.completeHoldSpeedInteraction('Space')
  })

  it('does not present hold speed as active when Netflix rejects the rate change', async () => {
    vi.useFakeTimers()
    const transport = vi.fn().mockResolvedValue({
      success: false,
      error: 'Netflix player unavailable',
    })
    const playbackSession = createNetflixPlaybackSession(transport)
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      playbackSession
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    await vi.advanceTimersByTimeAsync(250)

    expect(video.playbackRate).toBe(1)
    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
  })

  it('keeps the hold hint visible during a seek hint while the play key remains pressed', async () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(
      () => DEFAULT_SETTINGS,
      createNetflixPlaybackSession(vi.fn().mockResolvedValue({ success: true }))
    )

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    await vi.advanceTimersByTimeAsync(250)
    const holdHint = document.getElementById('shortcut-override-hold-speed-hint')
    expect(holdHint).not.toBeNull()
    controller.execute('seekForward', document)

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBe(holdHint)
    expect(holdHint?.style.opacity).toBe('1')
    expect(document.getElementById('shortcut-override-seek-hint')).not.toBeNull()

    vi.advanceTimersByTime(720)

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBe(holdHint)
    expect(holdHint?.style.opacity).toBe('1')

    controller.completeHoldSpeedInteraction('Space')

    expect(document.getElementById('shortcut-override-hold-speed-hint')).toBeNull()
    expect(document.getElementById('shortcut-override-seek-hint')).not.toBeNull()
  })

  it('toggles playback on a short play-key interaction', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    const pause = vi.fn()
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)

    expect(pause).toHaveBeenCalledOnce()
    expect(video.playbackRate).toBe(1)
  })

  it('ignores unrelated keyup events during a hold interaction', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    Object.defineProperty(video, 'paused', { value: false, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginHoldSpeedInteraction(document, video, 'KeyX')

    expect(controller.completeHoldSpeedInteraction('ShiftLeft')).toBe(false)
    expect(controller.shouldInterceptHoldSpeedRepeat('KeyX')).toBe(true)
    vi.advanceTimersByTime(250)
    expect(video.playbackRate).toBe(2)

    expect(controller.completeHoldSpeedInteraction('KeyX')).toBe(true)
    expect(video.playbackRate).toBe(1)
  })

  it('restores the pre-press paused state after a play-key hold', () => {
    vi.useFakeTimers()
    const video = document.createElement('video')
    let paused = true
    const pause = vi.fn(() => {
      paused = true
    })
    const play = vi.fn(() => {
      paused = false
      return Promise.resolve()
    })
    Object.defineProperty(video, 'paused', { configurable: true, get: () => paused })
    Object.defineProperty(video, 'pause', { value: pause, configurable: true })
    Object.defineProperty(video, 'play', { value: play, configurable: true })
    video.playbackRate = 1
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.beginHoldSpeedInteraction(document, video, 'Space')
    vi.advanceTimersByTime(250)

    expect(video.playbackRate).toBe(2)
    expect(controller.completeHoldSpeedInteraction('Space')).toBe(true)
    expect(video.playbackRate).toBe(1)
    expect(paused).toBe(true)
    expect(pause).toHaveBeenCalledOnce()
  })

  it('renders volume feedback through the shared hint manager', () => {
    const video = document.createElement('video')
    video.volume = 0.65
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('volumeDown', document)).toBe(true)

    const volumeLabel = document.getElementById('shortcut-override-volume-hint-label')
    expect(volumeLabel?.textContent).toBe('60%')
    expect(volumeLabel?.style.top).toBe('10%')
    expect(volumeLabel?.style.bottom).toBe('')
    const volumeHint = document.getElementById('shortcut-override-volume-hint')
    expect(volumeHint?.style.width).toBe('100%')
    expect(volumeHint?.style.height).toBe('100%')
    expect(volumeHint?.querySelector('div')?.style.width).toBe('92px')
    expect(volumeHint?.querySelector('div')?.style.borderRadius).toBe('50%')
    expect(document.querySelectorAll('[id^="shortcut-override-"]').length).toBeGreaterThan(0)
  })

  it('renders muted volume feedback as zero percent', () => {
    const video = document.createElement('video')
    video.volume = 0.05
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('mute', document)).toBe(true)

    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('0%')
    expect(document.querySelector('[data-hint-icon="volume-mute"]')).toBeInTheDocument()
  })

  it('uses directional icons for volume shortcuts regardless of the resulting level', () => {
    const video = document.createElement('video')
    video.volume = 0.2
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.execute('volumeUp', document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('25%')
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeNull()

    expect(controller.execute('volumeDown', document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('20%')
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeNull()
  })

  it('shows the volume slider direction with shared feedback', () => {
    const video = document.createElement('video')
    video.volume = 0.2
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    expect(controller.setVolume(0.45, document)).toBe(true)

    expect(video.volume).toBe(0.45)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('45%')
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeNull()

    expect(controller.setVolume(0.15, document)).toBe(true)
    expect(document.getElementById('shortcut-override-volume-hint-label')?.textContent).toBe('15%')
    expect(document.querySelector('[data-hint-icon="volume-down"]')).toBeInTheDocument()
    expect(document.querySelector('[data-hint-icon="volume-up"]')).toBeNull()
  })

  it('uses the configured seek interval for both directions', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const onSeekRequested = vi.fn()
    const settings = {
      ...DEFAULT_SETTINGS,
      seek: { seconds: 7 },
    }
    const controller = createShortcutCommandController(
      () => settings,
      undefined,
      { onSeekRequested }
    )

    expect(controller.execute('seekForward', document)).toBe(true)
    expect(controller.execute('seekBackward', document)).toBe(true)

    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'seek', value: 7000 }),
      expect.any(Function)
    )
    expect(chrome.runtime.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'seek', value: -7000 }),
      expect.any(Function)
    )
    expect(onSeekRequested).toHaveBeenCalledTimes(2)
  })

  it('accumulates feedback for consecutive seeks in the same direction', () => {
    const video = document.createElement('video')
    document.body.append(video)
    const controller = createShortcutCommandController(() => DEFAULT_SETTINGS)

    controller.execute('seekForward', document)
    controller.execute('seekForward', document)

    expect(document.getElementById('shortcut-override-seek-hint')).toHaveTextContent('+20')
  })
})
