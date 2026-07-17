import { afterEach, beforeAll, beforeEach, vi } from 'vitest'

import { DEFAULT_SETTINGS } from '@/shared/shortcuts'
import { saveSettings } from '@/shared/storage'

export function setupContentIndexTests() {
  beforeAll(async () => {
    await import('@/content/index')
  })

  beforeEach(async () => {
    window.history.replaceState(null, '', '/watch/123')
    document.body.innerHTML = ''
    await saveSettings(DEFAULT_SETTINGS)
  })

  afterEach(() => {
    window.dispatchEvent(
      new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true,
      })
    )
    vi.useRealTimers()
  })
}
