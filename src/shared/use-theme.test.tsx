import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useTheme } from '@/shared/use-theme'

type ThemeHarnessProps = {
  theme: 'auto' | 'light' | 'dark'
}

function ThemeHarness({ theme }: ThemeHarnessProps) {
  const resolvedTheme = useTheme(theme)
  return <output>{resolvedTheme}</output>
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
    expect(screen.getByText('dark')).toBeInTheDocument()
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
    expect(screen.getByText('light')).toBeInTheDocument()

    act(() => {
      matches = true
      for (const listener of listeners) listener({ matches } as MediaQueryListEvent)
    })

    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(screen.getByText('dark')).toBeInTheDocument()
  })

  it('keeps an explicit choice when system preference changes', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      matches: true,
      addEventListener: vi.fn((_event: string, callback: (event: MediaQueryListEvent) => void) => { listeners.add(callback) }),
      removeEventListener: vi.fn((_event: string, callback: (event: MediaQueryListEvent) => void) => { listeners.delete(callback) }),
    }
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => mediaQuery) })
    render(<ThemeHarness theme="light" />)
    expect(screen.getByText('light')).toBeInTheDocument()
    expect(mediaQuery.addEventListener).not.toHaveBeenCalled()
    act(() => { mediaQuery.matches = false; for (const listener of listeners) listener({ matches: false } as MediaQueryListEvent) })
    act(() => { mediaQuery.matches = true; for (const listener of listeners) listener({ matches: true } as MediaQueryListEvent) })
    expect(screen.getByText('light')).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('removes the system listener when automatic mode becomes manual', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const mediaQuery = {
      matches: false,
      addEventListener: vi.fn((_event: string, callback: (event: MediaQueryListEvent) => void) => { listeners.add(callback) }),
      removeEventListener: vi.fn((_event: string, callback: (event: MediaQueryListEvent) => void) => { listeners.delete(callback) }),
    }
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => mediaQuery) })
    const view = render(<ThemeHarness theme="auto" />)
    expect(listeners.size).toBe(1)

    view.rerender(<ThemeHarness theme="light" />)
    expect(listeners.size).toBe(0)
    expect(mediaQuery.removeEventListener).toHaveBeenCalledOnce()
    act(() => { mediaQuery.matches = true; for (const listener of listeners) listener({ matches: true } as MediaQueryListEvent) })
    expect(screen.getByText('light')).toBeInTheDocument()
    expect(document.documentElement).not.toHaveClass('dark')
  })
})
