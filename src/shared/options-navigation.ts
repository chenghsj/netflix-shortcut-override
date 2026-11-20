import type { Locale } from '@/shared/shortcut-types'

export const OPTIONS_LAYOUT_COPY = {
  en: { settings: 'Settings', toggle: 'Toggle navigation', category: 'Settings navigation', seeking: 'Seeking and navigation', subtitles: 'Subtitle language and size', subtitleNavigation: 'Sentence jumps and replay', volume: 'Volume and audio', search: 'Search actions or keys…', results: 'Search results', empty: 'No shortcuts found. Try another action or key.', clear: 'Clear search' },
  'zh-TW': { settings: '設定', toggle: '開關導覽', category: '設定導覽', seeking: '進度與跳轉', subtitles: '字幕切換與大小', subtitleNavigation: '逐句跳轉與重播', volume: '音量與音軌', search: '搜尋功能或按鍵…', results: '搜尋結果', empty: '找不到符合的快捷鍵，請試試其他功能名稱或按鍵。', clear: '清除搜尋' },
  'zh-CN': { settings: '设置', toggle: '切换导航', category: '设置导航', seeking: '进度与跳转', subtitles: '字幕切换与大小', subtitleNavigation: '逐句跳转与重播', volume: '音量与音轨', search: '搜索功能或按键…', results: '搜索结果', empty: '找不到匹配的快捷键，请尝试其他功能名称或按键。', clear: '清除搜索' },
  ja: { settings: '設定', toggle: 'ナビゲーションを切り替え', category: '設定ナビゲーション', seeking: '再生位置・ジャンプ', subtitles: '字幕の切替・サイズ', subtitleNavigation: '字幕の移動・リピート', volume: '音量・音声', search: '機能やキーを検索…', results: '検索結果', empty: '該当するショートカットがありません。別の機能名やキーをお試しください。', clear: '検索をクリア' },
  ko: { settings: '설정', toggle: '탐색 메뉴 열기/닫기', category: '설정 탐색', seeking: '재생 위치 및 탐색', subtitles: '자막 언어 및 크기', subtitleNavigation: '문장 이동 및 반복', volume: '음량 및 오디오', search: '기능 또는 키 검색…', results: '검색 결과', empty: '일치하는 단축키가 없습니다. 다른 기능 이름이나 키를 검색해 보세요.', clear: '검색 지우기' },
  es: {
    settings: 'Configuración',
    toggle: 'Mostrar u ocultar navegación',
    category: 'Navegación de la configuración',
    seeking: 'Avance, retroceso y saltos',
    subtitles: 'Idioma y tamaño de subtítulos',
    subtitleNavigation: 'Saltos y repetición de subtítulos',
    volume: 'Volumen y audio',
    search: 'Buscar acciones o teclas…',
    results: 'Resultados de búsqueda',
    empty: 'No se encontraron atajos. Prueba con otra acción o tecla.',
    clear: 'Borrar búsqueda',
  },
  'pt-BR': {
    settings: 'Configurações',
    toggle: 'Mostrar ou ocultar navegação',
    category: 'Navegação das configurações',
    seeking: 'Avanço, retrocesso e saltos',
    subtitles: 'Idioma e tamanho das legendas',
    subtitleNavigation: 'Saltos e repetição de legendas',
    volume: 'Volume e áudio',
    search: 'Buscar ações ou teclas…',
    results: 'Resultados da busca',
    empty: 'Nenhum atalho encontrado. Tente outra ação ou tecla.',
    clear: 'Limpar busca',
  },
  fr: {
    settings: 'Paramètres',
    toggle: 'Afficher ou masquer la navigation',
    category: 'Navigation des paramètres',
    seeking: 'Avance, recul et sauts',
    subtitles: 'Langue et taille des sous-titres',
    subtitleNavigation: 'Sauts et répétition des sous-titres',
    volume: 'Volume et audio',
    search: 'Rechercher une action ou une touche…',
    results: 'Résultats de recherche',
    empty: 'Aucun raccourci trouvé. Essayez une autre action ou touche.',
    clear: 'Effacer la recherche',
  },
  de: {
    settings: 'Einstellungen',
    toggle: 'Navigation ein- oder ausblenden',
    category: 'Einstellungsnavigation',
    seeking: 'Vor- und Zurückspringen',
    subtitles: 'Sprache und Größe der Untertitel',
    subtitleNavigation: 'Untertitelwechsel und Wiederholung',
    volume: 'Lautstärke und Ton',
    search: 'Aktionen oder Tasten suchen…',
    results: 'Suchergebnisse',
    empty: 'Keine Tastenkürzel gefunden. Versuchen Sie es mit einer anderen Aktion oder Taste.',
    clear: 'Suche leeren',
  },
  id: {
    settings: 'Pengaturan',
    toggle: 'Tampilkan atau sembunyikan navigasi',
    category: 'Navigasi pengaturan',
    seeking: 'Maju, mundur, dan lompat',
    subtitles: 'Bahasa dan ukuran subtitel',
    subtitleNavigation: 'Lompat dan ulangi subtitel',
    volume: 'Volume dan audio',
    search: 'Cari tindakan atau tombol…',
    results: 'Hasil pencarian',
    empty: 'Tidak ada pintasan yang ditemukan. Coba tindakan atau tombol lain.',
    clear: 'Hapus pencarian',
  },
} satisfies Record<Locale, Record<string, string>>

export const OPTIONS_SECTION_COPY = {
  en: { playbackPreferences: 'Playback preferences', pauseScreen: 'Pause screen', sentenceMode: 'Sentence mode' },
  'zh-TW': { playbackPreferences: '播放偏好', pauseScreen: '暫停畫面', sentenceMode: '逐句模式' },
  'zh-CN': { playbackPreferences: '播放偏好', pauseScreen: '暂停画面', sentenceMode: '逐句模式' },
  ja: { playbackPreferences: '再生設定', pauseScreen: '一時停止画面', sentenceMode: '字幕ごとの操作モード' },
  ko: { playbackPreferences: '재생 환경설정', pauseScreen: '일시 정지 화면', sentenceMode: '문장 모드' },
  es: {
    playbackPreferences: 'Preferencias de reproducción',
    pauseScreen: 'Pantalla de pausa',
    sentenceMode: 'Modo frase por frase',
  },
  'pt-BR': { playbackPreferences: 'Preferências de reprodução', pauseScreen: 'Tela de pausa', sentenceMode: 'Modo frase a frase' },
  fr: { playbackPreferences: 'Préférences de lecture', pauseScreen: 'Écran de pause', sentenceMode: 'Mode phrase par phrase' },
  de: { playbackPreferences: 'Wiedergabeeinstellungen', pauseScreen: 'Pausenbildschirm', sentenceMode: 'Satzmodus' },
  id: { playbackPreferences: 'Preferensi pemutaran', pauseScreen: 'Layar jeda', sentenceMode: 'Mode per kalimat' },
} satisfies Record<Locale, Record<string, string>>

export const SETTINGS_SEARCH_COPY = {
  en: { search: 'Search settings, actions or keys…', empty: 'No settings or shortcuts found. Try another term or key.' },
  'zh-TW': { search: '搜尋設定、功能或按鍵…', empty: '找不到符合的設定或快捷鍵，請試試其他名稱或按鍵。' },
  'zh-CN': { search: '搜索设置、功能或按键…', empty: '找不到匹配的设置或快捷键，请尝试其他名称或按键。' },
  ja: { search: '設定・機能・キーを検索…', empty: '該当する設定やショートカットがありません。別の名前やキーをお試しください。' },
  ko: { search: '설정, 기능 또는 키 검색…', empty: '일치하는 설정이나 단축키가 없습니다. 다른 이름이나 키를 검색해 보세요.' },
  es: { search: 'Buscar ajustes, acciones o teclas…', empty: 'No se encontraron ajustes ni atajos. Prueba con otro término o tecla.' },
  'pt-BR': {
    search: 'Buscar configurações, ações ou teclas…',
    empty: 'Nenhuma configuração ou atalho encontrado. Tente outro termo ou tecla.',
  },
  fr: {
    search: 'Rechercher un paramètre, une action ou une touche…',
    empty: 'Aucun paramètre ni raccourci trouvé. Essayez un autre terme ou une autre touche.',
  },
  de: {
    search: 'Einstellungen, Aktionen oder Tasten suchen…',
    empty: 'Keine Einstellungen oder Tastenkürzel gefunden. Versuchen Sie einen anderen Begriff oder eine andere Taste.',
  },
  id: {
    search: 'Cari pengaturan, tindakan, atau tombol…',
    empty: 'Tidak ada pengaturan atau pintasan yang ditemukan. Coba istilah atau tombol lain.',
  },
} satisfies Record<Locale, { search: string; empty: string }>

export const SHORTCUT_CATEGORIES = ['playback', 'seeking', 'subtitles', 'volume', 'speed'] as const
export type ShortcutCategory = typeof SHORTCUT_CATEGORIES[number]
export type OptionsPage = ShortcutCategory | 'general' | 'automation' | 'backup' | 'help'

export type OptionsLink = OptionsPage | 'subtitleNavigation'

export const OPTIONS_PAGE_HASHES = {
  playback: '#playback', seeking: '#seeking', subtitles: '#subtitles', subtitleNavigation: '#subtitle-navigation',
  volume: '#volume', speed: '#speed', general: '#general', automation: '#automation', backup: '#backup', help: '#help',
} as const satisfies Record<OptionsLink, string>

export const getOptionsPageFromHash = (hash: string): OptionsPage => {
  const page = (Object.keys(OPTIONS_PAGE_HASHES) as OptionsLink[]).find(page => OPTIONS_PAGE_HASHES[page] === hash)
  return page === 'subtitleNavigation' ? 'subtitles' : page ?? 'playback'
}
