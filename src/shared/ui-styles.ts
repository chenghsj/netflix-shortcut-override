import type { Locale } from '@/shared/shortcut-types'

export const UI_STYLE_DEFINITIONS = [
  {
    id: 'classic',
    labels: { en: 'Classic', 'zh-TW': 'Classic', 'zh-CN': 'Classic', ja: 'Classic', ko: 'Classic' },
  },
  {
    id: 'neobrutalism',
    labels: { en: 'Neobrutalism', 'zh-TW': 'Neobrutalism', 'zh-CN': 'Neobrutalism', ja: 'Neobrutalism', ko: 'Neobrutalism' },
  },
  {
    id: 'markdown',
    labels: { en: 'Markdown', 'zh-TW': 'Markdown', 'zh-CN': 'Markdown', ja: 'Markdown', ko: 'Markdown' },
  },
] as const satisfies readonly { id: string; labels: Record<Locale, string> }[]

export type UiStyle = (typeof UI_STYLE_DEFINITIONS)[number]['id']
export const UI_STYLES = UI_STYLE_DEFINITIONS.map(style => style.id)
export const DEFAULT_UI_STYLE: UiStyle = 'neobrutalism'

export const isUiStyle = (value: unknown): value is UiStyle =>
  UI_STYLE_DEFINITIONS.some(style => style.id === value)

export const getUiStyleOptions = (locale: Locale) =>
  UI_STYLE_DEFINITIONS.map(style => ({ value: style.id, label: style.labels[locale] }))
