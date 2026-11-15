import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { executeNetflixPageApi } from './netflix-page-api-executor'
import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup, SHORTCUT_SETTINGS_VERSION } from './shortcut-settings'
import type { BuiltinShortcutAction } from './shortcut-types'

// Exercise the same serialized function Firefox executes in the page world.
const execute = Function(`return (${executeNetflixPageApi.toString()})`)() as typeof executeNetflixPageApi
type TestPage = typeof window & { __shortcutOverrideFrameStep?: { clear(): void }; netflix?: unknown }
const page = window as TestPage
const installPlayer = (player: object) => Object.assign(page, {
  netflix: { appContext: { state: { playerApp: { getAPI: () => ({ videoPlayer: {
    getAllPlayerSessionIds: () => ['watch-player'], getVideoPlayerBySessionId: () => player,
  } }) } } } },
})

beforeEach(() => {
  document.body.innerHTML = '<video></video>'
  window.history.replaceState(null, '', '/watch/123')
})
afterEach(() => {
  page.__shortcutOverrideFrameStep?.clear()
  delete page.netflix
})

describe('frame stepping', () => {
  const createPlayer = () => ({
    getCurrentTime: vi.fn(() => 1_000), getDuration: () => 100_000, getPaused: () => true,
    getDiagnostics: () => ({ getGroups: () => [{ Framerate: '25.000' }] }),
    seek: vi.fn(), play: vi.fn(), pause: vi.fn(),
  })

  it('accumulates tiny seeks before the player reports the new time, including direction changes', () => {
    const player = createPlayer()
    installPlayer(player)
    expect(execute('stepFrame', 1)).toMatchObject({ targetTime: 1_040, seekCalled: true, frameRate: 25, frameRateEstimated: false })
    expect(execute('stepFrame', 1).targetTime).toBe(1_080)
    expect(execute('stepFrame', -1).targetTime).toBe(1_040)
    expect(document.querySelector('video')!.currentTime).toBe(0)
    expect(player.play).not.toHaveBeenCalled()
  })

  it('retains accumulated targets as intermediate seeks finish', () => {
    const player = createPlayer()
    installPlayer(player)
    execute('stepFrame', 1)
    execute('stepFrame', 1)
    const video = document.querySelector('video')!
    video.currentTime = 1.04
    player.getCurrentTime.mockReturnValue(1_040)
    video.dispatchEvent(new Event('seeked'))
    expect(execute('stepFrame', 1).targetTime).toBe(1_120)
    player.getCurrentTime.mockReturnValue(1_120)
    expect(execute('stepFrame', -1).targetTime).toBe(1_080)
    expect(execute('stepFrame', -1).targetTime).toBe(1_040)
  })

  it.each(['resume', 'seek', 'watch change', 'player change', 'external seek'])(
    'resets its accumulated position after %s', reason => {
      const player = createPlayer()
      installPlayer(player)
      execute('stepFrame', 1)
      if (reason === 'resume') document.querySelector('video')!.dispatchEvent(new Event('play'))
      if (reason === 'seek') execute('seekTo', 1_000)
      if (reason === 'watch change') window.history.replaceState(null, '', '/watch/456')
      if (reason === 'player change') installPlayer({ ...player })
      if (reason === 'external seek') player.getCurrentTime.mockReturnValue(10_000)
      expect(execute('stepFrame', 1).targetTime).toBe(reason === 'external seek' ? 10_040 : 1_040)
    },
  )

  it.each([-1, 1])('pauses playing video before stepping in direction %s and keeps subsequent steps paused', direction => {
    let paused = false
    const calls: string[] = []
    const player = {
      ...createPlayer(), getPaused: () => paused,
      pause: vi.fn(() => { paused = true; calls.push('pause') }),
      seek: vi.fn(() => { calls.push('seek') }),
    }
    installPlayer(player)
    expect(execute('stepFrame', direction)).toMatchObject({ seekCalled: true, targetTime: 1_000 + direction * 40 })
    execute('stepFrame', direction)
    expect(calls).toEqual(['pause', 'seek', 'seek'])
    expect(paused).toBe(true)
    expect(player.play).not.toHaveBeenCalled()
  })

  it('does not seek if pausing fails', () => {
    const player = { ...createPlayer(), getPaused: () => false, pause: () => { throw new Error('pause failed') } }
    installPlayer(player)
    expect(execute('stepFrame', 1).error).toBe('pause failed')
    expect(player.seek).not.toHaveBeenCalled()
  })

  it('uses a documented 24 FPS estimate without valid diagnostics and clamps both ends', () => {
    const player = { ...createPlayer(), getDiagnostics: () => { throw new Error('unavailable') } }
    installPlayer(player)
    expect(execute('stepFrame', 1)).toMatchObject({ frameRate: 24, frameRateEstimated: true })
    player.getCurrentTime.mockReturnValue(0)
    expect(execute('stepFrame', -1).targetTime).toBe(0)
    player.getCurrentTime.mockReturnValue(100_000)
    expect(execute('stepFrame', 1).targetTime).toBe(100_000)
  })

  it.each([NaN, Infinity])('rejects an invalid playback position %s', current => {
    const player = createPlayer()
    player.getCurrentTime.mockReturnValue(current)
    installPlayer(player)
    expect(execute('stepFrame', 1).error).toContain('finite')
    expect(player.seek).not.toHaveBeenCalled()
  })
})

describe('audio track cycling', () => {
  const tracks = [
    { trackId: 'en', bcp47: 'en', displayName: 'English' },
    { trackId: 'en-ad', bcp47: 'en', displayName: 'English (Audio Description)' },
    { trackId: 'ja', bcp47: 'ja', displayName: '日本語' },
  ]

  it('uses track identity, preserves description labels and wraps in both directions', () => {
    let current = tracks[0]
    const setAudioTrack = vi.fn(track => { current = track })
    const setTextTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => [...tracks, tracks[0]], getAudioTrack: () => ({ ...current }), setAudioTrack, setTextTrack })
    expect(execute('cycleAudioTrack', 1)).toMatchObject({
      audioTrack: 'English (Audio Description)', audioTrackSwitchCalled: true, audioTrackIsAudioDescription: true,
    })
    expect(execute('cycleAudioTrack', 1)).toMatchObject({ audioTrack: '日本語', audioTrackIsAudioDescription: false })
    expect(execute('cycleAudioTrack', 1).audioTrack).toBe('English')
    expect(execute('cycleAudioTrack', -1).audioTrack).toBe('日本語')
    expect(setAudioTrack).toHaveBeenLastCalledWith(tracks[2])
    expect(setTextTrack).not.toHaveBeenCalled()
  })

  it('identifies description audio from metadata even when its display name has no description marker', () => {
    const description = { trackId: 'ja-ad', bcp47: 'ja', displayName: '日本語', isAssistive: true }
    installPlayer({ getAudioTrackList: () => [tracks[0], description], getAudioTrack: () => tracks[0], setAudioTrack: vi.fn() })
    expect(execute('cycleAudioTrack', 1)).toMatchObject({
      audioTrack: '日本語', audioTrackLanguage: 'ja', audioTrackIsAudioDescription: true,
    })
  })

  it('cycles in favorite order, skips missing languages and excludes unrequested description tracks', () => {
    let current = tracks[2]
    const setAudioTrack = vi.fn(track => { current = track })
    installPlayer({ getAudioTrackList: () => tracks, getAudioTrack: () => ({ ...current }), setAudioTrack })
    const favorites = [
      { language: 'ja', audioDescription: false },
      { language: 'fr', audioDescription: false },
      { language: 'en', audioDescription: false },
    ]
    expect(execute('cycleAudioTrack', 1, [], favorites).audioTrack).toBe('English')
    expect(execute('cycleAudioTrack', 1, [], favorites).audioTrack).toBe('日本語')
    expect(execute('cycleAudioTrack', -1, [], favorites).audioTrack).toBe('English')
    expect(setAudioTrack.mock.calls.map(([track]) => track.trackId)).toEqual(['en', 'ja', 'en'])
  })

  it('reserves exact regional matches before generic preferences', () => {
    const us = { trackId: 'en-US', bcp47: 'en-US' }
    const uk = { trackId: 'en-GB', bcp47: 'en-GB' }
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => [us, uk], setAudioTrack })
    execute('cycleAudioTrack', 1, [], [
      { language: 'en', audioDescription: false }, { language: 'en-US', audioDescription: false },
    ])
    expect(setAudioTrack).toHaveBeenLastCalledWith(uk)
  })

  it.each([
    { rawTrackType: 'ASSISTIVE' }, { trackType: 'assistive' }, { isAssistive: true },
    { displayName: 'English (Audio Description)' }, { displayName: '英語（口述影像）' },
    { displayName: '英語（音声ガイド）' }, { displayName: '영어 (화면 해설)' },
  ])('only chooses description tracks when explicitly requested: %o', metadata => {
    const description = { trackId: 'en-description', bcp47: 'en', ...metadata }
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => [description, tracks[0]], setAudioTrack })
    execute('cycleAudioTrack', 1, [], [{ language: 'en', audioDescription: false }])
    expect(setAudioTrack).toHaveBeenLastCalledWith(tracks[0])
    execute('cycleAudioTrack', 1, [], [{ language: 'en', audioDescription: true }])
    expect(setAudioTrack).toHaveBeenLastCalledWith(description)
  })

  it('keeps the current track when no favorites match, without falling back between audio variants', () => {
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => [tracks[1]], getAudioTrack: () => tracks[1], setAudioTrack })
    expect(execute('cycleAudioTrack', 1, [], [{ language: 'en', audioDescription: false }]).audioCycleOutcome)
      .toBe('no-tracks-available')
    installPlayer({ getAudioTrackList: () => [tracks[0]], getAudioTrack: () => tracks[0], setAudioTrack })
    expect(execute('cycleAudioTrack', 1, [], [{ language: 'en', audioDescription: true }]).audioCycleOutcome)
      .toBe('no-tracks-available')
    expect(execute('cycleAudioTrack', -1, [], [{ language: 'ja', audioDescription: false }]).audioCycleOutcome)
      .toBe('no-tracks-available')
    expect(execute('cycleAudioTrack', -1, [], [{ language: 'en', audioDescription: false }]).audioCycleOutcome)
      .toBe('unchanged')
    expect(setAudioTrack).not.toHaveBeenCalled()
  })

  it('starts at either end when the current audio is outside the favorites', () => {
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => tracks, getAudioTrack: () => tracks[1], setAudioTrack })
    const favorites = [{ language: 'ja', audioDescription: false }, { language: 'en', audioDescription: false }]
    execute('cycleAudioTrack', 1, [], favorites)
    expect(setAudioTrack).toHaveBeenLastCalledWith(tracks[2])
    execute('cycleAudioTrack', -1, [], favorites)
    expect(setAudioTrack).toHaveBeenLastCalledWith(tracks[0])
  })

  it('reports empty catalogs and leaves a sole selected track alone', () => {
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => [] })
    expect(execute('cycleAudioTrack', 1).audioCycleOutcome).toBe('no-tracks-available')
    installPlayer({ getAudioTrackList: () => [tracks[0]], getAudioTrack: () => tracks[0], setAudioTrack })
    expect(execute('cycleAudioTrack', -1)).toMatchObject({ audioCycleOutcome: 'unchanged', audioTrack: 'English' })
    expect(setAudioTrack).not.toHaveBeenCalled()
  })

  it('starts at the matching end if the current track is unknown and reports setter failure', () => {
    const setAudioTrack = vi.fn()
    installPlayer({ getAudioTrackList: () => tracks, setAudioTrack })
    execute('cycleAudioTrack', -1)
    expect(setAudioTrack).toHaveBeenLastCalledWith(tracks[2])
    installPlayer({ getAudioTrackList: () => tracks })
    expect(execute('cycleAudioTrack', 1).error).toContain('selection API')
  })
})

describe('new shortcut migration', () => {
  const actions: BuiltinShortcutAction[] = ['previousFrame', 'nextFrame', 'previousAudioTrack', 'nextAudioTrack']
  const legacy = () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.version = 25
    settings.subtitleNavigation.bindings.replay.key = { ...DEFAULT_SETTINGS.bindings.skipIntro.key }
    for (const action of actions) delete settings.bindings[action]
    return settings
  }

  it('imports v25 backups and requires all new bindings in v26 backups', () => {
    expect(parseSettingsForBackup(legacy())).toMatchObject({ ok: true, settings: { version: SHORTCUT_SETTINGS_VERSION } })
    for (const action of actions) {
      const settings = structuredClone(DEFAULT_SETTINGS)
      delete settings.bindings[action]
      expect(parseSettingsForBackup(settings).ok).toBe(false)
    }
  })

  it.each(actions)('preserves an existing custom key instead of enabling conflicting %s', action => {
    const settings = legacy()
    settings.bindings.mute.key = { ...DEFAULT_SETTINGS.bindings[action].key }
    expect(normalizeSettings(settings).bindings[action].enabled).toBe(false)
    settings.bindings.mute.enabled = false
    expect(normalizeSettings(settings).bindings[action].enabled).toBe(true)
  })
})
