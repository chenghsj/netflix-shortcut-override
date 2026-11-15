import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useReorderAnimation } from './use-reorder-animation'

function List({ items }: { items: string[] }) {
  const ref = useReorderAnimation()
  return <ol ref={ref}>{items.map(item => <li key={item} ref={row => {
    if (row && !row.animate) row.animate = vi.fn(() => ({ cancel: vi.fn() }) as unknown as Animation)
  }}>{item}</li>)}</ol>
}

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
    return this.parentElement ? Array.from(this.parentElement.children).indexOf(this) * 40 : 0
  })
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('reorder animation', () => {
  it('animates existing rows from their previous positions and cleans up when unmounted', () => {
    const { rerender, unmount } = render(<List items={['a', 'b', 'c']} />)
    const first = screen.getByText('a')
    expect(first.animate).not.toHaveBeenCalled()
    rerender(<List items={['b', 'c', 'a']} />)
    expect(screen.getByText('a')).toBe(first)
    expect(first.animate).toHaveBeenCalledWith([
      { transform: 'translate(0px, -80px)' },
      { transform: 'translate(0, 0)' },
    ], expect.objectContaining({ duration: expect.any(Number) }))
    rerender(<List items={['b', 'c', 'a']} />)
    expect(first.animate).toHaveBeenCalledTimes(1)
    const animation = vi.mocked(first.animate).mock.results[0].value
    unmount()
    expect(animation.cancel).toHaveBeenCalled()
  })

  it('keeps the new order without animation when reduced motion is enabled', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
    const { rerender } = render(<List items={['a', 'b']} />)
    const first = screen.getByText('a')
    rerender(<List items={['b', 'a']} />)
    expect(screen.getAllByRole('listitem').map(row => row.textContent)).toEqual(['b', 'a'])
    expect(first.animate).not.toHaveBeenCalled()
  })
})
