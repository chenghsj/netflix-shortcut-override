import type { Locale } from '@/shared/shortcut-types'

export const SUBTITLE_NAVIGATION_POPUP_COPY: Record<Locale, {
  requiresEnabled: string
  overridden: string
  overriddenBy: string
}> = {
  en: {
    requiresEnabled: 'Turn on “Enable extension” above to use subtitle navigation.',
    overridden: 'Shortcut priority',
    overriddenBy: 'This key is used by {action}. Choose another key for subtitle navigation.',
  },
  'zh-TW': {
    requiresEnabled: '請先開啟上方的「啟用擴充功能」開關。',
    overridden: '一般快捷鍵優先',
    overriddenBy: '這個按鍵由「{action}」使用，請為字幕導航設定其他按鍵。',
  },
  'zh-CN': {
    requiresEnabled: '请先开启上方的「启用扩展功能」开关。',
    overridden: '常规快捷键优先',
    overriddenBy: '这个按键由“{action}”使用，请为字幕导航设置其他按键。',
  },
  ja: {
    requiresEnabled: '上部の拡張機能スイッチをオンにしてください。',
    overridden: '通常のキーを優先',
    overriddenBy: 'このキーは「{action}」で使用されています。字幕ナビゲーションには別のキーを設定してください。',
  },
  ko: {
    requiresEnabled: '위의 확장 프로그램 스위치를 켜 주세요.',
    overridden: '일반 단축키 우선',
    overriddenBy: '이 키는 {action}에서 사용합니다. 자막 탐색에는 다른 키를 설정하세요.',
  },
}
