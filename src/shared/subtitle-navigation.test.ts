import { describe, expect, it } from 'vitest'
import { subtitleTimings, subtitleTarget } from './subtitle-navigation'
import { normalizeNetflixTimedText } from './netflix-subtitles'
import { DEFAULT_SETTINGS, normalizeSettings } from './shortcut-settings'
import { createSettingsBackup, parseSettingsBackup } from './settings-backup'

describe('subtitle navigation', () => {
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
  it('navigates distinct sorted subtitle starts and replays the latest sentence in a gap', () => {
    const starts = [1000, 3000, 6000].map(startMs => ({ startMs, endMs: startMs + 1000 }))
    expect(subtitleTarget(starts, 3500, 'previous')).toBe(1000)
    expect(subtitleTarget(starts, 3500, 'next')).toBe(6000)
    expect(subtitleTarget(starts, 5500, 'replay')).toBe(3000)
    expect(subtitleTarget(starts, 9000, 'next')).toBeNull()
    expect(subtitleTarget(starts, 1000, 'previous')).toBeNull()
    expect(subtitleTarget(starts, NaN, 'replay')).toBeNull()
    expect(subtitleTimings('WEBVTT\n\n00:00:03.000 --> 00:00:04.000\nTwo\n\n00:00:01.000 --> 00:00:02.000\nOne\n\n00:00:01.000 --> 00:00:02.000\nOverlap')).toEqual(starts.slice(0, 2))
  })
  it('reads TTML tick timing and ancestor offsets from the ILL parser', () => {
    const document = '<tt xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:tickRate="1000"><body begin="2s"><div><p begin="500t" dur="1s">Hello<br/>world</p></div></body></tt>'
    expect(subtitleTimings(normalizeNetflixTimedText(document))).toEqual([{ startMs: 2500, endMs: 3500 }])
  })

  it('uses cue ends to distinguish the previous subtitle from the current one', () => {
    const cues = [{ startMs: 185_000, endMs: 188_000 }, { startMs: 195_000, endMs: 198_000 }, { startMs: 205_000, endMs: 208_000 }]
    expect(subtitleTarget(cues, 200_000, 'previous')).toBe(195_000)
    expect(subtitleTarget(cues, 196_000, 'previous')).toBe(185_000)
    expect(subtitleTarget(cues, 195_001, 'previous')).toBe(185_000)
    expect(subtitleTarget(cues, 194_999, 'previous')).toBe(185_000)
    expect(subtitleTarget(cues, 198_000, 'previous')).toBe(195_000)
    expect(subtitleTarget(cues, 209_000, 'previous')).toBe(205_000)
    expect(subtitleTarget(cues, 180_000, 'previous')).toBeNull()
    expect(subtitleTarget(cues, 200_000, 'next')).toBe(205_000)
    expect(subtitleTarget(cues, 200_000, 'replay')).toBe(195_000)
    expect(subtitleTarget([], 200_000, 'previous')).toBeNull()
  })

  it('keeps the longest interval for cues sharing a start', () => {
    const cues = subtitleTimings('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nFirst line\n\n00:00:01.000 --> 00:00:04.000\nSecond line\n\n00:00:06.000 --> 00:00:07.000\nNext')
    expect(cues).toEqual([{ startMs: 1000, endMs: 4000 }, { startMs: 6000, endMs: 7000 }])
    expect(subtitleTarget(cues, 3000, 'previous')).toBeNull()
    expect(subtitleTarget(cues, 5000, 'previous')).toBe(1000)
  })

  it('uses the still-active cue and the latest ending cue when intervals overlap', () => {
    const cues = [
      { startMs: 100, endMs: 500 },
      { startMs: 1000, endMs: 5000 },
      { startMs: 2000, endMs: 3000 },
    ]
    expect(subtitleTarget(cues, 3500, 'previous')).toBe(100)
    expect(subtitleTarget(cues, 1975, 'previous')).toBe(100)
    expect(subtitleTarget(cues, 5500, 'previous')).toBe(1000)
  })

})
