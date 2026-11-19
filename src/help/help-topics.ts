import type { OptionsLink } from '@/shared/options-navigation'
import { matchesSearchText } from '@/shared/search'
import { RESET_SCOPE_COPY } from '@/shared/reset-scopes'
import { LOCALES, type Locale } from '@/shared/shortcut-types'
import { EN_HELP_TOPICS, HELP_UI_COPY, type HelpTopicId, type HelpTopicText } from './help-copy'
import { JA_HELP_TOPICS, KO_HELP_TOPICS } from './help-copy-ja-ko'
import { SPECIAL_SHORTCUT_KEYS, LEGACY_SPECIAL_KEY_ALIASES } from '@/shared/special-shortcut-keys'
import { SPECIAL_KEY_GUIDE_COPY, SPECIAL_KEY_LABELS } from './special-key-copy'
import { ZH_CN_HELP_TOPICS, ZH_TW_HELP_TOPICS } from './help-copy-zh'

export const HELP_CATEGORY_IDS = ['start', 'editing', 'backup', 'troubleshooting'] as const
export type HelpCategory = typeof HELP_CATEGORY_IDS[number]
export const HELP_TOPIC_COPY: Record<Locale, HelpTopicText> = {
  en: EN_HELP_TOPICS, 'zh-TW': ZH_TW_HELP_TOPICS, 'zh-CN': ZH_CN_HELP_TOPICS, ja: JA_HELP_TOPICS, ko: KO_HELP_TOPICS,
}

type TopicDefinition = {
  id: HelpTopicId
  category: HelpCategory
  page?: OptionsLink
}

// Keep workflow and recovery instructions independent of enabled or hidden features.
const definitions: readonly TopicDefinition[] = [
  { id: 'start', category: 'start', page: 'playback' },
  { id: 'diagnostics', category: 'start' },
  { id: 'edit', category: 'editing', page: 'playback' },
  { id: 'supportedKeys', category: 'editing', page: 'playback' },
  { id: 'conflicts', category: 'editing', page: 'playback' },
  { id: 'visibility', category: 'editing', page: 'playback' },
  { id: 'reset', category: 'backup', page: 'playback' },
  { id: 'backup', category: 'backup', page: 'backup' },
  { id: 'sync', category: 'backup', page: 'backup' },
  { id: 'permissions', category: 'troubleshooting', page: 'subtitleNavigation' },
  { id: 'privacy', category: 'troubleshooting' },
]

export function createHelpTopics(locale: Locale) {
  return definitions.map(topic => {
    const [title, body] = HELP_TOPIC_COPY[locale][topic.id]
    const resetDetails = (language: Locale) => {
      const copy = RESET_SCOPE_COPY[language]
      return [copy.generalShortcuts, copy.subtitleNavigation, copy.binding, copy.preferredSpeed, copy.seekInterval,
        copy.subtitleSizeCycle, copy.holdSpeed, copy.speedRange, copy.restoreDraft, copy.sizeDefaults]
    }
    const specialKeyDetails = (language: Locale) => [
      ...SPECIAL_SHORTCUT_KEYS.map(key => `${key}: ${SPECIAL_KEY_LABELS[language][key]}`),
      ...Object.entries(LEGACY_SPECIAL_KEY_ALIASES).map(([alias, key]) => `${alias} → ${key}`),
    ]
    const keywords = LOCALES.flatMap(language => [
      ...HELP_TOPIC_COPY[language][topic.id],
      HELP_UI_COPY[language].categories[HELP_CATEGORY_IDS.indexOf(topic.category)],
      ...(topic.id === 'reset' ? resetDetails(language) : []),
      ...(topic.id === 'supportedKeys' ? [
        ...specialKeyDetails(language),
        ...Object.values(SPECIAL_KEY_GUIDE_COPY[language]).flatMap(value => typeof value === 'string' ? [value] : Object.values(value)),
      ] : []),
    ])
    return { ...topic, title, body, keywords }
  })
}

export type HelpTopic = ReturnType<typeof createHelpTopics>[number]

export const matchesHelpTopic = (topic: HelpTopic, query: string) =>
  matchesSearchText(topic.keywords, query)

export const getHelpCategoryLabel = (category: HelpCategory, locale: Locale) => HELP_UI_COPY[locale].categories[HELP_CATEGORY_IDS.indexOf(category)]
