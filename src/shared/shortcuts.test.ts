import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  SEEK_LIMITS,
  SPACE_HOLD_LIMITS,
  SPEED_LIMITS,
  findBindingConflict,
  findRemappedNetflixNativeActionForKey,
  formatKeyBinding,
  getKeyBindingLabels,
  normalizeSeekSettings,
  normalizeSpaceHoldSettings,
  normalizeSpeedSettings,
  normalizeSettings,
  resolveNextPlaybackRate,
} from '@/shared/shortcuts'

describe('shortcut settings', () => {
  it('uses the planned speed defaults', () => {
    expect(DEFAULT_SETTINGS.speed).toEqual({
      min: 0.25,
      max: 3,
      step: 0.25,
    })
    expect(DEFAULT_SETTINGS.spaceHold).toEqual({
      enabled: true,
      speed: 2,
    })
    expect(DEFAULT_SETTINGS.seek).toEqual({
      seconds: 10,
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
    expect(normalized.version).toBe(3)
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
    })
    expect(normalizeSpaceHoldSettings({ speed: 0.1 }).speed).toBe(0.25)
    expect(normalizeSpaceHoldSettings({ speed: 8 }).speed).toBe(4)
  })

  it('migrates the legacy long-press Space speed without changing its enabled state', () => {
    const normalized = normalizeSettings({
      version: 2,
      speed: { min: 0.25, max: 3, step: 0.25, hold: 2.35 },
    })

    expect(normalized.spaceHold).toEqual({ enabled: true, speed: 2.35 })
  })

  it('normalizes seek seconds into safe whole-second bounds', () => {
    expect(SEEK_LIMITS.seconds.inputStep).toBe(1)
    expect(normalizeSeekSettings({ seconds: 15.4 }).seconds).toBe(15)
    expect(normalizeSeekSettings({ seconds: 0 }).seconds).toBe(1)
    expect(normalizeSeekSettings({ seconds: 180 }).seconds).toBe(60)
  })

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

  it('detects duplicate keybindings', () => {
    const conflict = findBindingConflict(
      DEFAULT_SETTINGS,
      'seekForward',
      DEFAULT_SETTINGS.bindings.seekBackward.key
    )

    expect(conflict).toBe('seekBackward')
  })

  it('detects conflicts against disabled bindings before they can be re-enabled', () => {
    const conflict = findBindingConflict(
      {
        ...DEFAULT_SETTINGS,
        bindings: {
          ...DEFAULT_SETTINGS.bindings,
          playPause: {
            ...DEFAULT_SETTINGS.bindings.playPause,
            enabled: false,
          },
        },
      },
      'seekForward',
      DEFAULT_SETTINGS.bindings.playPause.key
    )

    expect(conflict).toBe('playPause')
  })

  it('identifies original Netflix keys for enabled actions that have been remapped', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        volumeUp: {
          ...DEFAULT_SETTINGS.bindings.volumeUp,
          key: { code: 'Equal', key: '+', ctrl: false, alt: false, shift: true, meta: false },
        },
      },
    }
    const originalVolumeUp = new KeyboardEvent('keydown', {
      code: 'ArrowUp',
      key: 'ArrowUp',
      bubbles: true,
      cancelable: true,
    })

    expect(findRemappedNetflixNativeActionForKey(settings, originalVolumeUp)).toBe('volumeUp')
    expect(
      findRemappedNetflixNativeActionForKey(
        {
          ...DEFAULT_SETTINGS,
          bindings: {
            ...DEFAULT_SETTINGS.bindings,
            playPause: {
              ...DEFAULT_SETTINGS.bindings.playPause,
              key: { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false },
            },
          },
        },
        new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter' })
      )
    ).toBe('playPause')
    expect(
      findRemappedNetflixNativeActionForKey(
        DEFAULT_SETTINGS,
        new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' })
      )
    ).toBeNull()
  })

  it('uses platform-native labels for the Meta modifier', () => {
    const binding = {
      code: 'KeyZ',
      key: 'z',
      ctrl: false,
      alt: false,
      shift: false,
      meta: true,
    }

    expect(getKeyBindingLabels(binding, { platform: 'macOS' })).toEqual(['⌘', 'Z'])
    expect(formatKeyBinding(binding, { platform: 'MacIntel' })).toBe('⌘ + Z')
    expect(getKeyBindingLabels(binding, { platform: 'Win32' })).toEqual(['Win', 'Z'])
    expect(getKeyBindingLabels(binding, { platform: 'Linux x86_64' })).toEqual(['Meta', 'Z'])
  })

  it('uses compact arrow glyphs for arrow key labels', () => {
    expect(getKeyBindingLabels(DEFAULT_SETTINGS.bindings.seekBackward.key)).toEqual(['←'])
    expect(getKeyBindingLabels(DEFAULT_SETTINGS.bindings.seekForward.key)).toEqual(['→'])
    expect(getKeyBindingLabels(DEFAULT_SETTINGS.bindings.volumeUp.key)).toEqual(['↑'])
    expect(getKeyBindingLabels(DEFAULT_SETTINGS.bindings.volumeDown.key)).toEqual(['↓'])
  })

  it('uses readable labels for common special keys', () => {
    const specialKey = (code: string, key: string) => ({
      code,
      key,
      ctrl: false,
      alt: false,
      shift: false,
      meta: false,
    })

    expect(getKeyBindingLabels(specialKey('PageUp', 'PageUp'))).toEqual(['PgUp'])
    expect(getKeyBindingLabels(specialKey('PageDown', 'PageDown'))).toEqual(['PgDn'])
    expect(getKeyBindingLabels(specialKey('Escape', 'Escape'))).toEqual(['Esc'])
    expect(getKeyBindingLabels(specialKey('Delete', 'Delete'))).toEqual(['Del'])
    expect(getKeyBindingLabels(specialKey('Insert', 'Insert'))).toEqual(['Ins'])
    expect(getKeyBindingLabels(specialKey('CapsLock', 'CapsLock'))).toEqual(['Caps'])
    expect(getKeyBindingLabels(specialKey('Backspace', 'Backspace'))).toEqual(['Backspace'])
    expect(getKeyBindingLabels(specialKey('Enter', 'Enter'))).toEqual(['Enter'])
    expect(getKeyBindingLabels(specialKey('NumpadEnter', 'Enter'))).toEqual(['Enter'])
    expect(getKeyBindingLabels(specialKey('Home', 'Home'))).toEqual(['Home'])
    expect(getKeyBindingLabels(specialKey('End', 'End'))).toEqual(['End'])
    expect(getKeyBindingLabels(specialKey('Tab', 'Tab'))).toEqual(['Tab'])
  })
})
