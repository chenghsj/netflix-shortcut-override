import { describe, expect, it } from 'vitest'

import {
  findActionForKey,
  findRemappedNetflixNativeActionForKey,
  formatKeyBinding,
  getKeyBindingLabels,
  getReplacedNetflixNativeKeyBindings,
  isKeyBinding,
  keyBindingFromEvent,
  keyBindingsEqual,
} from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'

describe('shortcut bindings', () => {
  it.each([
    ['MediaNextTrack', 'MediaTrackNext'], ['MediaPreviousTrack', 'MediaTrackPrevious'],
    ['VolumeUp', 'AudioVolumeUp'], ['VolumeDown', 'AudioVolumeDown'], ['VolumeMute', 'AudioVolumeMute'],
    ['BrowserBack', 'BrowserBack'], ['BrowserForward', 'BrowserForward'],
  ])('records %s and matches its canonical identity %s', (key, canonical) => {
    for (const code of ['', 'Unidentified', key]) {
      const binding = keyBindingFromEvent(new KeyboardEvent('keydown', { code, key }))
      expect(binding.code).toBe(canonical)
      expect(isKeyBinding(binding)).toBe(true)
      const settings = structuredClone(DEFAULT_SETTINGS)
      settings.bindings.nextEpisode.key = binding
      expect(findActionForKey(settings, new KeyboardEvent('keydown', { code: canonical, key: canonical }))).toBe('nextEpisode')
      expect(keyBindingsEqual(binding, { ...binding, code: canonical, key: canonical })).toBe(true)
      expect(keyBindingsEqual(binding, { ...binding, ctrl: true })).toBe(false)
    }
    expect(keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'F9', key })).code).toBe('F9')
  })

  it.each(['', 'Unidentified'])('normalizes code %j for media keys during recording and playback', code => {
    const next = keyBindingFromEvent(new KeyboardEvent('keydown', { code, key: 'MediaTrackNext' }))
    const previous = keyBindingFromEvent(new KeyboardEvent('keydown', { code, key: 'MediaTrackPrevious' }))
    expect(next.code).toBe('MediaTrackNext')
    expect(previous.code).toBe('MediaTrackPrevious')
    expect(isKeyBinding(next)).toBe(true)
    expect(keyBindingsEqual(next, previous)).toBe(false)
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.nextEpisode.key = next
    expect(findActionForKey(settings, new KeyboardEvent('keydown', { code: 'MediaTrackNext', key: 'MediaTrackNext' }))).toBe('nextEpisode')
    expect(findActionForKey(settings, new KeyboardEvent('keydown', { code, key: 'MediaTrackNext' }))).toBe('nextEpisode')
    expect(findActionForKey(settings, new KeyboardEvent('keydown', { code, key: 'MediaTrackPrevious' }))).toBeNull()
    expect(findActionForKey(settings, new KeyboardEvent('keydown', { code, key: 'MediaTrackNext', ctrlKey: true }))).toBeNull()
  })

  it('preserves actual physical codes, including media keys sharing function keys', () => {
    expect(keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'F8', key: 'MediaPlayPause' })).code).toBe('F8')
    expect(keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'a' })).code).toBe('KeyQ')
  })

  it.each(['MediaPlay', 'MediaPause', 'MediaFastForward', 'MediaRewind', 'MediaRecord'])(
    'also records the distinct %s media key', key => {
      const binding = keyBindingFromEvent(new KeyboardEvent('keydown', { key }))
      expect(binding.code).toBe(key)
      expect(isKeyBinding(binding)).toBe(true)
      expect(keyBindingsEqual(binding, keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'Unidentified', key })))).toBe(true)
    },
  )

  it('matches already-saved unidentified media bindings without treating all unidentified keys as equal', () => {
    const saved = { ...DEFAULT_SETTINGS.bindings.nextEpisode.key, code: 'Unidentified', key: 'MediaTrackNext', ctrl: false }
    const event = keyBindingFromEvent(new KeyboardEvent('keydown', { key: 'MediaTrackNext' }))
    expect(keyBindingsEqual(saved, event)).toBe(true)
    expect(keyBindingsEqual(saved, { ...saved, key: 'MediaTrackPrevious' })).toBe(false)
    const unidentifiedEvent = keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'Unidentified', key: 'Unidentified' }))
    expect(keyBindingsEqual({ ...saved, key: 'Unidentified' }, unidentifiedEvent)).toBe(false)
  })

  it.each(['a', 'Dead', 'Process', 'Unidentified', 'MadeUpKey', 'Power', 'Sleep', 'LaunchMediaPlayer', 'constructor', '__proto__'])('does not invent a physical code for %s', key => {
    expect(isKeyBinding(keyBindingFromEvent(new KeyboardEvent('keydown', { code: '', key })))).toBe(false)
    expect(isKeyBinding(keyBindingFromEvent(new KeyboardEvent('keydown', { code: 'Unidentified', key })))).toBe(false)
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
    ).toBeNull()
    expect(
      findRemappedNetflixNativeActionForKey(
        DEFAULT_SETTINGS,
        new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' })
      )
    ).toBeNull()
  })

  it('lists the Netflix keys replaced by each enabled remapped action', () => {
    const remappedPlayPause = {
      ...DEFAULT_SETTINGS.bindings.playPause,
      key: { code: 'KeyX', key: 'x', ctrl: false, alt: false, shift: false, meta: false },
    }
    const remappedSubtitles = {
      ...DEFAULT_SETTINGS.bindings.toggleSubtitles,
      key: { code: 'KeyV', key: 'v', ctrl: false, alt: false, shift: false, meta: false },
    }

    expect(
      getReplacedNetflixNativeKeyBindings('playPause', remappedPlayPause).map(binding =>
        formatKeyBinding(binding)
      )
    ).toEqual(['Space'])
    expect(
      getReplacedNetflixNativeKeyBindings('toggleSubtitles', remappedSubtitles).map(
        binding => formatKeyBinding(binding)
      )
    ).toEqual([])
    expect(
      getReplacedNetflixNativeKeyBindings('playPause', {
        ...remappedPlayPause,
        enabled: false,
      })
    ).toEqual([])
    expect(
      getReplacedNetflixNativeKeyBindings(
        'playPause',
        DEFAULT_SETTINGS.bindings.playPause
      )
    ).toEqual([])
    expect(
      getReplacedNetflixNativeKeyBindings(
        'speedUp',
        DEFAULT_SETTINGS.bindings.speedUp
      )
    ).toEqual([])
  })

  it('keeps subtitle shortcuts extension-owned when remapped', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      bindings: {
        ...DEFAULT_SETTINGS.bindings,
        toggleSubtitles: {
          ...DEFAULT_SETTINGS.bindings.toggleSubtitles,
          key: { code: 'KeyV', key: 'v', ctrl: false, alt: false, shift: false, meta: false },
        },
      },
    }
    const originalSubtitleKey = new KeyboardEvent('keydown', { code: 'KeyC', key: 'c' })
    const remappedSubtitleKey = new KeyboardEvent('keydown', { code: 'KeyV', key: 'v' })

    expect(findRemappedNetflixNativeActionForKey(settings, originalSubtitleKey)).toBeNull()
    expect(findActionForKey(settings, originalSubtitleKey)).toBeNull()
    expect(findActionForKey(settings, remappedSubtitleKey)).toBe('toggleSubtitles')
    expect(findActionForKey(DEFAULT_SETTINGS, originalSubtitleKey)).toBe('toggleSubtitles')
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

  it('uses Shift plus quote for the preferred-speed default', () => {
    expect(
      getKeyBindingLabels(DEFAULT_SETTINGS.bindings.setPreferredSpeed.key, {
        platform: 'Win32',
      })
    ).toEqual(['Shift', '"'])
  })
})
