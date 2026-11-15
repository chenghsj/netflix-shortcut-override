import { describe, expect, it } from 'vitest'
import { createShortcutCatalog } from './shortcut-catalog'
import { DEFAULT_SETTINGS } from './shortcut-settings'
import type { ShortcutSettings } from './shortcut-types'

const settingsWithCustomShortcuts = (): ShortcutSettings => ({
  ...structuredClone(DEFAULT_SETTINGS),
  seekShortcuts: [
    { id: 'seek:position', kind: 'percentage', value: 37 },
    { id: 'seek:interval', kind: 'relative', value: 17 },
    { id: 'seek:interval-long', kind: 'relative', value: 31 },
  ],
  preferredSpeedShortcuts: [{ id: 'preferred-speed:fast', speed: 2.5 }],
})

describe('shortcut domain catalogue', () => {
  it('identifies a complete seek pair from either direction without confusing adjacent identities', () => {
    const settings = settingsWithCustomShortcuts()
    const catalog = createShortcutCatalog(settings)
    const builtin = catalog.seekPairFor('seekForward')!
    expect(catalog.seekPairFor('seekBackward')).toBe(builtin)
    expect(builtin.shortcut).toBeNull()
    expect(builtin.actions).toEqual({ backward: 'seekBackward', forward: 'seekForward' })

    const custom = catalog.seekPairFor('seek:interval-forward')!
    expect(catalog.seekPairFor('seek:interval-backward')).toBe(custom)
    expect(custom.id).toBe('seek:interval')
    expect(custom.shortcut?.value).toBe(17)
    expect(custom.actions).toEqual({ backward: 'seek:interval-backward', forward: 'seek:interval-forward' })
    expect(catalog.seekPairFor('seek:interval-long-forward')?.id).toBe('seek:interval-long')
    expect(catalog.seekPairFor('seek:position')).toBeUndefined()
    expect(catalog.seekPairFor('preferred-speed:fast')).toBeUndefined()
    expect(catalog.seekPairFor('nextFrame')).toBeUndefined()
  })

  it('preserves group identities when switches and visibility change, including empty custom groups', () => {
    const settings = settingsWithCustomShortcuts()
    const original = createShortcutCatalog(settings)
    settings.enabled = false
    settings.bindings.seekForward.enabled = false
    settings.hiddenFeatures = ['group:seek', 'group:percentage', 'general:seekForward', 'holdSpeed']
    const hidden = createShortcutCatalog(settings)
    expect(hidden.groups.seek.actions).toEqual(original.groups.seek.actions)
    expect(hidden.groups.percentage.actions).toEqual(['seek:position'])
    expect(hidden.groups.preferredSpeed.actions).toEqual(['setPreferredSpeed', 'preferred-speed:fast'])
    expect(hidden.holdSpeed).toEqual({ id: 'holdSpeed', parentAction: 'playPause' })

    settings.seekShortcuts = []
    settings.preferredSpeedShortcuts = []
    const empty = createShortcutCatalog(settings)
    expect(empty.groups.seek.actions).toEqual(['seekBackward', 'seekForward'])
    expect(empty.groups.percentage.actions).toEqual([])
    expect(empty.groups.preferredSpeed.actions).toEqual(['setPreferredSpeed'])
  })

  it('reflects additions, removal and saved metadata without altering settings', () => {
    const settings = settingsWithCustomShortcuts()
    const before = structuredClone(settings)
    createShortcutCatalog(settings)
    expect(settings).toEqual(before)

    settings.seekShortcuts = [
      { id: 'seek:interval-long', kind: 'relative', value: 45 },
      { id: 'seek:new-position', kind: 'percentage', value: 73 },
    ]
    const current = createShortcutCatalog(settings)
    expect(current.seekPairFor('seek:interval-forward')).toBeUndefined()
    expect(current.seekPairFor('seek:interval-long-forward')?.shortcut?.value).toBe(45)
    expect(current.groups.seek.actions).toEqual(['seekBackward', 'seekForward', 'seek:interval-long-backward', 'seek:interval-long-forward'])
    expect(current.groups.percentage.shortcuts).toEqual([{ id: 'seek:new-position', kind: 'percentage', value: 73 }])
  })
})
