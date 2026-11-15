import { createEvent, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AudioFavorite } from '@/shared/audio-favorites'
import { AudioFavoritesCard } from './audio-favorites-card'

function Favorites({ initial = [] }: { initial?: AudioFavorite[] }) {
  const [favorites, setFavorites] = useState(initial)
  return <AudioFavoritesCard favorites={favorites} locale="en" onChange={setFavorites} />
}

describe('favorite audio editing', () => {
  const standard = { language: 'en', audioDescription: false }
  const description = { language: 'en', audioDescription: true }
  const japanese = { language: 'ja', audioDescription: false }

  it('selects standard and description tracks together without a mode switch', async () => {
    render(<Favorites />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    const trigger = screen.getByRole('combobox', { name: 'Audio tracks' })
    fireEvent.click(trigger)
    const search = await screen.findByRole('textbox', { name: 'Language name or code' })
    fireEvent.change(search, { target: { value: 'English' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'English (en)' }))
    fireEvent.change(search, { target: { value: '日語' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japanese (ja)' }))
    fireEvent.change(search, { target: { value: 'English' } })
    expect(screen.getByRole('checkbox', { name: 'English (en)' })).toBeChecked()
    const described = screen.getByRole('checkbox', { name: 'English (en) · Audio Description' })
    expect(described).not.toBeChecked()
    fireEvent.click(described)
    expect(trigger).toHaveTextContent('3 tracks selected')
    fireEvent.click(screen.getByRole('button', { name: 'Add (3)' }))
    expect(screen.getAllByRole('listitem').map(row => row.textContent)).toEqual([
      'English', 'Japanese', 'English · Audio Description',
    ])
    fireEvent.click(trigger)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Language name or code' }), { target: { value: 'English' } })
    for (const name of ['English (en)', 'English (en) · Audio Description']) {
      expect(screen.getByRole('checkbox', { name })).toBeDisabled()
      expect(screen.getByRole('checkbox', { name })).toBeChecked()
    }
  })

  it('offers both variants for a custom code and retains selections across searches', async () => {
    render(<Favorites />)
    const trigger = screen.getByRole('combobox', { name: 'Audio tracks' })
    fireEvent.click(trigger)
    const search = await screen.findByRole('textbox', { name: 'Language name or code' })
    fireEvent.change(search, { target: { value: ' QAA_latn_tw ' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use language code “qaa-Latn-TW”' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use language code “qaa-Latn-TW” · Audio Description' }))
    fireEvent.change(search, { target: { value: 'Japanese' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Japanese (ja)' }))
    fireEvent.change(search, { target: { value: 'qaa-latn-tw' } })
    expect(screen.getAllByRole('checkbox').every(checkbox => (checkbox as HTMLInputElement).checked)).toBe(true)
    fireEvent.keyDown(search, { key: 'Escape' })
    expect(trigger).toHaveTextContent('3 tracks selected')
    fireEvent.click(screen.getByRole('button', { name: 'Add (3)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getAllByRole('listitem')[1]).toHaveTextContent('Audio Description')
    fireEvent.click(trigger)
    fireEvent.change(await screen.findByRole('textbox', { name: 'Language name or code' }), { target: { value: 'qaa-Latn-TW' } })
    expect(screen.getAllByRole('checkbox').every(checkbox => (checkbox as HTMLInputElement).disabled)).toBe(true)
  })

  it('counts the two variants separately at the limit and allows deselecting a pending track', async () => {
    const initial = ['ar', 'bg', 'cs', 'da', 'de', 'el', 'es', 'fi', 'fr', 'he', 'hi', 'hu', 'id', 'it', 'ko', 'nl', 'pt', 'sv', 'tr']
      .map(language => ({ language, audioDescription: false }))
    render(<Favorites initial={initial} />)
    const trigger = screen.getByRole('combobox', { name: 'Audio tracks' })
    fireEvent.click(trigger)
    const search = await screen.findByRole('textbox', { name: 'Language name or code' })
    fireEvent.change(search, { target: { value: 'English' } })
    const standard = screen.getByRole('checkbox', { name: 'English (en)' })
    const described = screen.getByRole('checkbox', { name: 'English (en) · Audio Description' })
    fireEvent.click(standard)
    expect(described).toBeDisabled()
    expect(standard).toBeEnabled()
    fireEvent.click(standard)
    expect(described).toBeEnabled()
    fireEvent.click(described)
    fireEvent.click(screen.getByRole('button', { name: 'Add (1)' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(20)
    expect(trigger).toBeDisabled()
  })

  it('reorders variants independently with the keyboard and removes only the chosen variant', () => {
    render(<Favorites initial={[standard, description, japanese]} />)
    const handle = screen.getByRole('group', { name: 'Reorder English · Audio Description' })
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(screen.getAllByRole('listitem').map(row => row.textContent)).toEqual([
      'English · Audio Description', 'English', 'Japanese',
    ])
    expect(handle).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Remove English' }))
    expect(screen.getAllByRole('listitem').map(row => row.textContent)).toEqual([
      'English · Audio Description', 'Japanese',
    ])
  })

  it('previews drag reordering and commits the audio variant order on drop', () => {
    render(<Favorites initial={[standard, description, japanese]} />)
    const rows = screen.getAllByRole('listitem')
    rows.forEach((row, index) => vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({
      top: index * 40, left: 0, width: 300, height: 40, bottom: (index + 1) * 40,
    } as DOMRect))
    const handle = within(rows[0]).getByRole('group')
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn() }
    const start = createEvent.dragStart(handle, { dataTransfer })
    Object.defineProperty(start, 'clientY', { value: 20 })
    fireEvent(handle, start)
    const drop = createEvent.drop(rows[2], { dataTransfer })
    Object.defineProperty(drop, 'clientY', { value: 101 })
    fireEvent(rows[2], drop)
    expect(screen.getAllByRole('listitem').map(row => row.textContent)).toEqual([
      'English · Audio Description', 'Japanese', 'English',
    ])
  })
})
