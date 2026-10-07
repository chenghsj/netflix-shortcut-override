import type { Locale } from '@/shared/shortcut-types'

export const SHORTCUT_CONFLICT_COPY: Record<Locale, {
  title: string
  consequence: string
  changeKey: string
  transfer: string
}> = {
  en: { title: '{key} is used by {actions}', consequence: 'This will disable {actions}.', changeKey: 'Change key', transfer: 'Use for {action}' },
  'zh-TW': { title: '{key} 已由「{actions}」使用', consequence: '這會停用「{actions}」。', changeKey: '更換按鍵', transfer: '改由「{action}」使用' },
  'zh-CN': { title: '{key} 已由“{actions}”使用', consequence: '这会停用“{actions}”。', changeKey: '更换按键', transfer: '改由“{action}”使用' },
  ja: { title: '{key} は「{actions}」で使用されています', consequence: '「{actions}」を無効にします。', changeKey: 'キーを変更', transfer: '「{action}」で使用' },
  ko: { title: '{key} 키는 {actions}에서 사용 중입니다', consequence: '{actions} 기능이 비활성화됩니다.', changeKey: '키 변경', transfer: '{action}에서 사용' },
}
