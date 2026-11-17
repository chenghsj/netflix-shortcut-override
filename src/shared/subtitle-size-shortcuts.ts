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
} satisfies Record<Locale, Record<string, string>>

export const getSubtitleSizeShortcutLabel = (shortcut: Pick<SubtitleSizeShortcut, 'kind' | 'sizes'>, locale: Locale): string =>
  `${SUBTITLE_SIZE_COPY[locale][shortcut.kind]} · ${formatSubtitleSizes(shortcut.sizes)}`
