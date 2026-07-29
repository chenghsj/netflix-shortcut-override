import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from '@/shared/use-theme'

type ThemeHarnessProps = {
  theme: 'auto' | 'light' | 'dark'
}

function ThemeHarness({ theme }: ThemeHarnessProps) {
  useTheme(theme)
  return null
}

const originalMatchMedia = window.matchMedia

describe('useTheme', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    })
  })

  it('applies an explicit dark theme', () => {
    render(<ThemeHarness theme="dark" />)

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('updates an automatic theme when the system preference changes', () => {
    let matches = false
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      get matches() {
        return matches
      },
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn((_event: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener)
      }),
      removeEventListener: vi.fn(
        (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          listeners.delete(listener)
        }
      ),
    } as unknown as MediaQueryList

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => mediaQuery),
    })

    render(<ThemeHarness theme="auto" />)
    expect(document.documentElement).not.toHaveClass('dark')

    act(() => {
      matches = true
      for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
    })

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
