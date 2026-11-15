import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { SubtitleFavoritesCard } from './subtitle-favorites-card'
import type { SubtitleFavorite } from '@/shared/subtitle-favorites'
import type { Locale } from '@/shared/shortcut-types'
import { getCopy } from '@/shared/i18n'

function Favorites({ initial = [], locale = 'zh-TW' }: { initial?: SubtitleFavorite[]; locale?: Locale }) {
  const [favorites, setFavorites] = useState<SubtitleFavorite[]>(initial)
  return <SubtitleFavoritesCard favorites={favorites} locale={locale} onChange={setFavorites} />
}

describe('subtitle language selection', () => {
  it.each([
    ['en', 'Japanese', 'Korean'], ['zh-TW', '日文', '韓文'], ['zh-CN', '日语', '韩语'],
    ['ja', '日本語', '韓国語'], ['ko', '일본어', '한국어'],
  ] as const)('finds translated names and common aliases in %s', async (locale, japaneseLabel, koreanLabel) => {
    render(<Favorites locale={locale} />)
    fireEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('textbox', { name: getCopy(locale).subtitleFavorites.search })
    for (const query of ['Japanese', '日文', '日語', '日语', '日本語', 'にほんご', '일본어', '일어', 'ja', 'ＪＡＰＡＮＥＳＥ']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('checkbox', { name: `${japaneseLabel} (ja)` })).toBeVisible()
      expect(screen.queryByRole('checkbox', { name: /使用語言代碼|Use language code/ })).not.toBeInTheDocument()
    }
    for (const query of ['韓文', '韩文', '韓語', '韩语', '한국말']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('checkbox', { name: `${koreanLabel} (ko)` })).toBeVisible()
    }
  })

  it('keeps one pending selection when searching English, Japanese and Korean aliases', async () => {
    render(<Favorites locale="en" />)
    fireEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('textbox', { name: 'Language name or code' })
    fireEvent.change(search, { target: { value: 'US English' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'American English (en-US)' }))
    for (const query of ['米語', '미국영어']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getAllByRole('checkbox')).toHaveLength(1)
      expect(screen.getByRole('checkbox', { name: 'American English (en-US)' })).toBeChecked()
      expect(screen.getByRole('combobox')).toHaveTextContent('1 selected')
    }
  })

  it('keeps aliases attached to one language when selecting and adding favorites', async () => {
    render(<Favorites />)
    fireEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('textbox', { name: '語言名稱或代碼' })
    fireEvent.change(search, { target: { value: '日語' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '日文 (ja)' }))
    fireEvent.change(search, { target: { value: '日本語' } })
    expect(screen.getByRole('checkbox', { name: '日文 (ja)' })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '加入（1）' }))
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['日文'])
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.change(await screen.findByRole('textbox', { name: '語言名稱或代碼' }), { target: { value: '日語' } })
    const saved = screen.getByRole('checkbox', { name: '日文 (ja)' })
    expect(saved).toBeChecked()
    expect(saved).toBeDisabled()
  })

  it('also searches native names of languages without an interface translation', async () => {
    render(<Favorites locale="en" />)
    fireEvent.click(screen.getByRole('combobox'))
    const search = await screen.findByRole('textbox', { name: 'Language name or code' })
    for (const [query, label] of [['Deutsch', 'German (de)'], ['français', 'French (fr)'], ['español', 'Spanish (es)']]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('checkbox', { name: label })).toBeVisible()
    }
  })

  it('hides unnamed codes and allows a normalized custom code to be added without duplicates', async () => {
    render(<Favorites />)
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    expect(screen.queryByRole('checkbox', { name: 'ab' })).not.toBeInTheDocument()
    const search = await screen.findByPlaceholderText('語言名稱或代碼')
    for (const query of ['zh-TW', 'zh-tw', 'zh_TW']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByRole('checkbox', { name: '繁體中文 (zh-Hant)' })).toBeInTheDocument()
      expect(screen.queryByRole('checkbox', { name: /使用語言代碼/ })).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: 'not a code' } })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: ' QAA_latn_tw ' } })
    fireEvent.click(await screen.findByRole('checkbox', { name: '使用語言代碼「qaa-Latn-TW」' }))
    expect(trigger).toHaveTextContent('已選 1 種語言')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '加入（1）' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(trigger)
    fireEvent.change(await screen.findByPlaceholderText('語言名稱或代碼'), { target: { value: 'qaa-latn-tw' } })
    const added = await screen.findByRole('checkbox', { name: '使用語言代碼「qaa-Latn-TW」' })
    expect(added).toBeChecked()
    expect(added).toBeDisabled()
    expect(screen.getByRole('button', { name: '加入' })).toBeDisabled()
  })

  it('keeps multiple selections across searches and commits them together in selection order', async () => {
    render(<Favorites initial={[{ language: 'tr' }]} />)
    const trigger = screen.getByRole('combobox', { name: '字幕語言' })
    fireEvent.click(trigger)
    const search = await screen.findByRole('textbox', { name: '語言名稱或代碼' })
    const existing = screen.getByRole('checkbox', { name: '土耳其文 (tr)' })
    expect(existing).toBeDisabled()
    expect(existing).toBeChecked()
    fireEvent.change(search, { target: { value: 'Japanese' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '日文 (ja)' }))
    fireEvent.change(search, { target: { value: 'English' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /^英文 \(en\)$/ }))
    expect(trigger).toHaveTextContent('已選 2 種語言')
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.click(screen.getByRole('checkbox', { name: /^英文 \(en\)$/ }))
    expect(trigger).toHaveTextContent('已選 1 種語言')
    fireEvent.click(screen.getByRole('checkbox', { name: /^英文 \(en\)$/ }))
    fireEvent.keyDown(search, { key: 'Escape', code: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('已選 2 種語言')
    fireEvent.click(trigger)
    expect(screen.getByRole('checkbox', { name: '日文 (ja)' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /^英文 \(en\)$/ })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '加入（2）' }))
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['土耳其文', '日文', '英文'])
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveTextContent('選擇語言')
    expect(screen.getByRole('button', { name: '加入' })).toBeDisabled()
  })

  it('limits pending selections to the remaining slots and allows deselecting at the limit', async () => {
    const initial = ['ar', 'bg', 'cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 'hu', 'id', 'it', 'ko', 'nl', 'pt', 'sv']
      .map(language => ({ language }))
    render(<Favorites initial={initial} />)
    const trigger = screen.getByRole('combobox', { name: '字幕語言' })
    fireEvent.click(trigger)
    const search = await screen.findByRole('textbox', { name: '語言名稱或代碼' })
    fireEvent.change(search, { target: { value: 'Japanese' } })
    fireEvent.click(screen.getByRole('checkbox', { name: '日文 (ja)' }))
    fireEvent.change(search, { target: { value: 'Turkish' } })
    expect(screen.getByRole('checkbox', { name: '土耳其文 (tr)' })).toBeDisabled()
    expect(screen.getAllByRole('listitem')).toHaveLength(19)
    fireEvent.change(search, { target: { value: 'Japanese' } })
    const japanese = screen.getByRole('checkbox', { name: '日文 (ja)' })
    expect(japanese).toBeEnabled()
    fireEvent.click(japanese)
    fireEvent.change(search, { target: { value: 'Turkish' } })
    const turkish = screen.getByRole('checkbox', { name: '土耳其文 (tr)' })
    expect(turkish).toBeEnabled()
    fireEvent.click(turkish)
    fireEvent.click(screen.getByRole('button', { name: '加入（1）' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    expect(trigger).toBeDisabled()
    expect(screen.getByRole('button', { name: '加入' })).toBeDisabled()
  })
})
