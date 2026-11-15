import { useEffect, useEffectEvent, useState } from 'react'

import type { OptionsPage } from '@/shared/options-navigation'
import { isApplePlatform } from '@/shared/shortcut-bindings'

const shortcutsBlocked = (target: EventTarget | null) => {
  const element = target instanceof Element ? target : document.activeElement
  return Boolean(element?.closest('[role="dialog"]:not([data-sidebar="sidebar"]), [role="alertdialog"], [data-slot="shortcut-recording"]'))
}

export function useSidebarShortcuts(pages: readonly OptionsPage[], onSelect: (page: OptionsPage) => void) {
  const apple = isApplePlatform()
  const [showHints, setShowHints] = useState(false)
  const navigate = useEffectEvent((index: number, repeat: boolean) => {
    const page = pages[index]
    if (!page) return false
    if (!repeat) onSelect(page)
    return true
  })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const reset = () => {
      clearTimeout(timer)
      timer = undefined
      setShowHints(false)
    }
    const hasModifier = (event: KeyboardEvent) =>
      event.metaKey === apple && event.ctrlKey === !apple && !event.altKey && !event.shiftKey
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || !hasModifier(event) || shortcutsBlocked(event.target)) {
        reset()
        return
      }
      if (event.key === (apple ? 'Meta' : 'Control')) {
        if (!event.repeat && timer === undefined) timer = setTimeout(() => {
          if (!shortcutsBlocked(document.activeElement)) setShowHints(true)
        }, 300)
        return
      }
      const digit = event.code.match(/^(?:Digit|Numpad)([1-9])$/)?.[1]
        ?? (/^[1-9]$/.test(event.key) ? event.key : undefined)
      if (digit && navigate(Number(digit) - 1, event.repeat)) event.preventDefault()
      else reset()
    }
    const keyUp = (event: KeyboardEvent) => { if (!hasModifier(event)) reset() }
    const focusIn = (event: FocusEvent) => { if (shortcutsBlocked(event.target)) reset() }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', reset)
    document.addEventListener('focusin', focusIn)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', reset)
      document.removeEventListener('focusin', focusIn)
    }
  }, [apple])

  return { showHints, modifier: apple ? 'Meta' : 'Control' }
}
