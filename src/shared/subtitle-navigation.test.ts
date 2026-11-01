import { describe, expect, it } from 'vitest'
import { findSubtitleNavigationActionForKey, findSubtitleNavigationConflict, subtitleStarts, subtitleTarget } from './subtitle-navigation'
import { normalizeNetflixTimedText } from './netflix-subtitles'
import { DEFAULT_SETTINGS, normalizeSettings } from './shortcut-settings'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'

describe('subtitle navigation', () => {
  it('releases individually disabled keys while retaining conflicts under a disabled master', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const key = settings.subtitleNavigation.bindings.playback.key
    expect(findSubtitleNavigationConflict(settings, 'next', key)).toBe('playback')
    settings.subtitleNavigation.bindings.playback.enabled = false
    expect(findSubtitleNavigationConflict(settings, 'next', key)).toBeNull()
  })
  it('migrates old settings disabled and retains the single switch in backups', () => {
    const { subtitleNavigation: ignored, ...old } = DEFAULT_SETTINGS
    void ignored
    expect(normalizeSettings({ ...old, version: 10 }).subtitleNavigation.enabled).toBe(false)
    const settings = { ...DEFAULT_SETTINGS, subtitleNavigation: { ...DEFAULT_SETTINGS.subtitleNavigation, enabled: true } }
    const backup = createSettingsBackup(settings, { extensionVersion: 'test' })
    expect(parseSettingsBackup(JSON.stringify(backup))).toMatchObject({ ok: true, value: { settings: { subtitleNavigation: { ...DEFAULT_SETTINGS.subtitleNavigation, enabled: true } } } })
    delete (backup.settings as Partial<typeof settings>).subtitleNavigation
    expect(parseSettingsBackup(JSON.stringify(backup))).toEqual({ ok: false, error: 'invalidSettings' })
  })
  it('does not consume modified WASD keys', () => {
    for (const modifier of ['ctrlKey', 'altKey', 'shiftKey', 'metaKey']) {
      expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyA', [modifier]: true }))).toBeNull()
    }
    expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyS' }))).toBeNull()
  })
  it('routes edited keys only while the master and row are enabled', () => {
    const settings = normalizeSettings({ ...DEFAULT_SETTINGS, subtitleNavigation: { enabled: true, bindings: { next: { enabled: true, key: { code: 'KeyN', key: 'n', ctrl: false, alt: false, shift: true, meta: false } } } } })
    expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyD' }), settings)).toBeNull()
    expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyN', shiftKey: true }), settings)).toBe('next')
    settings.subtitleNavigation.bindings.next.enabled = false
    expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyN', shiftKey: true }), settings)).toBeNull()
    settings.subtitleNavigation.enabled = false
    expect(findSubtitleNavigationActionForKey(new KeyboardEvent('keydown', { code: 'KeyA' }), settings)).toBeNull()
  })
  it('navigates distinct sorted subtitle starts and replays the latest sentence in a gap', () => {
    const starts = [1000, 3000, 6000]
    expect(subtitleTarget(starts, 3500, 'previous')).toBe(1000)
    expect(subtitleTarget(starts, 3500, 'next')).toBe(6000)
    expect(subtitleTarget(starts, 5500, 'replay')).toBe(3000)
    expect(subtitleTarget(starts, 9000, 'next')).toBeNull()
    expect(subtitleTarget(starts, 1000, 'previous')).toBeNull()
    expect(subtitleTarget(starts, NaN, 'replay')).toBeNull()
    expect(subtitleStarts('WEBVTT\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:01.000 --> 00:00:02.000\nOverlap')).toEqual([1000, 3000])
  })
  it('reads TTML tick timing and ancestor offsets from the ILL parser', () => {
    const document = '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:tickRate="1000"><body begin="2s"><div><p begin="500t" dur="1s">Hello<br/>world</p></div></body></tt>'
    expect(subtitleStarts(normalizeNetflixTimedText(document))).toEqual([2500])
  })
})
