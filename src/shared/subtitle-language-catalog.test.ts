import { describe, expect, it } from 'vitest'

import { matchesSearchText } from './search'
import { subtitleLanguageCatalog } from './subtitle-language-catalog'

const matchingLanguages = (query: string) => subtitleLanguageCatalog
  .filter(option => matchesSearchText([option.value, ...option.keywords], query))
  .map(option => option.value).sort()

describe('subtitle language aliases', () => {
  it.each([
    ['日語', ['ja']], ['韓語', ['ko']], ['韩文', ['ko']],
    ['法語', ['fr']], ['德語', ['de']], ['西語', ['es', 'es-419', 'es-ES']],
    ['葡語', ['pt', 'pt-BR', 'pt-PT']], ['義大利語', ['it']], ['意大利文', ['it']],
    ['俄語', ['ru']], ['阿拉伯語', ['ar']], ['越語', ['vi']], ['泰語', ['th']],
    ['印尼语', ['id']], ['馬來語', ['ms']], ['马来文', ['ms']],
  ] as const)('finds the expected language variants for %s', (query, languages) => {
    expect(matchingLanguages(query)).toEqual(languages)
  })

  it('inherits broad language aliases while keeping region names specific', () => {
    expect(matchingLanguages('英語')).toEqual(['en', 'en-GB', 'en-US'])
    expect(matchingLanguages('美式英語')).toEqual(['en-US'])
    expect(matchingLanguages('英式英语')).toEqual(['en-GB'])
  })

  it.each([
    ['US English', ['en-US']], ['U.S. English', ['en-US']], ['English (US)', ['en-US']],
    ['UK English', ['en-GB']], ['English (UK)', ['en-GB']], ['Farsi', ['fa']],
    ['にほんご', ['ja']], ['ニホンゴ', ['ja']], ['仏語', ['fr']], ['独語', ['de']],
    ['伊語', ['it']], ['露語', ['ru']], ['米語', ['en-US']], ['英国英語', ['en-GB']],
    ['한국말', ['ko']], ['불어', ['fr']], ['독어', ['de']],
    ['미국영어', ['en-US']], ['영국식 영어', ['en-GB']],
    ['Bahasa Indonesia', ['id']], ['Bahasa Melayu', ['ms']],
  ] as const)('searches non-Chinese aliases with %s', (query, languages) => {
    expect(matchingLanguages(query)).toEqual(languages)
  })

  it('finds Japanese by its short Korean name alongside partial-name matches', () => {
    expect(matchingLanguages('일어')).toContain('ja')
  })

  it('keeps Traditional and Simplified Chinese aliases separate', () => {
    for (const query of ['繁中', '繁體', '繁体', '正體', '正体', '繁体字', '繁體字', '번체자', '번체중국어']) {
      expect(matchingLanguages(query)).toEqual(['zh-Hant'])
    }
    for (const query of ['簡中', '简中', '簡體', '简体', '簡体字', '간체자', '간체중국어']) {
      expect(matchingLanguages(query)).toEqual(['zh-Hans'])
    }
    expect(matchingLanguages('漢語')).toEqual(['zh', 'zh-Hans', 'zh-Hant'])
  })
})
