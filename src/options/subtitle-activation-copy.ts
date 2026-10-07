import type { Locale } from '@/shared/shortcut-types'

export const SUBTITLE_ACTIVATION_COPY: Record<Locale, {
  enableLabel: string; guide: string; permission: string
}> = {
  en: {
    enableLabel: 'Enable',
    guide: 'Turn on this switch to use subtitle navigation shortcuts.',
    permission: 'Your browser may ask for access to Netflix and subtitle websites.',
  },
  'zh-TW': {
    enableLabel: '啟用',
    guide: '開啟此開關，即可使用字幕導航快捷鍵。',
    permission: '瀏覽器可能會要求 Netflix 與字幕來源的網站存取權。',
  },
  'zh-CN': {
    enableLabel: '启用',
    guide: '打开此开关，即可使用字幕导航快捷键。',
    permission: '浏览器可能会要求 Netflix 与字幕来源的网站访问权限。',
  },
  ja: {
    enableLabel: '有効にする',
    guide: 'このスイッチをオンにすると、字幕ナビゲーションのショートカットを使えます。',
    permission: 'ブラウザーから Netflix と字幕サイトへのアクセス許可を求められる場合があります。',
  },
  ko: {
    enableLabel: '활성화',
    guide: '이 스위치를 켜면 자막 탐색 단축키를 사용할 수 있습니다.',
    permission: '브라우저에서 Netflix와 자막 사이트의 접근 권한을 요청할 수 있습니다.',
  },
}
