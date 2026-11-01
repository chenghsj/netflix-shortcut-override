import type { Locale } from '@/shared/shortcut-types'

export const SUBTITLE_NAVIGATION_POPUP_COPY: Record<Locale, {
  requiresEnabled: string
  overridden: string
  overriddenBy: string
}> = {
  en: {
    requiresEnabled: 'Turn on “Enable extension” above to use subtitle navigation.',
    overridden: 'Subtitle priority',
    overriddenBy: 'This key is used by {action} in Subtitle navigation.',
  },
  'zh-TW': {
    requiresEnabled: '請先開啟上方的「啟用擴充功能」開關。',
    overridden: '字幕導航優先',
    overriddenBy: '這個按鍵由字幕導航的「{action}」使用。',
  },
  'zh-CN': {
    requiresEnabled: '请先开启上方的「启用扩展功能」开关。',
    overridden: '字幕导航优先',
    overriddenBy: '这个按键由字幕导航的“{action}”使用。',
  },
  ja: {
    requiresEnabled: '上部の拡張機能スイッチをオンにしてください。',
    overridden: '字幕を優先',
    overriddenBy: 'このキーは字幕ナビゲーションの「{action}」で使用されています。',
  },
  ko: {
    requiresEnabled: '위의 확장 프로그램 스위치를 켜 주세요.',
    overridden: '자막 탐색 우선',
    overriddenBy: '이 키는 자막 탐색의 {action}에서 사용합니다.',
  },
}
