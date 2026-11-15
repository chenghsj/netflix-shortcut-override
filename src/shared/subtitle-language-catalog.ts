import { LOCALES } from './shortcut-types'

// Non-deprecated two-letter language subtags from the IANA Language Subtag Registry,
// plus the subtitle variants offered by the picker.
const languageTags = `
  aa ab ae af ak am an ar as av ay az ba be bg bi bm bn bo br bs
  ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu
  fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz
  ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky
  la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my
  na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt
  qu rm rn ro ru rw sa sc sd se sg sh si sk sl sm sn so sq sr ss st su sv sw
  ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu
  zh-Hant zh-Hans yue fil en-US en-GB es-ES es-419 pt-BR pt-PT
`.trim().split(/\s+/)

const aliasesByLanguage = new Map<string, string[]>()
for (const tag of languageTags) {
  const [language] = Intl.getCanonicalLocales(tag)
  const aliases = aliasesByLanguage.get(language) ?? []
  if (tag !== language) aliases.push(tag)
  aliasesByLanguage.set(language, aliases)
}

aliasesByLanguage.set('zh-Hant', [...(aliasesByLanguage.get('zh-Hant') ?? []), 'zh-TW', 'zh_TW'])

// Common names that differ from the browser's translated language names.
const commonLanguageAliases: Record<string, readonly string[]> = {
  en: ['英語'],
  ja: ['日語', 'にほんご', 'ニホンゴ', '일어'],
  ko: ['韓語', '韩文', '한국말'],
  zh: ['漢語', '汉语'],
  'zh-Hant': ['繁中', '繁體', '繁体', '正體', '正体', '繁体字', '繁體字', '번체자', '번체중국어'],
  'zh-Hans': ['簡中', '简中', '簡體', '简体', '簡体字', '간체자', '간체중국어'],
  'en-US': ['美式英文', '美式英語', '美式英语', 'US English', 'U.S. English', 'English (US)', '米語', '米国英語', '미국영어', '미국식 영어'],
  'en-GB': ['英式英文', '英式英語', '英式英语', 'UK English', 'U.K. English', 'English (UK)', '英国英語', '영국영어', '영국식 영어'],
  fr: ['法語', '仏語', '佛語', '불어'],
  de: ['德語', '独語', '獨語', '독어'],
  es: ['西班牙語', '西語', '西语'],
  pt: ['葡萄牙語', '葡語', '葡语'],
  it: ['義大利語', '意大利文', '意大利語', '伊語'],
  ru: ['俄語', '露語'],
  ar: ['阿拉伯語'],
  vi: ['越南語', '越語', '越语'],
  th: ['泰語'],
  id: ['印尼語', '印尼语', 'Bahasa Indonesia'],
  ms: ['馬來語', '马来文', 'Bahasa Melayu'],
  fa: ['Farsi'],
}

const translatedNames = LOCALES.map(locale => new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' }))

export const subtitleLanguageCatalog = [...aliasesByLanguage.entries()].map(([value, aliases]) => {
  const [baseLanguage] = value.split('-')
  const nativeNames = new Intl.DisplayNames(value, { type: 'language', fallback: 'none' })
  return {
    value,
    keywords: [...new Set([
      ...aliases, ...translatedNames.map(names => names.of(value) ?? ''), nativeNames.of(value) ?? '',
      ...(commonLanguageAliases[baseLanguage] ?? []), ...(commonLanguageAliases[value] ?? []),
    ])].filter(Boolean),
  }
})
