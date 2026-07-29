import { describe, expect, it } from 'vitest'

import {
  findBindingConflict,
  findRemappedNetflixNativeActionForKey,
  formatKeyBinding,
  getKeyBindingLabels,
} from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'

describe('shortcut bindings', () => {
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

  it('can ignore browser-unsupported actions when checking conflicts', () => {
    const conflict = findBindingConflict(
      DEFAULT_SETTINGS,
      'playPause',
      DEFAULT_SETTINGS.bindings.pictureInPicture.key,
      { ignoredActions: ['pictureInPicture'] }
    )

    expect(conflict).toBeNull()
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
