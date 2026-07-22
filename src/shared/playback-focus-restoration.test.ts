import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  isNetflixWatchUrl,
  restoreVisibleNetflixWatchPageFocus,
} from '@/shared/playback-focus-restoration'

describe('playback focus restoration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('recognizes only exact Netflix playback routes', () => {
    expect(isNetflixWatchUrl('https://www.netflix.com/watch/123')).toBe(true)
    expect(isNetflixWatchUrl('https://netflix.com/watch')).toBe(true)
    expect(isNetflixWatchUrl('https://www.netflix.com/watchlist')).toBe(false)
    expect(isNetflixWatchUrl('https://example.com/watch/123')).toBe(false)
  })

  it('focuses a visible Netflix playback page and verifies the result', () => {
    const focus = vi.fn()
    vi.stubGlobal('window', {
      location: { hostname: 'www.netflix.com', pathname: '/watch/123' },
      focus,
    })
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      hasFocus: vi.fn(() => true),
    })

    expect(restoreVisibleNetflixWatchPageFocus()).toBe(true)
    expect(focus).toHaveBeenCalledOnce()
  })

  it('does not focus a visible non-playback route', () => {
    const focus = vi.fn()
    vi.stubGlobal('window', {
      location: { hostname: 'www.netflix.com', pathname: '/watchlist' },
      focus,
    })
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      hasFocus: vi.fn(() => true),
    })

    expect(restoreVisibleNetflixWatchPageFocus()).toBe(false)
    expect(focus).not.toHaveBeenCalled()
  })

  it('does not focus a hidden Netflix playback page', () => {
    const focus = vi.fn()
    vi.stubGlobal('window', {
      location: { hostname: 'www.netflix.com', pathname: '/watch/123' },
      focus,
    })
    vi.stubGlobal('document', {
      visibilityState: 'hidden',
      hasFocus: vi.fn(() => true),
    })

    expect(restoreVisibleNetflixWatchPageFocus()).toBe(false)
    expect(focus).not.toHaveBeenCalled()
  })
})
