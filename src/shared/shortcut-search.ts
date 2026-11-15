import { getCopy } from './i18n'
import { getPreferredSpeed } from './preferred-speed-shortcuts'
import { OPTIONS_LAYOUT_COPY, type ShortcutCategory } from './options-navigation'
import { matchesSearchText } from './search'
import { getShortcutLabels, resolveSeekShortcut, SEEK_PAIR_COPY, SEEK_SECTION_COPY } from './seek-shortcuts'
import { formatKeyBinding } from './shortcut-bindings'
import { LOCALES, type KeyBinding, type ShortcutAction, type ShortcutSettings, type SubtitleNavigationAction } from './shortcut-types'
import { SUBTITLE_NAVIGATION_COPY } from './subtitle-navigation'
import { subtitleLanguageCatalog } from './subtitle-language-catalog'

const actionAliases: Partial<Record<ShortcutAction, readonly string[]>> = {
  playPause: ['toggle playback', 'resume', 'continue playing', '繼續播放', '继续播放', '再開', '재개'],
  seekBackward: ['skip back', 'seek back', '快退', '後退', '后退', '巻き戻し', '早戻し', '되감기'],
  seekForward: ['fast forward', 'skip ahead', '快進', '快进', '早送り', '빨리 감기'],
  previousFrame: ['frame back', 'コマ戻し', '프레임 뒤로'],
  nextFrame: ['frame advance', 'コマ送り', '프레임 앞으로'],
  mute: ['unmute', 'sound off', '取消靜音', '取消静音', 'ミュート解除', '음소거 해제'],
  volumeUp: ['louder', '調高音量', '调高音量', '音量を上げる', '소리 키우기'],
  volumeDown: ['quieter', '調低音量', '调低音量', '音量を下げる', '소리 줄이기'],
  toggleSubtitles: ['toggle captions', 'cc', '字幕開關', '字幕开关', '字幕切替', '자막 전환'],
  cycleSubtitleTrack: ['change subtitles', 'switch subtitle language', '切換字幕', '切换字幕', '字幕言語切替', '자막 언어 변경'],
  previousSubtitleTrack: ['previous captions', '上一種字幕', '上一种字幕', '前の字幕言語', '이전 자막 언어'],
  previousAudioTrack: ['previous audio track', 'previous dubbing', '上一個音軌', '上一个音轨', '前の音声トラック', '이전 음성 트랙'],
  nextAudioTrack: ['change audio', 'switch audio track', 'dubbing', '配音', '切換音軌', '切换音轨', '音声切替', '오디오 전환'],
  fullscreen: ['full screen', '全屏', '全畫面', '全画面', '전체화면'],
  pictureInPicture: ['pip', 'floating player', '畫中畫', '画中画', '小窗', '小窓', '浮動視窗', '플로팅 플레이어'],
  skipIntro: ['skip opening', '跳過片頭', '跳过片头', 'オープニングをスキップ', '오프닝 건너뛰기'],
  previousEpisode: ['prev episode', '前一集', '前のエピソード', '이전 에피소드'],
  nextEpisode: ['skip episode', '後一集', '后一集', '次のエピソード', '다음 에피소드'],
  speedUp: ['faster', '加速', 'スピードアップ', '더 빠르게'],
  speedDown: ['slower', '減速', '减速', 'スローダウン', '더 느리게'],
  setPreferredSpeed: ['favorite speed', '常用速度', 'お気に入り速度', '선호 배속'],
  speedReset: ['normal speed', 'original speed', '原速', '正常速度', '通常速度', '기본 속도'],
}

const subtitleNavigationAliases: Record<SubtitleNavigationAction, readonly string[]> = {
  previous: ['previous sentence', 'previous line', '前一句', '前の文', '이전 문장'],
  next: ['next sentence', 'next line', '後一句', '后一句', '次の文', '다음 문장'],
  replay: ['repeat sentence', 'repeat line', '重聽', '重听', '繰り返し', '문장 반복'],
  playback: ['pause sentence', 'resume sentence', '句子播放', '文の再生', '문장 재생'],
}

const languageActions = new Set<ShortcutAction>(['cycleSubtitleTrack', 'previousSubtitleTrack', 'previousAudioTrack', 'nextAudioTrack'])
const languageKeywords = [...new Set(subtitleLanguageCatalog.flatMap(({ value, keywords }) => [value, ...keywords]))]
const displayKeywords = ['display', ...LOCALES.map(locale => getCopy(locale).shortcutGroups.display)]
const seekingKeywords = ['Seeking and jumps', '快轉與跳轉', '快进与跳转', 'シーク・位置へ移動', '탐색 및 위치 이동']
const subtitleSizeAliases = ['font size', 'caption size', '字級', '字号', '文字サイズ', '글자 크기']

const categoryKeywords = (category: ShortcutCategory | 'subtitleNavigation') => [category, ...(category === 'seeking' ? seekingKeywords : []), ...LOCALES.map(locale => {
  if (category === 'subtitleNavigation') return `${OPTIONS_LAYOUT_COPY[locale].subtitleNavigation} ${SUBTITLE_NAVIGATION_COPY[locale].title}`
  if (category === 'subtitles') return `${OPTIONS_LAYOUT_COPY[locale].subtitles} ${getCopy(locale).shortcutGroups.subtitles}`
  if (category === 'seeking' || category === 'volume') return OPTIONS_LAYOUT_COPY[locale][category]
  return getCopy(locale).shortcutGroups[category]
})]

// Build translated labels from the current settings so custom entries stay searchable after edits.
export function createShortcutSearchIndex(settings: ShortcutSettings) {
  const labels = LOCALES.map(locale => getShortcutLabels(settings, locale))
  const sizeActions = new Set<ShortcutAction>(['cycleSubtitleSize', ...settings.subtitleSizeShortcuts.map(shortcut => shortcut.id)])
  const generalAliases = (action: ShortcutAction) => {
    const seek = resolveSeekShortcut(settings, action)
    const aliasAction = seek?.kind === 'relative' ? seek.value < 0 ? 'seekBackward' : 'seekForward'
      : settings.preferredSpeedShortcuts.some(shortcut => shortcut.id === action) ? 'setPreferredSpeed' : action
    return actionAliases[aliasAction] ?? []
  }
  return {
    general: (action: ShortcutAction, category: ShortcutCategory) => [
      ...labels.map(names => names[action]), ...categoryKeywords(category),
      ...generalAliases(action), ...(action === 'fullscreen' || action === 'pictureInPicture' ? displayKeywords : []),
      ...(languageActions.has(action) ? languageKeywords : []),
      ...(getPreferredSpeed(settings, action) !== undefined ? [String(getPreferredSpeed(settings, action))] : []),
      ...(sizeActions.has(action) ? subtitleSizeAliases : []),
    ],
    subtitleNavigation: (action: SubtitleNavigationAction) => [
      ...LOCALES.map(locale => SUBTITLE_NAVIGATION_COPY[locale][action]), ...categoryKeywords('subtitleNavigation'),
      ...subtitleNavigationAliases[action],
    ],
    holdSpeed: LOCALES.map(locale => getCopy(locale).holdSpeed),
    seekPair: LOCALES.map(locale => SEEK_PAIR_COPY[locale].pair),
    seekPercentage: LOCALES.map(locale => SEEK_SECTION_COPY[locale].percentage),
  }
}

export const matchesShortcutSearch = (keywords: string[], binding: KeyBinding | null | undefined, query: string): boolean =>
  matchesSearchText([
    ...keywords, binding?.code ?? '', binding?.key ?? '', binding ? formatKeyBinding(binding) : '',
    binding?.ctrl ? 'ctrl control' : '', binding?.alt ? 'alt option ⌥' : '',
    binding?.shift ? 'shift ⇧' : '', binding?.meta ? 'meta cmd command ⌘' : '',
  ], query)
