import type { Locale } from '@/shared/shortcut-types'

export const UI_STYLE_DEFINITIONS = [
  {
    id: 'classic',
    labels: { en: 'Classic', 'zh-TW': 'Classic', 'zh-CN': 'Classic', ja: 'Classic', ko: 'Classic', es: 'Clásico', 'pt-BR': 'Clássico', fr: 'Classique', de: 'Klassisch', id: 'Klasik' },
  },
  {
    id: 'neobrutalism',
    labels: { en: 'Neobrutalism', 'zh-TW': 'Neobrutalism', 'zh-CN': 'Neobrutalism', ja: 'Neobrutalism', ko: 'Neobrutalism', es: 'Neobrutalismo', 'pt-BR': 'Neobrutalismo', fr: 'Néobrutalisme', de: 'Neobrutalismus', id: 'Neobrutalisme' },
  },
  {
    id: 'markdown',
    labels: { en: 'Markdown', 'zh-TW': 'Markdown', 'zh-CN': 'Markdown', ja: 'Markdown', ko: 'Markdown', es: 'Markdown', 'pt-BR': 'Markdown', fr: 'Markdown', de: 'Markdown', id: 'Markdown' },
  },
] as const satisfies readonly { id: string; labels: Record<Locale, string> }[]

export type UiStyle = (typeof UI_STYLE_DEFINITIONS)[number]['id']
export const UI_STYLES = UI_STYLE_DEFINITIONS.map(style => style.id)
export const DEFAULT_UI_STYLE: UiStyle = 'neobrutalism'

export const isUiStyle = (value: unknown): value is UiStyle =>
  UI_STYLE_DEFINITIONS.some(style => style.id === value)

export const getUiStyleOptions = (locale: Locale, currentStyle?: UiStyle) =>
  UI_STYLE_DEFINITIONS.filter(style => style.id !== 'markdown' || currentStyle === 'markdown')
    .map(style => ({ value: style.id, label: style.labels[locale] }))
