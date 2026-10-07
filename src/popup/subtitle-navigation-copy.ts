import type { Locale } from '@/shared/shortcut-types'

export const SUBTITLE_NAVIGATION_POPUP_COPY: Record<Locale, {
  inactive: string
  overridden: string
  overriddenBy: string
}> = {
  en: {
    inactive: 'Not enabled',
    overridden: 'Subtitle priority',
    overriddenBy: 'This key is used by {action} in Subtitle navigation.',
  },
  'zh-TW': {
    inactive: '未啟用',
    overridden: '字幕導航優先',
    overriddenBy: '這個按鍵由字幕導航的「{action}」使用。',
  },
  'zh-CN': {
    inactive: '未启用',
    overridden: '字幕导航优先',
    overriddenBy: '这个按键由字幕导航的“{action}”使用。',
  },
  ja: {
    inactive: '無効',
    overridden: '字幕を優先',
    overriddenBy: 'このキーは字幕ナビゲーションの「{action}」で使用されています。',
  },
  ko: {
    inactive: '비활성화',
    overridden: '자막 탐색 우선',
    overriddenBy: '이 키는 자막 탐색의 {action}에서 사용합니다.',
  },
}
