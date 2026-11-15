import { useEffect, type RefObject } from 'react'

import { isApplePlatform } from '@/shared/shortcut-bindings'

export function useSearchShortcut(input: RefObject<HTMLInputElement | null>) {
  const apple = isApplePlatform()

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.altKey || event.shiftKey) return
      if (event.code !== 'KeyK' && event.key.toLowerCase() !== 'k') return
      if (event.metaKey !== apple || event.ctrlKey !== !apple) return
      if (event.target instanceof Element && event.target.closest('[role="dialog"], [role="alertdialog"], [data-slot="shortcut-recording"]')) return
      if (!input.current) return

      event.preventDefault()
      input.current.focus()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [apple, input])

  return { label: apple ? '⌘ K' : 'Ctrl K', ariaKeyShortcuts: apple ? 'Meta+K' : 'Control+K' }
}
