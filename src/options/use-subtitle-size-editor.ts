import { useRef, useState } from 'react'
import { recordedKeysEqual } from '@/shared/shortcut-bindings'
import { captureShortcutEdit, evaluateShortcutEdit, type ShortcutEditSnapshot } from '@/shared/shortcut-edit'
import { getSubtitleSizeEditLimit, isSubtitleSizeList, SUBTITLE_SIZE_LIMITS } from '@/shared/subtitle-size-shortcuts'
import type { KeyBinding, ShortcutSettings, SubtitleSizeShortcut, SubtitleSizeShortcutAction } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type SizeAction = 'cycleSubtitleSize' | SubtitleSizeShortcutAction
type SizeDraft = { id: number; value: string }
type SizeDialog = {
  action: SizeAction
  kind: SubtitleSizeShortcut['kind']
  sizes: SizeDraft[]
  key: KeyBinding | null
  additionalKeys: (KeyBinding | null)[]
  saved: { edit: ShortcutEditSnapshot; sizes: number[]; key: KeyBinding | null; additionalKeys: KeyBinding[] }
  enableOnSave: boolean
}

const sizeDrafts = (sizes: readonly number[]): SizeDraft[] => sizes.map((size, id) => ({ id, value: String(size) }))

export function useSubtitleSizeEditor({ settings, updateSettings, supportsSubtitlePreservingPip }:
  Pick<ReturnType<typeof useShortcutSettingsForm>, 'settings' | 'updateSettings'> & { supportsSubtitlePreservingPip: boolean }) {
  const [dialog, setDialog] = useState<SizeDialog | null>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const open = (action: SizeAction, button: HTMLButtonElement | null, enableOnSave = false) => {
    const builtin = action === 'cycleSubtitleSize'
    const entry = settings.subtitleSizeShortcuts.find(item => item.id === action)
    if (!builtin && !entry) return
    returnFocus.current = button
    setDialog({ action, kind: builtin ? 'cycle' : entry!.kind,
      sizes: sizeDrafts(builtin ? settings.subtitleSizeCycle : entry!.sizes), key: settings.bindings[action].key,
      additionalKeys: settings.bindings[action].additionalKeys ?? [],
      saved: { edit: captureShortcutEdit(settings, { kind: 'subtitleSize', action }),
        sizes: [...(builtin ? settings.subtitleSizeCycle : entry!.sizes)], key: settings.bindings[action].key,
        additionalKeys: settings.bindings[action].additionalKeys ?? [] }, enableOnSave })
  }
  const sizes = dialog?.sizes.map(size => Number(size.value)) ?? []
  const validSizes = Boolean(dialog && dialog.sizes.every(size => size.value.trim()) &&
    isSubtitleSizeList(sizes, dialog.kind === 'fixed' ? 1 : 2, getSubtitleSizeEditLimit(dialog.saved.sizes)) &&
    (dialog.kind !== 'fixed' || sizes.length === 1))
  const evaluate = (current: ShortcutSettings, draft: SizeDialog) => evaluateShortcutEdit(current, {
    snapshot: draft.saved.edit, keys: { [draft.action]: draft.key },
    additionalKeys: { [draft.action]: draft.additionalKeys },
    value: draft.sizes.map(size => Number(size.value)), enabled: draft.enableOnSave ? true : 'preserve',
  }, supportsSubtitlePreservingPip)
  const evaluation = dialog ? evaluate(settings, dialog) : null
  const stale = evaluation?.stale ?? false
  const keyConflicts = dialog ? evaluation?.analysis.keyConflicts[dialog.action] : undefined
  const storageFull = validSizes && (evaluation?.storageFull ?? false)
  const canSave = validSizes && (evaluation?.canSave ?? false)
  const canRestore = Boolean(dialog && (
    dialog.sizes.length !== dialog.saved.sizes.length ||
    dialog.sizes.some((size, index) => size.value !== String(dialog.saved.sizes[index])) ||
    !recordedKeysEqual([dialog.key, ...dialog.additionalKeys], [dialog.saved.key, ...dialog.saved.additionalKeys])
  ))

  return {
    dialog, validSizes, stale, keyConflicts, storageFull, canSave, canRestore,
    open,
    setSize: (id: number, value: string) => setDialog(current => current && { ...current,
      sizes: current.sizes.map(size => size.id === id ? { ...size, value } : size) }),
    moveSize: (id: number, targetId: number, position: 'before' | 'after') => setDialog(current => {
      if (!current || current.kind !== 'cycle' || id === targetId) return current
      const source = current.sizes.find(size => size.id === id)
      if (!source || !current.sizes.some(size => size.id === targetId)) return current
      const sizes = current.sizes.filter(size => size.id !== id)
      const destination = sizes.findIndex(size => size.id === targetId) + (position === 'after' ? 1 : 0)
      sizes.splice(destination, 0, source)
      return { ...current, sizes }
    }),
    addSize: () => setDialog(current => {
      if (!current || current.kind !== 'cycle' || current.sizes.length >= SUBTITLE_SIZE_LIMITS.count) return current
      const id = Math.max(...current.sizes.map(size => size.id)) + 1
      const candidate = [100, 125, 150, 175, 200, 225, 250, 275, 300, 80, 75, 50].find(value => !current.sizes.some(size => Number(size.value) === value))
      return { ...current, sizes: [...current.sizes, { id, value: String(candidate ?? 100) }] }
    }),
    removeSize: (id: number) => setDialog(current => current && current.sizes.length > 2
      ? { ...current, sizes: current.sizes.filter(size => size.id !== id) } : current),
    capture: (key: KeyBinding | null) => setDialog(current => current && { ...current, key }),
    captureKeys: (keys: (KeyBinding | null)[]) => setDialog(current => current && { ...current, key: keys[0] ?? null, additionalKeys: keys.slice(1) }),
    restore: () => setDialog(current => current && {
      ...current, sizes: sizeDrafts(current.saved.sizes), key: current.saved.key, additionalKeys: current.saved.additionalKeys,
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
      updateSettings(current => evaluate(current, dialog).settings)
      setDialog(null)
    },
  }
}
