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
  es: {
    enableLabel: 'Activar',
    guide: 'Activa esta opción para usar los atajos de navegación por subtítulos.',
    permission: 'El navegador puede solicitar acceso a Netflix y a los sitios de subtítulos.',
  },
  'pt-BR': {
    enableLabel: 'Ativar',
    guide: 'Ative esta opção para usar os atalhos de navegação por legendas.',
    permission: 'O navegador pode pedir acesso à Netflix e aos sites de legendas.',
  },
  fr: {
    enableLabel: 'Activer',
    guide: 'Activez cette option pour utiliser les raccourcis de navigation par sous-titres.',
    permission: 'Votre navigateur peut demander l’accès à Netflix et aux sites de sous-titres.',
  },
  de: {
    enableLabel: 'Aktivieren',
    guide: 'Aktivieren Sie diese Option, um die Tastenkürzel für die Untertitelnavigation zu verwenden.',
    permission: 'Ihr Browser kann den Zugriff auf Netflix und die Untertitel-Websites anfordern.',
  },
  id: {
    enableLabel: 'Aktifkan',
    guide: 'Aktifkan opsi ini untuk menggunakan pintasan navigasi subtitel.',
    permission: 'Browser mungkin meminta akses ke Netflix dan situs subtitel.',
  },
}
