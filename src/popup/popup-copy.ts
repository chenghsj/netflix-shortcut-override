import type { Locale } from '@/shared/shortcut-types'

export const POPUP_COPY = {
  en: { navigation: 'Shortcuts and settings', openSettings: 'Open settings', openCategorySettings: 'Edit shortcuts on the settings page' },
  'zh-TW': { navigation: '快捷鍵與設定', openSettings: '前往設定', openCategorySettings: '前往設定頁編輯快捷鍵' },
  'zh-CN': { navigation: '快捷键与设置', openSettings: '前往设置', openCategorySettings: '前往设置页编辑快捷键' },
  ja: { navigation: 'ショートカットと設定', openSettings: '設定を開く', openCategorySettings: '設定ページでショートカットを編集' },
  ko: { navigation: '단축키 및 설정', openSettings: '설정 열기', openCategorySettings: '설정 페이지에서 단축키 편집' },
  es: {
    navigation: 'Atajos y configuración',
    openSettings: 'Abrir configuración',
    openCategorySettings: 'Editar atajos en la página de configuración',
  },
  'pt-BR': {
    navigation: 'Atalhos e configurações',
    openSettings: 'Abrir configurações',
    openCategorySettings: 'Editar atalhos na página de configurações',
  },
  fr: {
    navigation: 'Raccourcis et paramètres',
    openSettings: 'Ouvrir les paramètres',
    openCategorySettings: 'Modifier les raccourcis dans les paramètres',
  },
  de: {
    navigation: 'Tastenkürzel und Einstellungen',
    openSettings: 'Einstellungen öffnen',
    openCategorySettings: 'Tastenkürzel in den Einstellungen bearbeiten',
  },
  id: {
    navigation: 'Pintasan dan pengaturan',
    openSettings: 'Buka pengaturan',
    openCategorySettings: 'Edit pintasan di halaman pengaturan',
  },
} satisfies Record<Locale, Record<string, string>>
