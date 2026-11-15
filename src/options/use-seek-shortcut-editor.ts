import { useEffect, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, SEEK_LIMITS } from '@/shared/shortcut-settings'
import { keyBindingsEqual } from '@/shared/shortcut-bindings'
import { getSeekShortcutActions, SEEK_SHORTCUT_LIMITS } from '@/shared/seek-shortcuts'
import { applyShortcutAssignment } from '@/shared/shortcut-assignment'
import { captureShortcutEdit, evaluateShortcutEdit, isShortcutEditCurrent, type ShortcutEditSnapshot } from '@/shared/shortcut-edit'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'
import type { KeyBinding, SeekShortcut, ShortcutAction, ShortcutSettings } from '@/shared/shortcut-types'
import { subscribeSettings } from '@/shared/storage'

export type SeekEditorTarget = { kind: 'builtin' } | { kind: 'custom'; shortcut: SeekShortcut }
const actionsFor = (target: SeekEditorTarget): ShortcutAction[] => target.kind === 'builtin'
  ? ['seekBackward', 'seekForward'] : getSeekShortcutActions(target.shortcut)
const valueFor = (settings: ShortcutSettings, target: SeekEditorTarget) => target.kind === 'builtin'
  ? settings.seek.seconds : settings.seekShortcuts.find(item => item.id === target.shortcut.id && item.kind === target.shortcut.kind)?.value

type Snapshot = { value: number | undefined; keys: Partial<Record<ShortcutAction, KeyBinding | null>>; edit: ShortcutEditSnapshot }
export type SeekDialogState = {
  target: SeekEditorTarget
  isNew: boolean
  value: string
  keys: Partial<Record<ShortcutAction, KeyBinding | null>>
  saved: Snapshot
  enableOnSave: boolean
}
const snapshot = (settings: ShortcutSettings, target: SeekEditorTarget, isNew = false): Snapshot => ({
  value: valueFor(settings, target),
  keys: Object.fromEntries(actionsFor(target).map(action => [action, settings.bindings[action]?.key ?? null])),
  edit: captureShortcutEdit(settings, { kind: 'seek', shortcut: target.kind === 'custom' ? target.shortcut : null, isNew }),
})

const evaluateDraft = (settings: ShortcutSettings, dialog: SeekDialogState, supportsSubtitlePreservingPip: boolean) =>
  evaluateShortcutEdit(settings, { snapshot: dialog.saved.edit, keys: dialog.keys, value: dialog.value,
    enabled: dialog.isNew || dialog.enableOnSave ? true : 'preserve' }, supportsSubtitlePreservingPip)

export function useSeekShortcutEditor({ settings, updateSettings, supportsSubtitlePreservingPip }: Pick<ReturnType<typeof useShortcutSettingsForm>, 'settings' | 'updateSettings'> & {
  supportsSubtitlePreservingPip: boolean
}) {
  const [dialog, setDialog] = useState<SeekDialogState | null>(null)
  const [pending, setPending] = useState<{ target: SeekEditorTarget; saved: Snapshot } | null>(null)
  useEffect(() => subscribeSettings(() => setPending(null)), [])
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const open = (target: SeekEditorTarget, button: HTMLButtonElement | null, isNew = false, enableOnSave = false) => {
    const saved = snapshot(settings, target, isNew)
    returnFocus.current = button
    setPending(null)
    setDialog({ target, isNew, saved, enableOnSave, value: String(isNew && target.kind === 'custom' ? target.shortcut.value : saved.value),
      keys: saved.keys,
    })
  }
  const validPending = pending && isShortcutEditCurrent(settings, pending.saved.edit) ? pending : null
  const pendingEvaluation = validPending ? evaluateShortcutEdit(settings, {
    snapshot: validPending.saved.edit, keys: validPending.saved.keys, value: validPending.saved.value,
    enabled: true,
  }, supportsSubtitlePreservingPip) : null
  const actions = dialog ? actionsFor(dialog.target) : []
  const percentage = dialog?.target.kind === 'custom' && dialog.target.shortcut.kind === 'percentage'
  const min = percentage ? 0 : 1
  const max = percentage ? 100 : dialog?.target.kind === 'builtin' ? SEEK_LIMITS.seconds.max : SEEK_SHORTCUT_LIMITS.seconds
  const evaluation = dialog ? evaluateDraft(settings, dialog, supportsSubtitlePreservingPip) : null
  const stale = evaluation?.stale ?? false
  const fieldConflicts = (evaluation?.analysis.fieldConflicts ?? {}) as Partial<Record<ShortcutAction, ShortcutAction>>
  const storageFull = evaluation?.storageFull ?? false
  const canSave = Boolean(dialog?.value.trim() && evaluation?.canSave)

  return {
    dialog, actions, percentage, min, max, stale, fieldConflicts, canSave, storageFull,
    open,
    add: (kind: SeekShortcut['kind'], button: HTMLButtonElement) => open({ kind: 'custom', shortcut: { id: `seek:${crypto.randomUUID()}`, kind, value: kind === 'relative' ? 10 : 50 } }, button, true),
    setValue: (value: string) => setDialog(current => current && { ...current, value }),
    capture: (action: ShortcutAction, key: KeyBinding | null) => setDialog(current => current && { ...current, keys: { ...current.keys, [action]: key } }),
    restore: () => setDialog(current => current && { ...current,
      value: String(current.isNew && current.target.kind === 'custom' ? current.target.shortcut.value : current.saved.value),
      keys: current.saved.keys,
    }),
    close: () => setDialog(null),
    restoreFocus: (event: Event) => {
      const button = returnFocus.current
      returnFocus.current = null
      const target = button?.isConnected && !button.disabled ? button : document.getElementById('shortcut-search')
      if (target) { event.preventDefault(); target.focus() }
    },
    save: () => {
      if (!dialog || !canSave) return
      updateSettings(current => evaluateDraft(current, dialog, supportsSubtitlePreservingPip).settings)
      setDialog(null)
    },
    pairConflict: validPending && { target: validPending.target, actions: pendingEvaluation!.analysis.conflicts,
      affectedActions: pendingEvaluation!.analysis.affectedActions, keys: pendingEvaluation!.analysis.conflictingKeys },
    dismissConflict: () => setPending(null),
    changeConflictKeys: (button: HTMLButtonElement | null) => { if (validPending) open(validPending.target, button, false, true) },
    setPairEnabled: (target: SeekEditorTarget, next: boolean, button: HTMLButtonElement | null = null) => {
      const actions = actionsFor(target)
      const saved = snapshot(settings, target)
      const keys = Object.fromEntries(actions.map(action => [action, settings.bindings[action].key]))
      if (next && keys[actions[0]] && keyBindingsEqual(keys[actions[0]], keys[actions[1]])) { open(target, button, false, true); return }
      const draft = { snapshot: saved.edit, keys, value: saved.value, enabled: next }
      if (next && evaluateShortcutEdit(settings, draft, supportsSubtitlePreservingPip).analysis.conflicts.length) {
        setPending({ target, saved }); return
      }
      updateSettings(current => isShortcutEditCurrent(current, saved.edit)
        ? applyShortcutAssignment(current, actions.map(action => ({ group: 'general', action, key: keys[action] })),
          { enabled: next, supportsSubtitlePreservingPip }) : current)
    },
    confirmTransfer: () => {
      if (!validPending) return
      updateSettings(current => isShortcutEditCurrent(current, validPending.saved.edit)
        ? applyShortcutAssignment(current, actionsFor(validPending.target).map(action => ({ group: 'general', action,
          key: validPending.saved.keys[action] ?? null })), { enabled: true, transfer: true, supportsSubtitlePreservingPip }) : current)
      setPending(null)
    },
    resetBuiltin: () => updateSettings(current => ({ ...current, seek: DEFAULT_SETTINGS.seek })),
  }
}
