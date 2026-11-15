import { describe, expect, it } from 'vitest'
import { applyShortcutAssignment, inspectShortcutAssignment, resetSubtitleNavigationBindings, type ShortcutAssignment } from './shortcut-assignment'
import { DEFAULT_SETTINGS } from './shortcut-settings'
import type { ShortcutSettings } from './shortcut-types'

const options = { enabled: true, supportsSubtitlePreservingPip: true }

describe('shortcut assignment', () => {
  it('leaves occupied subtitle defaults disabled when resetting all subtitle bindings', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.bindings.mute.key = { ...settings.subtitleNavigation.bindings.previous.key }
    settings.bindings.fullscreen.key = { ...settings.subtitleNavigation.bindings.playback.key }
    const bindings = resetSubtitleNavigationBindings(settings, true)
    expect(bindings.previous.enabled).toBe(false)
    expect(bindings.playback.enabled).toBe(false)
    expect(bindings.next.enabled).toBe(true)
    expect(bindings.replay).toEqual({ enabled: false, key: null })
    expect(settings.bindings.mute.enabled).toBe(true)
    expect(settings.subtitleNavigation.bindings.previous.enabled).toBe(true)
  })
  it('rejects a subtitle key owned by a general shortcut until transfer is explicit', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'subtitleNavigation', action: 'next', key: settings.bindings.mute.key }]
    expect(inspectShortcutAssignment(settings, assignment, options).conflicts).toEqual(['mute'])
    expect(applyShortcutAssignment(settings, assignment, options)).toBe(settings)
    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.bindings.mute.enabled).toBe(false)
    expect(next.subtitleNavigation.bindings.next).toEqual({ enabled: true, key: settings.bindings.mute.key })
    expect(next.subtitleNavigation.bindings.previous).toBe(settings.subtitleNavigation.bindings.previous)
    expect(settings.bindings.mute.enabled).toBe(true)
  })

  it('transfers a subtitle key back to a general shortcut without disabling unrelated rows', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'general', action: 'mute', key: settings.subtitleNavigation.bindings.next.key }]
    expect(applyShortcutAssignment(settings, assignment, options)).toBe(settings)
    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.subtitleNavigation.bindings.next.enabled).toBe(false)
    expect(next.subtitleNavigation.bindings.previous.enabled).toBe(true)
    expect(next.bindings.mute.enabled).toBe(true)
    expect(next.bindings.skipIntro).toBe(settings.bindings.skipIntro)
  })

  it('transfers both directions when a subtitle shortcut takes a seek-pair key', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'subtitleNavigation', action: 'next', key: settings.bindings.seekForward.key }]
    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.bindings.seekBackward.enabled).toBe(false)
    expect(next.bindings.seekForward.enabled).toBe(false)
    expect(next.subtitleNavigation.bindings.next.enabled).toBe(true)
    expect(next.subtitleNavigation.bindings.previous.enabled).toBe(true)
  })

  it('reports and atomically applies the complete consequences of transferring a pair key', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'general', action: 'fullscreen', key: settings.bindings.seekForward.key }]
    const inspection = inspectShortcutAssignment(settings, assignment, options)
    expect(inspection.conflicts).toEqual(['seekForward'])
    expect(inspection.affectedActions).toEqual(['seekBackward', 'seekForward'])
    expect(inspection.conflictingKeys).toEqual([settings.bindings.seekForward.key])
    expect(applyShortcutAssignment(settings, assignment, options)).toBe(settings)

    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.bindings.fullscreen).toEqual({ key: settings.bindings.seekForward.key, enabled: true })
    expect(next.bindings.seekBackward.enabled).toBe(false)
    expect(next.bindings.seekForward.enabled).toBe(false)
    expect(next.subtitleNavigation).toBe(settings.subtitleNavigation)
    expect(settings.bindings.seekBackward.enabled).toBe(true)
  })

  it('swaps pair keys together without treating the saved pair as an external conflict', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignments: ShortcutAssignment[] = [
      { group: 'general', action: 'seekBackward', key: settings.bindings.seekForward.key },
      { group: 'general', action: 'seekForward', key: settings.bindings.seekBackward.key },
    ]
    const next = applyShortcutAssignment(settings, assignments, options)
    expect(next.bindings.seekBackward.key).toEqual(settings.bindings.seekForward.key)
    expect(next.bindings.seekForward.key).toEqual(settings.bindings.seekBackward.key)
    expect(next.bindings.mute).toBe(settings.bindings.mute)
  })

  it('rejects duplicate draft keys even when transferring, but allows disabling a legacy duplicate pair', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignments: ShortcutAssignment[] = [
      { group: 'general', action: 'seekBackward', key: settings.bindings.mute.key },
      { group: 'general', action: 'seekForward', key: settings.bindings.mute.key },
    ]
    expect(inspectShortcutAssignment(settings, assignments, options).fieldConflicts).toEqual({
      seekBackward: 'seekForward', seekForward: 'seekBackward',
    })
    expect(applyShortcutAssignment(settings, assignments, { ...options, transfer: true })).toBe(settings)
    const next = applyShortcutAssignment(settings, assignments, { ...options, enabled: false })
    expect(next.bindings.seekBackward.enabled).toBe(false)
    expect(next.bindings.seekForward.enabled).toBe(false)
    expect(next.bindings.mute.enabled).toBe(true)
  })

  it('rechecks saved keys and newly introduced conflicts against the settings being written', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'general', action: 'mute',
      key: { ...settings.bindings.mute.key, code: 'KeyJ', key: 'j' }, savedKey: settings.bindings.mute.key }]
    const changed: ShortcutSettings = structuredClone(settings)
    changed.bindings.fullscreen.key = assignment[0].key
    expect(inspectShortcutAssignment(settings, assignment, options).conflicts).toEqual([])
    expect(applyShortcutAssignment(changed, assignment, options)).toBe(changed)
    changed.bindings.mute.key = settings.bindings.seekForward.key
    expect(applyShortcutAssignment(changed, assignment, { ...options, transfer: true })).toBe(changed)
  })

  it('checks and transfers conflicts across both groups, including while master switches are off', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.enabled = false
    settings.subtitleNavigation.bindings.previous.key = settings.bindings.mute.key
    const assignment: ShortcutAssignment[] = [{ group: 'subtitleNavigation', action: 'next', key: settings.bindings.mute.key }]
    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.subtitleNavigation.bindings.previous.enabled).toBe(false)
    expect(next.subtitleNavigation.bindings.next.enabled).toBe(true)
    expect(next.bindings.mute.enabled).toBe(false)
    expect(next.bindings.playPause).toBe(settings.bindings.playPause)
    expect(next.enabled).toBe(false)
    expect(next.subtitleNavigation.enabled).toBe(false)
  })

  it('releases unsupported PiP keys without changing their saved assignment', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const assignment: ShortcutAssignment[] = [{ group: 'general', action: 'mute', key: settings.bindings.pictureInPicture.key }]
    const next = applyShortcutAssignment(settings, assignment, { ...options, supportsSubtitlePreservingPip: false })
    expect(next.bindings.mute.key).toEqual(settings.bindings.pictureInPicture.key)
    expect(next.bindings.pictureInPicture).toBe(settings.bindings.pictureInPicture)
  })

  it.each(['general', 'subtitleNavigation'] as const)('releases disabled rows within the %s table', group => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    const peer = group === 'general' ? settings.bindings.playPause : settings.subtitleNavigation.bindings.playback
    const assignment: ShortcutAssignment[] = group === 'general'
      ? [{ group, action: 'mute', key: peer.key }]
      : [{ group, action: 'next', key: peer.key }]
    expect(inspectShortcutAssignment(settings, assignment, options).conflicts).toHaveLength(1)
    peer.enabled = false
    expect(inspectShortcutAssignment(settings, assignment, options).conflicts).toEqual([])
  })

  it('transfers a custom seek pair using its full pair identity', () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.seekShortcuts = [{ id: 'seek:custom', kind: 'relative', value: 15 }]
    settings.bindings['seek:custom-backward'] = { key: { ...settings.bindings.mute.key, code: 'KeyJ', key: 'j' }, enabled: true }
    settings.bindings['seek:custom-forward'] = { key: { ...settings.bindings.mute.key, code: 'KeyL', key: 'l' }, enabled: true }
    const assignment: ShortcutAssignment[] = [{ group: 'general', action: 'mute', key: settings.bindings['seek:custom-forward'].key }]
    expect(inspectShortcutAssignment(settings, assignment, options).affectedActions).toEqual(['seek:custom-backward', 'seek:custom-forward'])
    const next = applyShortcutAssignment(settings, assignment, { ...options, transfer: true })
    expect(next.bindings['seek:custom-backward'].enabled).toBe(false)
    expect(next.bindings['seek:custom-forward'].enabled).toBe(false)
  })
})
