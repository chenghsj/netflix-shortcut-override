import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  SEEK_LIMITS,
  SPEED_LIMITS,
  findBindingConflict,
  formatKeyBinding,
  getKeyBindingLabels,
  normalizeSeekSettings,
  normalizeSpeedSettings,
  resolveNextPlaybackRate,
} from '@/shared/shortcuts'

describe('shortcut settings', () => {
  it('uses the planned speed defaults', () => {
    expect(DEFAULT_SETTINGS.speed).toEqual({
      min: 0.25,
      max: 3,
      step: 0.25,
      hold: 2,
    })
    expect(DEFAULT_SETTINGS.seek).toEqual({
      seconds: 10,
    })
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
      hold: 2,
    })
    expect(normalizeSpeedSettings({ step: 8 }).step).toBe(4)
  })

  it('normalizes long-press Space speed independently', () => {
    expect(normalizeSpeedSettings({ hold: 2.35 }).hold).toBe(2.35)
    expect(normalizeSpeedSettings({ hold: 0.5 }).hold).toBe(0.5)
    expect(normalizeSpeedSettings({ hold: 0.1 }).hold).toBe(0.25)
    expect(normalizeSpeedSettings({ hold: 8 }).hold).toBe(4)
  })

  it('normalizes seek seconds into safe whole-second bounds', () => {
    expect(SEEK_LIMITS.seconds.inputStep).toBe(1)
    expect(normalizeSeekSettings({ seconds: 15.4 }).seconds).toBe(15)
    expect(normalizeSeekSettings({ seconds: 0 }).seconds).toBe(1)
    expect(normalizeSeekSettings({ seconds: 180 }).seconds).toBe(60)
  })

  it('uses the configured step and clamps playback rate', () => {
    expect(resolveNextPlaybackRate(1, 1, { min: 0.25, max: 1.1, step: 0.05, hold: 2 })).toBe(1.05)
    expect(resolveNextPlaybackRate(1.09, 1, { min: 0.25, max: 1.1, step: 0.05, hold: 2 })).toBe(1.1)
    expect(resolveNextPlaybackRate(1, -1, { min: 0.25, max: 3, step: 1.5, hold: 2 })).toBe(0.25)
  })

  it('does not skip across 1x when the speed step is large', () => {
    const speed = { min: 0.25, max: 3, step: 1.5, hold: 2 }

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
