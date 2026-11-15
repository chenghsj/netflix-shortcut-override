import { getCopy } from './i18n'
import type { Locale } from './shortcut-types'

const translations = {
  en: {
    title: 'Favorite audio tracks',
    description: 'The audio shortcuts cycle through these tracks in order. Unavailable tracks are skipped.',
    emptyDescription: 'Add languages to limit the audio shortcuts to this list. An empty list cycles through all available tracks.',
    language: 'Audio tracks',
    chooseLanguage: 'Choose audio tracks',
    selectedCount: '{count} tracks selected',
    reorder: 'Reorder {subtitle}',
    remove: 'Remove {subtitle}',
    limit: 'Add up to {count} audio tracks.',
    unavailable: 'No favorite audio tracks available',
    audioDescription: 'Audio Description',
  },
  'zh-TW': {
    title: '常用音軌',
    description: '音軌快捷鍵會依序切換這些音軌。影片未提供的音軌會自動略過。',
    emptyDescription: '加入語言後，音軌快捷鍵只會切換清單中的音軌；未加入時，會切換影片提供的所有音軌。',
    language: '音軌',
    chooseLanguage: '選擇音軌',
    selectedCount: '已選 {count} 個音軌',
    reorder: '調整 {subtitle} 的順序',
    remove: '移除 {subtitle}',
    limit: '最多可加入 {count} 個音軌。',
    unavailable: '影片未提供清單中的常用音軌',
    audioDescription: '口述影像',
  },
  'zh-CN': {
    title: '常用音轨',
    description: '音轨快捷键会依次切换这些音轨。影片未提供的音轨会自动跳过。',
    emptyDescription: '添加语言后，音轨快捷键只会切换列表中的音轨；未添加时，会切换影片提供的所有音轨。',
    language: '音轨',
    chooseLanguage: '选择音轨',
    selectedCount: '已选 {count} 个音轨',
    reorder: '调整 {subtitle} 的顺序',
    remove: '移除 {subtitle}',
    limit: '最多可添加 {count} 个音轨。',
    unavailable: '影片未提供列表中的常用音轨',
    audioDescription: '口述影像',
  },
  ja: {
    title: 'よく使う音声',
    description: '音声ショートカットでこの順に切り替えます。利用できない音声はスキップします。',
    emptyDescription: '言語を追加すると、リスト内の音声のみ切り替えます。空の場合は、利用可能なすべての音声を切り替えます。',
    language: '音声',
    chooseLanguage: '音声を選択',
    selectedCount: '{count} 個の音声を選択中',
    reorder: '{subtitle} の順序を変更',
    remove: '{subtitle} を削除',
    limit: '音声は {count} 個まで追加できます。',
    unavailable: 'よく使う音声はこの作品では利用できません',
    audioDescription: '音声ガイド',
  },
  ko: {
    title: '자주 쓰는 오디오',
    description: '오디오 단축키로 이 순서대로 전환합니다. 제공되지 않는 오디오는 건너뜁니다.',
    emptyDescription: '언어를 추가하면 목록의 오디오만 전환합니다. 목록이 비어 있으면 제공되는 모든 오디오를 전환합니다.',
    language: '오디오',
    chooseLanguage: '오디오 선택',
    selectedCount: '{count}개 오디오 선택됨',
    reorder: '{subtitle} 순서 변경',
    remove: '{subtitle} 삭제',
    limit: '오디오는 최대 {count}개까지 추가할 수 있습니다.',
    unavailable: '이 작품에는 자주 쓰는 오디오가 없습니다',
    audioDescription: '화면 해설',
  },
} satisfies Record<Locale, Partial<ReturnType<typeof getCopy>['subtitleFavorites']> & {
  audioDescription: string
}>

export const getAudioFavoritesCopy = (locale: Locale) => ({
  ...getCopy(locale).subtitleFavorites,
  ...translations[locale],
})
