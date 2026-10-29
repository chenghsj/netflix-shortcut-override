import { useLayoutEffect } from 'react'

import '@/styles/ui-themes'

import type { UiStyle } from '@/shared/shortcut-types'

export const applyUiStyle = (uiStyle: UiStyle) => {
  document.documentElement.dataset.uiStyle = uiStyle
}

export const useUiStyle = (uiStyle: UiStyle) => {
  useLayoutEffect(() => {
    applyUiStyle(uiStyle)
  }, [uiStyle])
}
