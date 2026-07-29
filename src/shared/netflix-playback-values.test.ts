import { describe, expect, it } from 'vitest'

import {
  clampNetflixVolume,
  DEFAULT_NETFLIX_VOLUME,
  normalizeAudibleNetflixVolume,
  normalizeNetflixRestoreVolume,
} from './netflix-playback-values'

describe('Netflix playback values', () => {
  it('clamps finite volume values to the Netflix range and precision', () => {
    expect(clampNetflixVolume(-0.2)).toBe(0)
    expect(clampNetflixVolume(0.555)).toBe(0.56)
    expect(clampNetflixVolume(1.2)).toBe(1)
  })

  it('uses the default volume for non-finite values', () => {
    expect(clampNetflixVolume(Number.NaN)).toBe(DEFAULT_NETFLIX_VOLUME)
    expect(clampNetflixVolume(Number.POSITIVE_INFINITY)).toBe(DEFAULT_NETFLIX_VOLUME)
  })

  it('only treats positive normalized values as audible', () => {
    expect(normalizeAudibleNetflixVolume(0)).toBeNull()
    expect(normalizeAudibleNetflixVolume(-1)).toBeNull()
    expect(normalizeAudibleNetflixVolume(Number.NaN)).toBeNull()
    expect(normalizeAudibleNetflixVolume(0.456)).toBe(0.46)
  })

  it('restores a safe audible volume when the stored value is invalid or silent', () => {
    expect(normalizeNetflixRestoreVolume(0)).toBe(DEFAULT_NETFLIX_VOLUME)
    expect(normalizeNetflixRestoreVolume(-1)).toBe(DEFAULT_NETFLIX_VOLUME)
    expect(normalizeNetflixRestoreVolume(Number.NaN)).toBe(DEFAULT_NETFLIX_VOLUME)
    expect(normalizeNetflixRestoreVolume(0.456)).toBe(0.46)
  })
})
