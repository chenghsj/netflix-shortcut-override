import type { Locale, SubtitleSize, SubtitleSizeShortcut } from './shortcut-types'

export const SUBTITLE_SIZE_LIMITS = { min: 50, max: 300, count: 6 } as const
// Keep accepting cycles saved before the editor limit was reduced.
const MAX_STORED_SUBTITLE_SIZES = 12
export const DEFAULT_SUBTITLE_SIZE_CYCLE = [80, 100, 125]
const LEGACY_PERCENT = { small: 80, medium: 100, large: 125 } as const

export const subtitleSizePercent = (size: SubtitleSize): number =>
  typeof size === 'number' ? size : LEGACY_PERCENT[size]

export const subtitleSizeFromPercent = (size: number): SubtitleSize =>
  size === 80 ? 'small' : size === 100 ? 'medium' : size === 125 ? 'large' : size

export const isSubtitleSizePercent = (size: unknown): size is number =>
  typeof size === 'number' && Number.isInteger(size) && size >= SUBTITLE_SIZE_LIMITS.min && size <= SUBTITLE_SIZE_LIMITS.max

export const isSubtitleSize = (size: unknown): size is SubtitleSize =>
  isSubtitleSizePercent(size) || size === 'small' || size === 'medium' || size === 'large'

// Order is user-defined; validation must never reorder a cycle.
export const isSubtitleSizeList = (sizes: unknown, minCount = 2, maxCount = MAX_STORED_SUBTITLE_SIZES): sizes is number[] =>
  Array.isArray(sizes) && sizes.length >= minCount && sizes.length <= maxCount &&
  sizes.every(isSubtitleSizePercent) && new Set(sizes).size === sizes.length

export const getSubtitleSizeEditLimit = (savedSizes: readonly number[]): number =>
  Math.max(SUBTITLE_SIZE_LIMITS.count, savedSizes.length)

export const isSubtitleSizeShortcut = (value: unknown): value is SubtitleSizeShortcut => {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<SubtitleSizeShortcut>
  return typeof entry.id === 'string' && /^subtitle-size:[a-zA-Z0-9-]{1,64}$/.test(entry.id) &&
    (entry.kind === 'fixed' ? isSubtitleSizeList(entry.sizes, 1) && entry.sizes.length === 1
      : entry.kind === 'cycle' && isSubtitleSizeList(entry.sizes))
}

export const nextSubtitleSize = (sizes: readonly number[], current: SubtitleSize): SubtitleSize => {
  const index = sizes.indexOf(subtitleSizePercent(current))
  return subtitleSizeFromPercent(sizes[(index + 1) % sizes.length])
}

export const formatSubtitleSizes = (sizes: readonly number[]): string => sizes.map(size => `${size}%`).join(' → ')

export const SUBTITLE_SIZE_COPY = {
  en: { title: 'Subtitle size', edit: 'Subtitle size shortcut', cycle: 'Cycle sizes', fixed: 'Set size', sizes: 'Sizes', size: 'Size', addSize: 'Add size', removeSize: 'Remove size {index}', original: 'Original size', range: 'Choose a size from 50–300%. 100% is the original size.', invalid: 'Use different whole percentages from 50 to 300.', description: 'Choose sizes and their order. The shortcut is optional.', changed: 'This shortcut changed. Close and reopen the dialog to edit its latest settings.', remove: 'Remove {action}', cycleRange: 'Choose 2–{count} different sizes from 50–300%. 100% is the original size.', fixedDescription: 'Choose a subtitle size. The shortcut is optional.', reorder: 'Reorder size {index}', dragHint: 'Drag to reorder', keyboardHint: 'Use the Up and Down arrow keys to reorder.' },
  'zh-TW': { title: '字幕大小', edit: '字幕大小快捷鍵', cycle: '循環切換', fixed: '指定大小', sizes: '尺寸', size: '大小', addSize: '新增尺寸', removeSize: '刪除尺寸 {index}', original: '原始大小', range: '可設定 50–300%；100% 為原始大小。', invalid: '請輸入 50–300 的整數，尺寸不可重複。', description: '設定大小與切換順序，快捷鍵可留空。', changed: '此快捷鍵已變更，請關閉後重新開啟以編輯最新設定。', remove: '刪除 {action}', cycleRange: '可設定 2–{count} 個不同大小，範圍為 50–300%。100% 為原始大小。', fixedDescription: '設定字幕大小，快捷鍵可留空。', reorder: '調整大小 {index} 的順序', dragHint: '拖曳調整順序', keyboardHint: '按上、下方向鍵調整順序。' },
  'zh-CN': { title: '字幕大小', edit: '字幕大小快捷键', cycle: '循环切换', fixed: '指定大小', sizes: '尺寸', size: '大小', addSize: '添加尺寸', removeSize: '删除尺寸 {index}', original: '原始大小', range: '可设置 50–300%；100% 为原始大小。', invalid: '请输入 50–300 的整数，尺寸不可重复。', description: '设置大小与切换顺序，快捷键可留空。', changed: '此快捷键已更改，请关闭后重新打开以编辑最新设置。', remove: '删除 {action}', cycleRange: '可设置 2–{count} 个不同大小，范围为 50–300%。100% 为原始大小。', fixedDescription: '设置字幕大小，快捷键可留空。', reorder: '调整大小 {index} 的顺序', dragHint: '拖动调整顺序', keyboardHint: '按上、下方向键调整顺序。' },
  ja: { title: '字幕サイズ', edit: '字幕サイズのショートカット', cycle: 'サイズを順に切り替え', fixed: 'サイズを指定', sizes: 'サイズ', size: 'サイズ', addSize: 'サイズを追加', removeSize: 'サイズ {index} を削除', original: '元のサイズ', range: '50〜300%で設定できます。100%は元のサイズです。', invalid: '50〜300の重複しない整数を入力してください。', description: 'サイズと切替順を設定します。キーは任意です。', changed: 'この設定は変更されました。画面を閉じて開き直してください。', remove: '{action}を削除', cycleRange: '50〜300%の異なるサイズを2〜{count}個設定できます。100%は元のサイズです。', fixedDescription: '字幕サイズを設定します。キーは任意です。', reorder: 'サイズ {index} を並べ替え', dragHint: 'ドラッグして並べ替え', keyboardHint: '上下の矢印キーで並べ替えます。' },
  ko: { title: '자막 크기', edit: '자막 크기 단축키', cycle: '크기 순환', fixed: '크기 지정', sizes: '크기', size: '크기', addSize: '크기 추가', removeSize: '크기 {index} 삭제', original: '원래 크기', range: '50–300%로 설정할 수 있습니다. 100%는 원래 크기입니다.', invalid: '50–300의 서로 다른 정수를 입력하세요.', description: '크기와 순서를 설정하세요. 단축키는 선택 사항입니다.', changed: '이 단축키가 변경되었습니다. 창을 닫고 다시 여세요.', remove: '{action} 삭제', cycleRange: '50–300% 범위에서 서로 다른 크기를 2–{count}개 설정할 수 있습니다. 100%는 원래 크기입니다.', fixedDescription: '자막 크기를 설정하세요. 단축키는 선택 사항입니다.', reorder: '크기 {index} 순서 변경', dragHint: '끌어서 순서 변경', keyboardHint: '위아래 방향키로 순서를 변경하세요.' },
  es: {
    title: 'Tamaño de subtítulos',
    edit: 'Atajo de tamaño de subtítulos',
    cycle: 'Alternar tamaños',
    fixed: 'Fijar tamaño',
    sizes: 'Tamaños',
    size: 'Tamaño',
    addSize: 'Agregar tamaño',
    removeSize: 'Quitar tamaño {index}',
    original: 'Tamaño original',
    range: 'Elige un tamaño entre 50 % y 300 %. El 100 % es el tamaño original.',
    invalid: 'Usa porcentajes enteros distintos entre 50 y 300.',
    description: 'Elige los tamaños y su orden. El atajo es opcional.',
    changed: 'El atajo cambió. Cierra y vuelve a abrir la ventana para editar los nuevos ajustes.',
    remove: 'Quitar {action}',
    cycleRange: 'Elige de 2 a {count} tamaños distintos entre 50 % y 300 %. El 100 % es el tamaño original.',
    fixedDescription: 'Elige un tamaño de subtítulos. El atajo es opcional.',
    reorder: 'Cambiar la posición del tamaño {index}',
    dragHint: 'Arrastra para reordenar',
    keyboardHint: 'Usa las flechas arriba y abajo para reordenar.',
  },
  'pt-BR': {
    title: 'Tamanho das legendas',
    edit: 'Atalho de tamanho das legendas',
    cycle: 'Alternar tamanhos',
    fixed: 'Definir tamanho',
    sizes: 'Tamanhos',
    size: 'Tamanho',
    addSize: 'Adicionar tamanho',
    removeSize: 'Remover tamanho {index}',
    original: 'Tamanho original',
    range: 'Escolha um tamanho de 50% a 300%. O tamanho original é 100%.',
    invalid: 'Use porcentagens inteiras e diferentes de 50 a 300.',
    description: 'Escolha os tamanhos e a ordem. O atalho é opcional.',
    changed: 'O atalho mudou. Feche e abra a janela de novo para editar as configurações atuais.',
    remove: 'Remover {action}',
    cycleRange: 'Escolha de 2 a {count} tamanhos diferentes de 50% a 300%. O tamanho original é 100%.',
    fixedDescription: 'Escolha um tamanho para as legendas. O atalho é opcional.',
    reorder: 'Mudar a posição do tamanho {index}',
    dragHint: 'Arraste para reordenar',
    keyboardHint: 'Use as setas para cima e para baixo para reordenar.',
  },
  fr: {
    title: 'Taille des sous-titres',
    edit: 'Raccourci de taille des sous-titres',
    cycle: 'Parcourir les tailles',
    fixed: 'Fixer la taille',
    sizes: 'Tailles',
    size: 'Taille',
    addSize: 'Ajouter une taille',
    removeSize: 'Retirer la taille {index}',
    original: 'Taille d’origine',
    range: 'Choisissez une taille entre 50 et 300 %. La taille d’origine est de 100 %.',
    invalid: 'Utilisez des pourcentages entiers différents de 50 à 300.',
    description: 'Choisissez les tailles et leur ordre. Le raccourci est facultatif.',
    changed: 'Ce raccourci a changé. Fermez puis rouvrez la fenêtre pour modifier les paramètres actuels.',
    remove: 'Retirer {action}',
    cycleRange: 'Choisissez de 2 à {count} tailles différentes entre 50 et 300 %. La taille d’origine est de 100 %.',
    fixedDescription: 'Choisissez une taille de sous-titres. Le raccourci est facultatif.',
    reorder: 'Déplacer la taille {index}',
    dragHint: 'Faire glisser pour réorganiser',
    keyboardHint: 'Utilisez les flèches haut et bas pour réorganiser.',
  },
  de: {
    title: 'Untertitelgröße',
    edit: 'Tastenkürzel für die Untertitelgröße',
    cycle: 'Größen durchschalten',
    fixed: 'Größe festlegen',
    sizes: 'Größen',
    size: 'Größe',
    addSize: 'Größe hinzufügen',
    removeSize: 'Größe {index} entfernen',
    original: 'Originalgröße',
    range: 'Wählen Sie eine Größe zwischen 50 und 300 %. 100 % ist die Originalgröße.',
    invalid: 'Verwenden Sie unterschiedliche ganze Prozentwerte zwischen 50 und 300.',
    description: 'Wählen Sie die Größen und ihre Reihenfolge. Das Tastenkürzel ist optional.',
    changed: 'Dieses Tastenkürzel wurde geändert. Schließen und öffnen Sie den Dialog erneut, um die aktuellen Einstellungen zu bearbeiten.',
    remove: '{action} entfernen',
    cycleRange: 'Wählen Sie 2 bis {count} unterschiedliche Größen zwischen 50 und 300 %. 100 % ist die Originalgröße.',
    fixedDescription: 'Wählen Sie eine Untertitelgröße. Das Tastenkürzel ist optional.',
    reorder: 'Größe {index} verschieben',
    dragHint: 'Zum Sortieren ziehen',
    keyboardHint: 'Verwenden Sie zum Sortieren die Pfeiltasten nach oben und unten.',
  },
  id: {
    title: 'Ukuran subtitel',
    edit: 'Pintasan ukuran subtitel',
    cycle: 'Gilir ukuran',
    fixed: 'Tetapkan ukuran',
    sizes: 'Ukuran',
    size: 'Ukuran',
    addSize: 'Tambah ukuran',
    removeSize: 'Hapus ukuran {index}',
    original: 'Ukuran asli',
    range: 'Pilih ukuran 50–300%. Ukuran asli adalah 100%.',
    invalid: 'Gunakan persentase bulat yang berbeda dari 50 hingga 300.',
    description: 'Pilih ukuran dan urutannya. Pintasan bersifat opsional.',
    changed: 'Pintasan berubah. Tutup lalu buka kembali dialog untuk mengedit pengaturan terbaru.',
    remove: 'Hapus {action}',
    cycleRange: 'Pilih 2–{count} ukuran yang berbeda dari 50–300%. Ukuran asli adalah 100%.',
    fixedDescription: 'Pilih ukuran subtitel. Pintasan bersifat opsional.',
    reorder: 'Ubah urutan ukuran {index}',
    dragHint: 'Seret untuk mengurutkan',
    keyboardHint: 'Gunakan tombol Panah Atas dan Bawah untuk mengurutkan.',
  },
} satisfies Record<Locale, Record<string, string>>

export const getSubtitleSizeShortcutLabel = (shortcut: Pick<SubtitleSizeShortcut, 'kind' | 'sizes'>, locale: Locale): string =>
  `${SUBTITLE_SIZE_COPY[locale][shortcut.kind]} · ${formatSubtitleSizes(shortcut.sizes)}`
