import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './shortcut-settings'
import { getShortcutAvailability, getSubtitleNavigationAvailability, resolvePlaybackShortcut } from './shortcut-routing'
import type { KeyBinding } from './shortcut-types'

const eventFor = (key: KeyBinding) => ({
  code: key.code, key: key.key,
  ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta,
})

const overlappingSettings = () => {
  const settings = structuredClone(DEFAULT_SETTINGS)
  settings.subtitleNavigation.enabled = true
  settings.subtitleNavigation.bindings.next.key = settings.bindings.seekForward.key
  return settings
}

describe('shortcut routing', () => {
  it('keeps a supported custom shortcut ahead of subtitles even when unsupported PiP shares its key', () => {
    const settings = overlappingSettings()
    const key = settings.bindings.pictureInPicture.key
    settings.seekShortcuts = [{ id: 'seek:quarter', kind: 'percentage', value: 25 }]
    settings.bindings['seek:quarter'] = { enabled: true, key }
    settings.subtitleNavigation.bindings.next.key = key
    expect(resolvePlaybackShortcut(settings, eventFor(key), false)).toMatchObject({ group: 'general', action: 'seek:quarter', supported: true })
    expect(getSubtitleNavigationAvailability(settings, 'next', false).overridingAction).toBe('seek:quarter')
  })
  it('keeps the general shortcut active and reports the overlap on the subtitle side', () => {
    const settings = overlappingSettings()
    expect(getShortcutAvailability(settings, 'seekForward', true)).toEqual({
      supported: true,
    })
    expect(getSubtitleNavigationAvailability(settings, 'next', true).overridingAction).toBe('seekForward')
    expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.seekForward.key), true)).toEqual({
      group: 'general', action: 'seekForward', supported: true,
    })
  })

  it.each(['global', 'navigation', 'subtitle binding'] as const)(
    'does not report a subtitle overlap when %s is disabled', disabled => {
      const settings = overlappingSettings()
      if (disabled === 'global') settings.enabled = false
      if (disabled === 'navigation') settings.subtitleNavigation.enabled = false
      if (disabled === 'subtitle binding') settings.subtitleNavigation.bindings.next.enabled = false
      expect(getSubtitleNavigationAvailability(settings, 'next', true).overridingAction).toBeUndefined()
      expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.seekForward.key), true)).toEqual(
        disabled === 'global' ? null : { group: 'general', action: 'seekForward', supported: true },
      )
    },
  )

  it('releases a disabled general shortcut for subtitle navigation', () => {
    const settings = overlappingSettings()
    settings.bindings.seekForward.enabled = false
    expect(getSubtitleNavigationAvailability(settings, 'next', true).overridingAction).toBeUndefined()
    expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.seekForward.key), true)).toMatchObject({
      group: 'subtitleNavigation', action: 'next',
    })
    settings.subtitleNavigation.enabled = false
    expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.seekForward.key), true)).toBeNull()
  })

  it.each(['ctrl', 'alt', 'shift', 'meta', 'code'] as const)(
    'keeps distinct %s bindings separate in both views and routing', field => {
      const settings = overlappingSettings()
      const key = settings.subtitleNavigation.bindings.next.key = { ...settings.bindings.seekForward.key }
      if (field === 'code') key.code = 'KeyN'
      else key[field] = true
      expect(getSubtitleNavigationAvailability(settings, 'next', true).overridingAction).toBeUndefined()
      expect(resolvePlaybackShortcut(settings, eventFor(key), true)).toMatchObject({ group: 'subtitleNavigation', action: 'next' })
      expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.seekForward.key), true)).toMatchObject({ group: 'general', action: 'seekForward' })
    },
  )

  it('releases modified default subtitle keys that have no matching action', () => {
    const settings = overlappingSettings()
    const key = settings.subtitleNavigation.bindings.previous.key
    for (const modifier of ['ctrlKey', 'altKey', 'metaKey']) {
      expect(resolvePlaybackShortcut(settings, { ...eventFor(key), [modifier]: true }, true)).toBeNull()
    }
    expect(resolvePlaybackShortcut(settings, { ...eventFor(key), shiftKey: true }, true)).toMatchObject({
      group: 'general', action: 'previousAudioTrack',
    })
  })

  it('reports unsupported PiP without falling through to another general action', () => {
    const settings = overlappingSettings()
    const key = settings.bindings.pictureInPicture.key
    expect(getShortcutAvailability(settings, 'pictureInPicture', false)).toEqual({
      supported: false,
    })
    expect(resolvePlaybackShortcut(settings, eventFor(key), false)).toEqual({
      group: 'general', action: 'pictureInPicture', supported: false,
    })
    settings.subtitleNavigation.bindings.next.key = key
    expect(getSubtitleNavigationAvailability(settings, 'next', false).overridingAction).toBeUndefined()
    expect(resolvePlaybackShortcut(settings, eventFor(key), false)).toMatchObject({
      group: 'subtitleNavigation', action: 'next', supported: true,
    })
  })

  it('routes edited subtitle keys and releases individually disabled keys', () => {
    const settings = overlappingSettings()
    settings.subtitleNavigation.bindings.next.key = { code: 'KeyN', key: 'n', ctrl: false, alt: false, shift: true, meta: false }
    expect(resolvePlaybackShortcut(settings, eventFor(settings.subtitleNavigation.bindings.next.key), true)).toMatchObject({ action: 'next' })
    expect(resolvePlaybackShortcut(settings, eventFor(DEFAULT_SETTINGS.subtitleNavigation.bindings.next.key), true)).toBeNull()
    settings.subtitleNavigation.bindings.next.enabled = false
    expect(resolvePlaybackShortcut(settings, eventFor(settings.subtitleNavigation.bindings.next.key), true)).toBeNull()
    expect(resolvePlaybackShortcut(settings, eventFor(settings.bindings.skipIntro.key), true)).toMatchObject({ group: 'general', action: 'skipIntro' })
  })
})
