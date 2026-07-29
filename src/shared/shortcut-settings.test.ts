import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  SEEK_LIMITS,
  SPACE_HOLD_LIMITS,
  SPEED_LIMITS,
  normalizeSeekSettings,
  normalizePipSettings,
  normalizeSpaceHoldSettings,
  normalizeSpeedSettings,
  normalizeSettings,
} from '@/shared/shortcut-settings'

describe('shortcut settings', () => {
  it('uses the planned speed defaults', () => {
    expect(DEFAULT_SETTINGS.locale).toBe('auto')
    expect(DEFAULT_SETTINGS.theme).toBe('auto')
    expect(DEFAULT_SETTINGS.speed).toEqual({
      min: 0.25,
      max: 3,
      step: 0.25,
    })
    expect(DEFAULT_SETTINGS.spaceHold).toEqual({
      enabled: true,
      speed: 2,
      showHint: true,
    })
    expect(DEFAULT_SETTINGS.seek).toEqual({
      seconds: 10,
    })
    expect(DEFAULT_SETTINGS.pip).toEqual({
      subtitlesEnabled: true,
      subtitleSize: 'medium',
      subtitleBackground: 'translucent',
    })
  })

  it('adds the PiP binding when normalizing settings saved before the feature existed', () => {
    const normalized = normalizeSettings({
      bindings: {
        playPause: DEFAULT_SETTINGS.bindings.playPause,
      },
    })

    expect(normalized.bindings.pictureInPicture).toEqual(
      DEFAULT_SETTINGS.bindings.pictureInPicture
    )
  })

  it('migrates the earlier Shift+W PiP default to Shift+P once', () => {
    const normalized = normalizeSettings({
      bindings: {
        pictureInPicture: {
          enabled: true,
          key: {
            code: 'KeyW',
            key: 'W',
            ctrl: false,
            alt: false,
            shift: true,
            meta: false,
          },
        },
      },
    })

    expect(normalized.bindings.pictureInPicture.key).toEqual(
      DEFAULT_SETTINGS.bindings.pictureInPicture.key
    )
    expect(normalized.version).toBe(8)
  })

  it('defaults unknown or missing theme values to automatic mode', () => {
    expect(normalizeSettings({}).theme).toBe('auto')
    expect(normalizeSettings({ theme: 'sepia' }).theme).toBe('auto')
    expect(normalizeSettings({ theme: 'dark' }).theme).toBe('dark')
  })

  it('defaults unknown or missing locale values to automatic mode', () => {
    expect(normalizeSettings({}).locale).toBe('auto')
    expect(normalizeSettings({ locale: 'fr' }).locale).toBe('auto')
    expect(normalizeSettings({ locale: 'zh-TW' }).locale).toBe('zh-TW')
  })

  it('keeps a custom Shift+W PiP binding after settings are versioned', () => {
    const customBinding = {
      code: 'KeyW',
      key: 'W',
      ctrl: false,
      alt: false,
      shift: true,
      meta: false,
    }

    const normalized = normalizeSettings({
      version: 2,
      bindings: {
        pictureInPicture: {
          enabled: true,
          key: customBinding,
        },
      },
    })

    expect(normalized.bindings.pictureInPicture.key).toEqual(customBinding)
  })

  it('keeps the speed input precision at 0.05 while default step is 0.25', () => {
    expect(SPEED_LIMITS.step.inputStep).toBe(0.05)
    expect(SPEED_LIMITS.step.max).toBe(4)
    expect(normalizeSpeedSettings({ step: 0.35 }).step).toBe(0.35)
    expect(normalizeSpeedSettings({ step: 3.5 }).step).toBe(3.5)
  })

  it('normalizes speed min max and step into safe bounds', () => {
    expect(normalizeSpeedSettings({ min: 0.1, max: 8, step: 0.001 })).toEqual({
      min: 0.25,
      max: 4,
      step: 0.05,
    })
    expect(normalizeSpeedSettings({ step: 8 }).step).toBe(4)
  })

  it('normalizes long-press Space settings independently', () => {
    expect(SPACE_HOLD_LIMITS.speed.inputStep).toBe(0.05)
    expect(normalizeSpaceHoldSettings({ enabled: false, speed: 2.35 })).toEqual({
      enabled: false,
      speed: 2.35,
      showHint: true,
    })
    expect(normalizeSpaceHoldSettings({ speed: 0.1 }).speed).toBe(0.25)
    expect(normalizeSpaceHoldSettings({ speed: 8 }).speed).toBe(4)
  })

  it('migrates the legacy long-press Space speed without changing its enabled state', () => {
    const normalized = normalizeSettings({
      version: 2,
      speed: { min: 0.25, max: 3, step: 0.25, hold: 2.35 },
    })

    expect(normalized.spaceHold).toEqual({ enabled: true, speed: 2.35, showHint: true })
  })

  it('normalizes seek seconds into safe whole-second bounds', () => {
    expect(SEEK_LIMITS.seconds.inputStep).toBe(1)
    expect(normalizeSeekSettings({ seconds: 15.4 }).seconds).toBe(15)
    expect(normalizeSeekSettings({ seconds: 0 }).seconds).toBe(1)
    expect(normalizeSeekSettings({ seconds: 180 }).seconds).toBe(60)
  })

  it('normalizes persisted PiP subtitle preferences', () => {
    expect(normalizePipSettings(undefined)).toEqual({
      subtitlesEnabled: true,
      subtitleSize: 'medium',
      subtitleBackground: 'translucent',
    })
    expect(
      normalizePipSettings({
        subtitlesEnabled: false,
        subtitleSize: 'large',
        subtitleBackground: 'dark',
      })
    ).toEqual({
      subtitlesEnabled: false,
      subtitleSize: 'large',
      subtitleBackground: 'dark',
    })
    expect(normalizePipSettings({ subtitleSize: 'unknown' as never }).subtitleSize).toBe('medium')
    expect(
      normalizePipSettings({ subtitleBackground: 'unknown' as never }).subtitleBackground
    ).toBe('translucent')
  })
})
