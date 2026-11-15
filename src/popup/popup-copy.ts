import type { Locale } from '@/shared/shortcut-types'

export const POPUP_COPY = {
  en: { category: 'Shortcut category', openSettings: 'Open settings', openCategorySettings: 'Edit shortcuts on the settings page' },
  'zh-TW': { category: '快捷鍵分類', openSettings: '前往設定', openCategorySettings: '前往設定頁編輯快捷鍵' },
  'zh-CN': { category: '快捷键分类', openSettings: '前往设置', openCategorySettings: '前往设置页编辑快捷键' },
  ja: { category: 'ショートカットの分類', openSettings: '設定を開く', openCategorySettings: '設定ページでショートカットを編集' },
  ko: { category: '단축키 분류', openSettings: '설정 열기', openCategorySettings: '설정 페이지에서 단축키 편집' },
} satisfies Record<Locale, Record<string, string>>
