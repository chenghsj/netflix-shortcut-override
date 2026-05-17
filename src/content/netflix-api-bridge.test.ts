import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'

type BridgeResponse = {
  id?: string
  success?: boolean
  result?: {
    playerApiFound?: boolean
    playerFound?: boolean
    seekCalled?: boolean
    currentTime?: number
    targetTime?: number
  }
}

const callBridge = (action: string, value?: number): BridgeResponse | null => {
  const id = `test-${action}-${value ?? 'none'}`
  let response: BridgeResponse | null = null
  const handleResponse = (event: Event) => {
    const detail = 'detail' in event ? (event.detail as BridgeResponse) : null
    if (detail?.id === id) response = detail
  }

  window.addEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
  window.dispatchEvent(
    new CustomEvent(NETFLIX_API_REQUEST_EVENT, {
      detail: { source: 'shortcut-override', id, action, value },
    })
  )
  window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)

  return response
}

describe('main-world Netflix API bridge', () => {
  beforeAll(async () => {
    await import('@/content/netflix-api-bridge')
  })

  beforeEach(() => {
    document.body.innerHTML = ''
    delete (window as typeof window & { netflix?: unknown }).netflix
  })

  it('marks the DOM when the page bridge is ready', () => {
    expect(document.documentElement.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR)).toBe('ready')
  })

  it('uses the Netflix player seek API without mutating native video time', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)
    const seek = vi.fn()

    Object.assign(window, {
      netflix: {
        appContext: {
          state: {
            playerApp: {
              getAPI: () => ({
                videoPlayer: {
                  getAllPlayerSessionIds: () => ['session-id'],
                  getVideoPlayerBySessionId: () => ({
                    seek,
                    getCurrentTime: () => 30000,
                  }),
                },
              }),
            },
          },
        },
      },
    })

    const response = callBridge('seek', 10000)

    expect(seek).toHaveBeenCalledWith(40000)
    expect(video.currentTime).toBe(30)
    expect(response?.success).toBe(true)
    expect(response?.result?.playerApiFound).toBe(true)
    expect(response?.result?.playerFound).toBe(true)
    expect(response?.result?.seekCalled).toBe(true)
    expect(response?.result?.currentTime).toBe(30000)
    expect(response?.result?.targetTime).toBe(40000)
  })

  it('reports missing Netflix player API without native seek fallback', () => {
    const video = document.createElement('video')
    video.currentTime = 30
    document.body.append(video)

    const response = callBridge('seek', -10000)

    expect(video.currentTime).toBe(30)
    expect(response?.success).toBe(true)
    expect(response?.result?.playerApiFound).toBe(false)
    expect(response?.result?.playerFound).toBe(false)
    expect(response?.result?.seekCalled).toBe(false)
  })
})
