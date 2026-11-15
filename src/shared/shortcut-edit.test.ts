import { describe, expect, it } from 'vitest'
import { captureShortcutEdit, evaluateShortcutEdit, type ShortcutEditDraft, type ShortcutEditTarget } from './shortcut-edit'
import { DEFAULT_SETTINGS } from './shortcut-settings'
import { fitsSettingsStorageLimit } from './storage'
import type { KeyBinding, ShortcutSettings } from './shortcut-types'

const key = (code: string): KeyBinding => ({ code, key: code, ctrl: false, alt: false, shift: false, meta: false })
const settings = (): ShortcutSettings => structuredClone(DEFAULT_SETTINGS)

const edits: { name: string; target: ShortcutEditTarget; keys: ShortcutEditDraft['keys']; value: number | number[];
  change: (current: ShortcutSettings) => void; check: (next: ShortcutSettings) => void }[] = [
  { name: 'preferred speed', target: { kind: 'preferredSpeed', action: 'setPreferredSpeed' },
    keys: { setPreferredSpeed: key('F20') }, value: 2.25,
    change: current => { current.speed.preferred = 3 },
    check: next => { expect(next.speed.preferred).toBe(2.25); expect(next.bindings.setPreferredSpeed.key).toEqual(key('F20')) } },
  { name: 'seek pair', target: { kind: 'seek', shortcut: null },
    keys: { seekBackward: key('F21'), seekForward: key('F22') }, value: 35,
    change: current => { current.seek.seconds = 25 },
    check: next => { expect(next.seek.seconds).toBe(35); expect(next.bindings.seekBackward.key).toEqual(key('F21'));
      expect(next.bindings.seekForward.key).toEqual(key('F22')) } },
  { name: 'subtitle size', target: { kind: 'subtitleSize', action: 'cycleSubtitleSize' },
    keys: { cycleSubtitleSize: key('F23') }, value: [100, 175, 125],
    change: current => { current.subtitleSizeCycle = [100, 200] },
    check: next => { expect(next.subtitleSizeCycle).toEqual([100, 175, 125]); expect(next.bindings.cycleSubtitleSize.key).toEqual(key('F23')) } },
]

describe('shortcut edits', () => {
  it.each([3, 7, 12])('caps cycle growth while preserving a saved %i-size cycle', savedCount => {
    const original = settings()
    original.subtitleSizeCycle = Array.from({ length: savedCount }, (_, index) => 50 + index)
    const count = Math.max(6, savedCount)
    const draft: ShortcutEditDraft = {
      snapshot: captureShortcutEdit(original, { kind: 'subtitleSize', action: 'cycleSubtitleSize' }),
      keys: { cycleSubtitleSize: key('F23') },
      value: Array.from({ length: count }, (_, index) => 100 + index), enabled: 'preserve',
    }
    const accepted = evaluateShortcutEdit(original, draft, true)
    expect(accepted.canSave).toBe(true)
    expect(accepted.settings.subtitleSizeCycle).toEqual(draft.value)
    const rejected = evaluateShortcutEdit(original, { ...draft, value: Array.from({ length: count + 1 }, (_, index) => 100 + index) }, true)
    expect(rejected.canSave).toBe(false)
    expect(rejected.settings).toBe(original)
  })

  it.each(edits)('saves $name keys and parameters together while retaining unrelated edits', ({ target, keys, value, check }) => {
    const original = settings()
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, target), keys, value, enabled: 'preserve' }
    const latest = { ...original, locale: 'ja' as const, pip: { ...original.pip, subtitleBackground: 'dark' as const } }
    const result = evaluateShortcutEdit(latest, draft, true)
    expect(result.canSave).toBe(true)
    check(result.settings)
    expect(result.settings.locale).toBe('ja')
    expect(result.settings.pip).toBe(latest.pip)
    expect(original).toEqual(DEFAULT_SETTINGS)
  })

  it.each(edits)('rejects a $name edit changed after a successful preview without partial writes', ({ target, keys, value, change }) => {
    const original = settings()
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, target), keys, value, enabled: true }
    expect(evaluateShortcutEdit(original, draft, true).canSave).toBe(true)
    const latest = structuredClone(original)
    change(latest)
    const result = evaluateShortcutEdit(latest, draft, true)
    expect(result).toMatchObject({ stale: true, canSave: false })
    expect(result.settings).toBe(latest)
  })

  it('rechecks a newly occupied key and only transfers it together with the edited parameters', () => {
    const original = settings()
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'preferredSpeed', action: 'setPreferredSpeed' }),
      keys: { setPreferredSpeed: key('F24') }, value: 2, enabled: true }
    expect(evaluateShortcutEdit(original, draft, true).canSave).toBe(true)
    const latest = structuredClone(original)
    latest.bindings.seekForward.key = key('F24')
    const rejected = evaluateShortcutEdit(latest, draft, true)
    expect(rejected.settings).toBe(latest)
    expect(rejected.analysis.affectedActions).toEqual(['seekBackward', 'seekForward'])
    const transferred = evaluateShortcutEdit(latest, { ...draft, transfer: true }, true)
    expect(transferred.canSave).toBe(true)
    expect(transferred.settings.speed.preferred).toBe(2)
    expect(transferred.settings.bindings.seekBackward.enabled).toBe(false)
    expect(transferred.settings.bindings.seekForward.enabled).toBe(false)
    expect(latest.bindings.seekForward.enabled).toBe(true)
  })

  it('rejects quota growth after preview and accepts the same draft after unrelated storage is freed', () => {
    const original = settings()
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'subtitleSize', action: 'cycleSubtitleSize' }),
      keys: { cycleSubtitleSize: key('F25') }, value: [100, 200, 150], enabled: 'preserve' }
    expect(evaluateShortcutEdit(original, draft, true).canSave).toBe(true)
    const full = structuredClone(original)
    // A different shortcut's saved key label consumes the remaining sync item.
    full.bindings.mute.key = { ...key('KeyM'), key: 'x'.repeat(8192) }
    expect(fitsSettingsStorageLimit(full)).toBe(false)
    const rejected = evaluateShortcutEdit(full, draft, true)
    expect(rejected).toMatchObject({ stale: false, storageFull: true, canSave: false })
    expect(rejected.settings).toBe(full)
    expect(evaluateShortcutEdit(original, draft, true).settings.subtitleSizeCycle).toEqual([100, 200, 150])
    const percentage: ShortcutEditDraft = { snapshot: captureShortcutEdit(full, {
      kind: 'seek', shortcut: { id: 'seek:position', kind: 'percentage', value: 50 }, isNew: true,
    }), keys: { 'seek:position': null }, value: '  ', enabled: true }
    // An incomplete numeric draft must not be mistaken for the valid 0% value.
    expect(evaluateShortcutEdit(full, percentage, true)).toMatchObject({ canSave: false, storageFull: false })
    expect(evaluateShortcutEdit(original, { ...percentage, value: '0' }, true).settings.seekShortcuts)
      .toEqual([{ id: 'seek:position', kind: 'percentage', value: 0 }])
  })

  it('preserves disabled parameter entries and the latest enabled state of a plain key edit', () => {
    const original = settings()
    original.bindings.setPreferredSpeed.enabled = false
    const speedDraft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'preferredSpeed', action: 'setPreferredSpeed' }),
      keys: { setPreferredSpeed: null }, value: 2, enabled: 'preserve' }
    expect(evaluateShortcutEdit(original, speedDraft, true).settings.bindings.setPreferredSpeed).toEqual({ enabled: false, key: null })
    const bindingDraft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'binding', target: { group: 'general', action: 'mute' } }),
      keys: { mute: key('F26') }, enabled: 'preserve' }
    original.bindings.mute.enabled = false
    // Physical key identity, rather than the display character, determines freshness.
    original.bindings.mute.key!.key = 'M'
    const result = evaluateShortcutEdit(original, bindingDraft, true)
    expect(result.canSave).toBe(true)
    expect(result.settings.bindings.mute).toEqual({ enabled: false, key: key('F26') })
  })

  it.each([
    { name: 'preferred speed', target: { kind: 'preferredSpeed', action: 'preferred-speed:new', isNew: true } as const,
      keys: { 'preferred-speed:new': key('F27') }, value: 2,
      check: (next: ShortcutSettings) => expect(next.preferredSpeedShortcuts).toEqual([{ id: 'preferred-speed:new', speed: 2 }]) },
    { name: 'relative seek', target: { kind: 'seek', shortcut: { id: 'seek:new', kind: 'relative', value: 20 }, isNew: true } as const,
      keys: { 'seek:new-backward': key('F28'), 'seek:new-forward': key('F29') }, value: 20,
      check: (next: ShortcutSettings) => expect(next.seekShortcuts).toEqual([{ id: 'seek:new', kind: 'relative', value: 20 }]) },
    { name: 'percentage seek', target: { kind: 'seek', shortcut: { id: 'seek:new', kind: 'percentage', value: 0 }, isNew: true } as const,
      keys: { 'seek:new': null }, value: 0,
      check: (next: ShortcutSettings) => expect(next.seekShortcuts).toEqual([{ id: 'seek:new', kind: 'percentage', value: 0 }]) },
  ])('creates a complete $name and refuses to overwrite an entry created before save', ({ target, keys, value, check }) => {
    const original = settings()
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, target), keys, value, enabled: true }
    const created = evaluateShortcutEdit(original, draft, true)
    expect(created.canSave).toBe(true)
    check(created.settings)
    const collision = evaluateShortcutEdit(created.settings, draft, true)
    expect(collision).toMatchObject({ stale: true, canSave: false })
    expect(collision.settings).toBe(created.settings)
  })

  it('protects subtitle activation prerequisites while allowing an explicit reset', () => {
    const original = settings()
    original.subtitleNavigation.bindings.replay = { key: null, enabled: false }
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'binding', target: { group: 'subtitleNavigation', action: 'replay' } }),
      keys: { replay: key('F30') }, enabled: true }
    expect(evaluateShortcutEdit(original, draft, true).settings).toBe(original)
    expect(evaluateShortcutEdit(original, { ...draft, allowSubtitleEnable: true }, true).settings.subtitleNavigation.bindings.replay)
      .toEqual({ enabled: true, key: key('F30') })
  })

  it('distinguishes cleared pair keys from missing keys and duplicate disabled drafts', () => {
    const original = settings()
    original.bindings.seekBackward.enabled = false
    original.bindings.seekForward.enabled = false
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'seek', shortcut: null }),
      keys: { seekBackward: null, seekForward: null }, value: 20, enabled: 'preserve' }
    const cleared = evaluateShortcutEdit(original, draft, true)
    expect(cleared.canSave).toBe(true)
    expect(cleared.settings.bindings.seekForward).toEqual({ enabled: false, key: null })
    expect(evaluateShortcutEdit(original, { ...draft, keys: { seekBackward: null } }, true).settings).toBe(original)
    expect(evaluateShortcutEdit(original, { ...draft, keys: { seekBackward: key('F31'), seekForward: key('F31') } }, true).settings).toBe(original)
  })

  it('rejects an existing custom entry removed before save without recreating its binding', () => {
    const original = settings()
    original.subtitleSizeShortcuts = [{ id: 'subtitle-size:fixed', kind: 'fixed', sizes: [150] }]
    original.bindings['subtitle-size:fixed'] = { enabled: false, key: null }
    const draft: ShortcutEditDraft = { snapshot: captureShortcutEdit(original, { kind: 'subtitleSize', action: 'subtitle-size:fixed' }),
      keys: { 'subtitle-size:fixed': key('F32') }, value: [200], enabled: 'preserve' }
    expect(evaluateShortcutEdit(original, draft, true).canSave).toBe(true)
    const removed = structuredClone(original)
    removed.subtitleSizeShortcuts = []
    delete removed.bindings['subtitle-size:fixed']
    const result = evaluateShortcutEdit(removed, draft, true)
    expect(result).toMatchObject({ stale: true, canSave: false })
    expect(result.settings).toBe(removed)
  })
})
