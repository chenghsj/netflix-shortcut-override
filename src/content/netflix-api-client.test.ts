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

  it('uses the background in Firefox even when the DOM bridge marker exists', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 Firefox/143.0')
    const reply = { success: true, result: { seekCalled: true } }
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_message, callback) => {
      if (typeof callback === 'function') callback(reply)
      return Promise.resolve(reply) as never
    })
    await expect(sendNetflixApi('seek', 10_000)).resolves.toEqual(reply)
    expect(window.dispatchEvent).not.toHaveBeenCalled()
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'EXECUTE_NETFLIX_API', action: 'seek', value: 10_000,
    }, expect.any(Function))
  })
})
