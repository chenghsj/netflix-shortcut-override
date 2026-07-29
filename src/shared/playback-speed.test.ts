import { describe, expect, it } from 'vitest'

import { resolveNextPlaybackRate } from '@/shared/playback-speed'

describe('playback speed', () => {
  it('uses the configured step and clamps playback rate', () => {
    expect(resolveNextPlaybackRate(1, 1, { min: 0.25, max: 1.1, step: 0.05 })).toBe(1.05)
    expect(resolveNextPlaybackRate(1.09, 1, { min: 0.25, max: 1.1, step: 0.05 })).toBe(1.1)
    expect(resolveNextPlaybackRate(1, -1, { min: 0.25, max: 3, step: 1.5 })).toBe(0.25)
  })

  it('does not skip across 1x when the speed step is large', () => {
    const speed = { min: 0.25, max: 3, step: 1.5 }

    expect(resolveNextPlaybackRate(1, 1, speed)).toBe(2.5)
    expect(resolveNextPlaybackRate(2.5, -1, speed)).toBe(1)
    expect(resolveNextPlaybackRate(1.5, -1, speed)).toBe(1)
    expect(resolveNextPlaybackRate(0.25, 1, speed)).toBe(1)
  })
})
