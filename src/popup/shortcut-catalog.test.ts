import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { LOCALES, type ShortcutSettings } from '@/shared/shortcut-types'
import { getCopy } from '@/shared/i18n'
import { OPTIONS_LAYOUT_COPY } from '@/shared/options-navigation'
import { getPopupShortcutCategories, matchesPopupShortcut } from './shortcut-catalog'

describe('multilingual shortcut search', () => {
  it.each(LOCALES)('shares the simplified categories and keeps display actions in Playback in %s', locale => {
    const categories = getPopupShortcutCategories(DEFAULT_SETTINGS, locale)
    expect(categories).toHaveLength(5)
    expect(categories.find(category => category.id === 'playback')!.rows.map(row => row.id)).toEqual(['playPause', 'holdSpeed', 'previousEpisode', 'nextEpisode', 'fullscreen', 'pictureInPicture'])
    const navigation = categories.find(category => category.id === 'seeking')!
    expect(navigation.label).toBe(OPTIONS_LAYOUT_COPY[locale].seeking)
    expect(navigation.rows.map(row => row.id)).toEqual(expect.arrayContaining(['previousFrame', 'nextFrame', 'skipIntro', 'seekBackward', 'seekForward']))
    for (const oldLabel of ['Seeking and jumps', '快轉與跳轉', '快进与跳转', 'シーク・位置へ移動', '탐색 및 위치 이동']) {
      expect(navigation.rows.filter(row => matchesPopupShortcut(row, navigation.id, navigation.label, oldLabel)).map(row => row.id)).toContain('previousFrame')
    }
    const subtitles = categories.find(category => category.id === 'subtitles')!
    expect(subtitles.label).toBe(getCopy(locale).shortcutGroups.subtitles)
    expect(subtitles.rows.map(row => row.id)).toEqual(expect.arrayContaining(['cycleSubtitleTrack', 'cycleSubtitleSize', 'subtitleNavigation:previous', 'subtitleNavigation:next', 'subtitleNavigation:replay']))
  })
  it.each(LOCALES)('lists hold speed beneath its parent with the current rate and binding in %s', locale => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.holdSpeed.speed = 2.75
    settings.bindings.playPause.key = { ...settings.bindings.playPause.key!, code: 'KeyJ', key: 'j' }
    const playback = getPopupShortcutCategories(settings, locale).find(item => item.id === 'playback')!
    const hold = playback.rows.find(row => row.id === 'holdSpeed')!
    expect(hold.parentId).toBe('playPause')
    expect(hold.label).toBe(getCopy(locale).holdSpeedRate)
    expect(hold.displayValue).toBe('2.75×')
    expect(hold.key).toEqual(settings.bindings.playPause.key)
    expect(hold.enabled).toBe(true)
    expect(matchesPopupShortcut(hold, playback.id, playback.label, '長按 2.75')).toBe(true)
  })

  it('respects the hold speed switch, parent switch and hidden feature', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    const hold = () => getPopupShortcutCategories(settings, 'en').find(item => item.id === 'playback')!.rows.find(row => row.id === 'holdSpeed')
    settings.holdSpeed.enabled = false
    expect(hold()?.enabled).toBe(false)
    settings.holdSpeed.enabled = true
    settings.bindings.playPause.enabled = false
    expect(hold()?.enabled).toBe(false)
    settings.hiddenFeatures.push('holdSpeed')
    expect(hold()).toBeUndefined()
  })

  it.each(LOCALES)('uses the same labels for built-in and custom seek intervals in %s', locale => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seek.seconds = 20
    settings.seekShortcuts = [{ id: 'seek:matching', kind: 'relative', value: 20 }]
    settings.bindings['seek:matching-backward'] = { enabled: true, key: null }
    settings.bindings['seek:matching-forward'] = { enabled: true, key: null }
    const category = getPopupShortcutCategories(settings, locale).find(item => item.id === 'seeking')!
    for (const [builtin, custom] of [['seekBackward', 'seek:matching-backward'], ['seekForward', 'seek:matching-forward']]) {
      const label = category.rows.find(row => row.id === builtin)!.label
      expect(label).toBe(category.rows.find(row => row.id === custom)!.label)
      expect(label).toContain('20')
    }
  })

  it.each(LOCALES)('lists and searches every preferred speed in %s', locale => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.preferredSpeedShortcuts = [{ id: 'preferred-speed:fast', speed: 3.35 }]
    settings.bindings['preferred-speed:fast'] = { enabled: false, key: null }
    const category = getPopupShortcutCategories(settings, locale).find(category => category.id === 'speed')!
    const custom = category.rows.find(row => row.id === 'preferred-speed:fast')!
    expect(custom.label).toContain('3.35×')
    expect(custom.enabled).toBe(false)
    expect(matchesPopupShortcut(custom, category.id, category.label, '常用速度 3.35')).toBe(true)
    expect(category.rows.find(row => row.id === 'setPreferredSpeed')!.label).toContain('1.5×')
  })
  it.each(LOCALES)('finds translated actions and categories from any interface in %s', locale => {
    const categories = getPopupShortcutCategories(DEFAULT_SETTINGS, locale)
    const matches = (query: string) => categories.flatMap(category => category.rows
      .filter(row => matchesPopupShortcut(row, category.id, category.label, query)).map(row => row.id))
    for (const query of ['Next audio language', '下一種音軌語言', '下一种音轨语言', '次の音声言語', '다음 오디오 언어']) {
      expect(matches(query)).toEqual(['nextAudioTrack'])
    }
    for (const query of ['Display', '畫面', '画面', '화면']) {
      expect(matches(query)).toEqual(['fullscreen', 'pictureInPicture'])
    }
    for (const query of ['Previous subtitle', '上一句', '前の字幕', '이전 자막']) {
      expect(matches(query)).toContain('subtitleNavigation:previous')
      expect(matches(query)).not.toContain('subtitleNavigation:next')
    }
    expect(matches('  音軌  ＳＨＩＦＴ＋ＫｅｙＤ ')).toEqual(['nextAudioTrack'])
    expect(matches('no-such-shortcut')).toEqual([])
  })

  it.each(LOCALES)('uses shared language and function aliases in %s', locale => {
    const categories = getPopupShortcutCategories(DEFAULT_SETTINGS, locale)
    const matches = (query: string) => categories.flatMap(category => category.rows
      .filter(row => matchesPopupShortcut(row, category.id, category.label, query)).map(row => row.id))
    for (const query of ['日語', '일어', 'US English', '米語', '불어', 'Farsi', 'Bahasa Indonesia']) {
      expect(matches(query)).toEqual(['cycleSubtitleTrack', 'previousSubtitleTrack', 'previousAudioTrack', 'nextAudioTrack'])
    }
    expect(matches('日語 SHIFT＋KeyD')).toEqual(['nextAudioTrack'])
    expect(matches('pause')).toContain('playPause')
    expect(matches('暫停')).toContain('playPause')
    expect(matches('floating player')).toEqual(['pictureInPicture'])
    expect(matches('畫中畫')).toEqual(['pictureInPicture'])
    expect(matches('字幕開關')).toEqual(['toggleSubtitles'])
    expect(matches('fast forward')).toEqual(['seekForward'])
    expect(matches('normal speed')).toEqual(['speedReset'])
    expect(matches('repeat sentence')).toEqual(['subtitleNavigation:replay'])
  })

  it('searches translated custom seek and size labels and uses their latest values', () => {
    const settings: ShortcutSettings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [
      { id: 'seek:relative', kind: 'relative', value: 17 },
      { id: 'seek:percentage', kind: 'percentage', value: 37 },
    ]
    settings.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [150] }]
    for (const action of ['seek:relative-backward', 'seek:relative-forward', 'seek:percentage', 'subtitle-size:fixed'] as const) {
      settings.bindings[action] = { enabled: true, key: null }
    }
    const matches = (query: string) => getPopupShortcutCategories(settings, 'en').flatMap(category => category.rows
      .filter(row => matchesPopupShortcut(row, category.id, category.label, query)).map(row => row.id))
    expect(matches('前進 17')).toEqual(['seek:relative-backward', 'seek:relative-forward'])
    expect(matches('进度跳转 37%')).toEqual(['seek:percentage'])
    expect(matches('サイズを指定 150%')).toEqual(['subtitle-size:fixed'])
    expect(matches('font size 150%')).toEqual(['subtitle-size:fixed'])
    expect(matches('fast forward 17')).toEqual(['seek:relative-forward'])
    settings.subtitleSizeShortcuts[0].sizes = [175]
    expect(matches('サイズを指定 150%')).toEqual([])
    expect(matches('サイズを指定 175%')).toEqual(['subtitle-size:fixed'])
  })
})
