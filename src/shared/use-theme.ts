import { useEffect, useState } from 'react'

import type { ThemeMode } from '@/shared/shortcut-types'

export type ResolvedTheme = 'light' | 'dark'

const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)'

export const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }

  return window.matchMedia(DARK_MODE_MEDIA_QUERY).matches ? 'dark' : 'light'
}

export const resolveTheme = (
  theme: ThemeMode,
  systemTheme: ResolvedTheme = getSystemTheme()
): ResolvedTheme => (theme === 'auto' ? systemTheme : theme)

export const applyTheme = (theme: ResolvedTheme) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

export const useTheme = (theme: ThemeMode) => {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY)
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light')
    }

    updateSystemTheme()
    if (theme !== 'auto') return

    mediaQuery.addEventListener?.('change', updateSystemTheme)
    return () => mediaQuery.removeEventListener?.('change', updateSystemTheme)
  }, [theme])

  useEffect(() => {
    applyTheme(resolveTheme(theme, systemTheme))
  }, [systemTheme, theme])
}
