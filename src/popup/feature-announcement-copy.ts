import type { Locale } from '@/shared/shortcut-types'

export type FeatureAnnouncementCopy = {
  title: string; description: string; enable: string; dismiss: string; error: string
}

export const FEATURE_ANNOUNCEMENT_COPY: Record<Locale, FeatureAnnouncementCopy> = {
  en: {
    title: 'New: Subtitle navigation',
    description: 'Jump to the previous or next subtitle, or replay the current line with shortcuts. Enable it in settings to get started.',
    enable: 'Go to enable', dismiss: 'Dismiss',
    error: 'Unable to dismiss this announcement. Please try again.',
  },
  'zh-TW': {
    title: '新增：字幕導航',
    description: '用快捷鍵跳到上一句、下一句，或重播目前字幕。請至設定手動啟用。',
    enable: '前往啟用', dismiss: '略過',
    error: '無法略過此公告，請再試一次。',
  },
  'zh-CN': {
    title: '新增：字幕导航',
    description: '用快捷键跳到上一句、下一句，或重播当前字幕。请到设置手动启用。',
    enable: '前往启用', dismiss: '略过',
    error: '无法略过此公告，请重试。',
  },
  ja: {
    title: '新機能：字幕ナビゲーション',
    description: 'ショートカットで前後の字幕へ移動したり、現在の字幕を繰り返し再生できます。設定で有効にしてください。',
    enable: '設定で有効にする', dismiss: '閉じる',
    error: 'お知らせを閉じられませんでした。もう一度お試しください。',
  },
  ko: {
    title: '새 기능: 자막 탐색',
    description: '단축키로 이전 또는 다음 자막으로 이동하거나 현재 자막을 다시 재생하세요. 설정에서 직접 활성화해야 합니다.',
    enable: '설정에서 활성화', dismiss: '닫기',
    error: '알림을 닫을 수 없습니다. 다시 시도해 주세요.',
  },
}
