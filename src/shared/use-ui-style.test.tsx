import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { useTheme } from '@/shared/use-theme'
import { useUiStyle } from '@/shared/use-ui-style'
import { UI_STYLES, type UiStyle } from '@/shared/ui-styles'
import type { ThemeMode } from '@/shared/shortcut-types'

function Appearance({ uiStyle, theme }: { uiStyle: UiStyle; theme: ThemeMode }) {
  useTheme(theme)
  useUiStyle(uiStyle)
  return null
}

describe('UI style application', () => {
  afterEach(() => {
    delete document.documentElement.dataset.uiStyle
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = ''
  })

  it.each(UI_STYLES)('keeps brightness independent of the %s style', uiStyle => {
    const view = render(<Appearance uiStyle={uiStyle} theme="dark" />)
    expect(document.documentElement).toHaveAttribute('data-ui-style', uiStyle)
    expect(document.documentElement).toHaveClass('dark')
    view.rerender(<Appearance uiStyle={uiStyle} theme="light" />)
    expect(document.documentElement).toHaveAttribute('data-ui-style', uiStyle)
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('updates the style without changing the selected brightness', () => {
    const view = render(<Appearance uiStyle="neobrutalism" theme="dark" />)
    view.rerender(<Appearance uiStyle="classic" theme="dark" />)
    expect(document.documentElement).toHaveAttribute('data-ui-style', 'classic')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})
