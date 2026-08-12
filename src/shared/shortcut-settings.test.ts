import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  HOLD_SPEED_LIMITS,
  SEEK_LIMITS,
  SPEED_LIMITS,
  normalizeHoldSpeedSettings,
  normalizeSeekSettings,
  normalizePipSettings,
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
      preferred: 1.5,
    })
    expect(DEFAULT_SETTINGS.holdSpeed).toEqual({
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
    expect(normalized.version).toBe(10)
  })

  it('adds the subtitle toggle binding when normalizing older settings', () => {
    const olderBindings = Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS.bindings).filter(
        ([action]) => action !== 'toggleSubtitles'
      )
    )
    const normalized = normalizeSettings({
      version: 8,
      bindings: olderBindings,
    })

    expect(normalized.bindings.toggleSubtitles).toEqual(
      DEFAULT_SETTINGS.bindings.toggleSubtitles
    )
    expect(normalized.bindings.toggleSubtitles.key.code).toBe('KeyC')
  })

  it('disables the migrated subtitle binding when C is already assigned', () => {
    const normalized = normalizeSettings({
      version: 8,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        toggleSubtitles: undefined,
        fullscreen: {
          enabled: true,
          key: DEFAULT_SETTINGS.bindings.toggleSubtitles.key,
        },
      },
    })

    expect(normalized.bindings.fullscreen).toEqual({
      enabled: true,
      key: DEFAULT_SETTINGS.bindings.toggleSubtitles.key,
    })
    expect(normalized.bindings.toggleSubtitles).toEqual({
      enabled: false,
      key: DEFAULT_SETTINGS.bindings.toggleSubtitles.key,
    })
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
      preferred: 1.5,
    })
    expect(normalizeSpeedSettings({ step: 8 }).step).toBe(4)
  })

  it('normalizes preferred and hold speeds independently', () => {
    expect(normalizeSpeedSettings({ preferred: 2.35 }).preferred).toBe(2.35)
    expect(normalizeSpeedSettings({ preferred: 0.1 }).preferred).toBe(0.25)
    expect(normalizeSpeedSettings({ preferred: 8 }).preferred).toBe(4)
    expect(HOLD_SPEED_LIMITS.speed.inputStep).toBe(0.05)
    expect(normalizeHoldSpeedSettings({ enabled: false, speed: 2.35 })).toEqual({
      enabled: false,
      speed: 2.35,
      showHint: true,
    })
    expect(normalizeHoldSpeedSettings({ speed: 0.1 }).speed).toBe(0.25)
    expect(normalizeHoldSpeedSettings({ speed: 8 }).speed).toBe(4)
  })

  it('migrates legacy hold-speed settings and adds the preferred speed', () => {
    const normalized = normalizeSettings({
      version: 9,
      spaceHold: { enabled: false, speed: 2.35, showHint: false },
      speed: { min: 0.25, max: 3, step: 0.25, hold: 2.35 },
    })

    expect(normalized.holdSpeed).toEqual({ enabled: false, speed: 2.35, showHint: false })
    expect(normalized.speed.preferred).toBe(1.5)
    expect(normalized).not.toHaveProperty('spaceHold')
  })

  it('disables the new preferred-speed binding when its default key is already assigned', () => {
    const normalized = normalizeSettings({
      version: 9,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        setPreferredSpeed: undefined,
        fullscreen: {
          enabled: true,
          key: DEFAULT_SETTINGS.bindings.setPreferredSpeed.key,
        },
      },
    })

    expect(normalized.bindings.setPreferredSpeed).toEqual({
      enabled: false,
      key: DEFAULT_SETTINGS.bindings.setPreferredSpeed.key,
    })
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
