import { getCopy } from './i18n'
import type { Locale } from './shortcut-types'

const translations = {
  en: {
    title: 'Favorite audio tracks',
    description: 'Audio shortcuts follow this order and skip unavailable tracks. Opening a video does not automatically apply a favorite.',
    emptyDescription: 'Add favorites to limit audio switching to your list; an empty list uses all available tracks. Opening a video does not automatically apply a favorite.',
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
    description: '音軌快捷鍵依清單順序切換，略過不可用項目；開啟影片時不會自動套用。',
    emptyDescription: '加入常用音軌可限制切換範圍；清單為空時切換全部可用音軌。開啟影片時不會自動套用。',
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
    description: '音轨快捷键依列表顺序切换，跳过不可用项目；打开视频时不会自动应用。',
    emptyDescription: '添加常用音轨可限制切换范围；列表为空时切换全部可用音轨。打开视频时不会自动应用。',
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
    description: 'この順に音声を切り替え、利用できない項目は飛ばします。動画を開いたときに自動適用しません。',
    emptyDescription: '追加した音声だけを切り替えます。空の場合は利用可能な音声をすべて使います。動画を開いたときに自動適用しません。',
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
    description: '이 순서대로 오디오를 전환하고 없는 항목은 건너뜁니다. 동영상을 열 때 자동 적용하지 않습니다.',
    emptyDescription: '추가한 오디오만 전환하며 목록이 비어 있으면 사용 가능한 모든 오디오를 전환합니다. 동영상을 열 때 자동 적용하지 않습니다.',
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
