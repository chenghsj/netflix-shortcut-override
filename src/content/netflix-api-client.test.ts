import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NETFLIX_API_BRIDGE_READY_ATTR } from '@/shared/netflix-api-events'

import { sendNetflixApi } from './netflix-api-client'

describe('Netflix API client', () => {
  beforeEach(() => {
    document.documentElement.setAttribute(NETFLIX_API_BRIDGE_READY_ATTR, 'ready')
    vi.useFakeTimers()
    vi.spyOn(window, 'dispatchEvent').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.documentElement.removeAttribute(NETFLIX_API_BRIDGE_READY_ATTR)
  })

  it('does not replay a timed-out seek through the background API', async () => {
    const responsePromise = sendNetflixApi('seek', 10_000)

    await vi.advanceTimersByTimeAsync(160)

    await expect(responsePromise).resolves.toEqual({
      success: false,
      error: 'No page bridge response.',
    })
    expect(chrome.runtime.sendMessage).not.toHaveBeenCalled()
  })
})
