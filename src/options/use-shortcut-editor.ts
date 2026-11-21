import { useEffect, useRef, useState } from 'react'

import { applyShortcutAssignment, inspectShortcutAssignment } from '@/shared/shortcut-assignment'
import { captureShortcutEdit, evaluateShortcutEdit, type ShortcutEditDraft, type ShortcutEditSnapshot } from '@/shared/shortcut-edit'
import {
  getReplacedNetflixNativeKeyBindings,
  isShortcutAction,
  keyBindingsEqual,
  keyListsEqual,
  recordedKeysEqual,
} from '@/shared/shortcut-bindings'
import { DEFAULT_SETTINGS, normalizeSpeedSettings } from '@/shared/shortcut-settings'
import { getPreferredSpeed } from '@/shared/preferred-speed-shortcuts'
import type { ShortcutTarget } from '@/shared/shortcut-routing'
import {
  type KeyBinding,
  type ShortcutSettings,
} from '@/shared/shortcut-types'
import { subscribeSettings } from '@/shared/storage'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type BindingRequest = ShortcutTarget & {
  savedKey: KeyBinding | null
  additionalKeys: KeyBinding[]
  savedAdditionalKeys: KeyBinding[]
  key: KeyBinding | null
  reason: 'enable' | 'reset'
}
type RecordingIntent =
  | { kind: 'preserve-enabled' }
  | { kind: 'enable'; reason: BindingRequest['reason'] }
type Recorder = ShortcutTarget & {
  draft: KeyBinding | null
  initialKey: KeyBinding | null
  additionalKeys: (KeyBinding | null)[]
  initialAdditionalKeys: KeyBinding[]
  intent: RecordingIntent
  snapshot: ShortcutEditSnapshot
  preferredSpeed?: { initial: number; draft: string }
  isNewPreferredSpeed?: boolean
}
type Editing =
  | { kind: 'idle' }
  | { kind: 'confirm'; request: BindingRequest }
  | { kind: 'record'; recorder: Recorder }
type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

const recorderDraft = (recorder: Recorder): ShortcutEditDraft => ({
  snapshot: recorder.snapshot,
  keys: { [recorder.action]: recorder.draft },
  additionalKeys: { [recorder.action]: recorder.additionalKeys },
  enabled: recorder.intent.kind === 'enable' ? true : 'preserve',
  value: recorder.preferredSpeed?.draft,
  allowSubtitleEnable: recorder.intent.kind === 'enable' && recorder.intent.reason === 'reset',
})

function applyBindingRequest(
  settings: ShortcutSettings,
  request: BindingRequest,
  enabled: boolean,
  transfer: boolean,
  supportsSubtitlePreservingPip: boolean,
): ShortcutSettings {
  if (
    request.group === 'subtitleNavigation' && request.reason === 'enable' && enabled &&
    !settings.subtitleNavigation.bindings[request.action].enabled &&
    (!settings.enabled || !settings.subtitleNavigation.enabled)
  ) return settings
  const next = applyShortcutAssignment(settings, [request], { enabled, transfer, supportsSubtitlePreservingPip })
  return next !== settings && request.reason === 'reset' && request.action === 'setPreferredSpeed'
    ? { ...next, speed: { ...next.speed, preferred: DEFAULT_SETTINGS.speed.preferred } }
    : next
}

export function useShortcutEditor({
  settings,
  updateSettings,
  supportsSubtitlePreservingPip,
}: Pick<SettingsForm, 'settings' | 'updateSettings'> & {
  supportsSubtitlePreservingPip: boolean
}) {
  const [editing, setEditing] = useState<Editing>({ kind: 'idle' })
  const recorderReturnFocus = useRef<HTMLButtonElement | null>(null)
  useEffect(() => subscribeSettings(() => {
    setEditing(current => current.kind === 'confirm' ? { kind: 'idle' } : current)
  }), [])

  const bindingFor = (target: ShortcutTarget) => target.group === 'subtitleNavigation'
    ? settings.subtitleNavigation.bindings[target.action]
    : settings.bindings[target.action]
  const conflictsFor = (target: ShortcutTarget, key: KeyBinding | null, additionalKeys = bindingFor(target)?.additionalKeys ?? []) =>
    inspectShortcutAssignment(settings, [{ ...target, key, additionalKeys }], { enabled: true, supportsSubtitlePreservingPip })
  const requestEnabled = (
    target: ShortcutTarget,
    enabled: boolean,
    key = bindingFor(target).key,
    reason: BindingRequest['reason'] = 'enable',
  ) => {
    const additionalKeys = reason === 'reset' ? [] : bindingFor(target).additionalKeys ?? []
    const request: BindingRequest = { ...target, savedKey: bindingFor(target).key,
      savedAdditionalKeys: bindingFor(target).additionalKeys ?? [], additionalKeys, key, reason }
    if (enabled && conflictsFor(target, key, additionalKeys).conflicts.length) {
      setEditing({ kind: 'confirm', request })
      return
    }
    setEditing({ kind: 'idle' })
    updateSettings(current => applyBindingRequest(current, request, enabled, false, supportsSubtitlePreservingPip))
  }

  const request = editing.kind === 'confirm' ? editing.request : null
  const validRequest = request &&
    bindingFor(request) && keyBindingsEqual(request.savedKey, bindingFor(request).key) &&
    keyListsEqual(request.savedAdditionalKeys, bindingFor(request).additionalKeys ?? []) &&
    (request.group === 'general' || (settings.enabled && (request.reason === 'reset' || settings.subtitleNavigation.enabled)))
    ? request : null
  const conflictAnalysis = validRequest ? conflictsFor(validRequest, validRequest.key, validRequest.additionalKeys) : null
  const conflict = validRequest && conflictAnalysis ? {
    group: validRequest.group,
    action: validRequest.action,
    keys: conflictAnalysis.conflictingKeys,
    actions: conflictAnalysis.conflicts,
    affectedTargets: conflictAnalysis.affectedTargets,
  } : null

  const recorder = editing.kind === 'record' && (editing.recorder.isNewPreferredSpeed || bindingFor(editing.recorder)) ? editing.recorder : null
  const evaluation = recorder ? evaluateShortcutEdit(settings, recorderDraft(recorder), supportsSubtitlePreservingPip) : null
  const preferredSpeedStale = Boolean(recorder?.preferredSpeed && evaluation?.stale)
  const keyConflicts = recorder && evaluation?.analysis.keyConflicts[recorder.action]
  const activeConflict = Boolean(keyConflicts?.length)
  const validDraft = Boolean(
    recorder && !activeConflict && !preferredSpeedStale && (
      recorder?.group === 'general' || (settings.enabled && recorder && (
        recorder.intent.kind === 'preserve-enabled' ||
        recorder.intent.reason === 'reset' ||
        settings.subtitleNavigation.enabled
      ))
    )
  )
  const storageFull = validDraft && (evaluation?.storageFull ?? false)
  const canSaveDraft = validDraft && Boolean(evaluation?.canSave)
  const canRestoreDraft = Boolean(recorder && (
    !recordedKeysEqual([recorder.draft, ...recorder.additionalKeys], [recorder.initialKey, ...recorder.initialAdditionalKeys]) ||
    (recorder.preferredSpeed && recorder.preferredSpeed.draft !== String(recorder.preferredSpeed.initial))
  ))
  const replacedNetflixKeys = recorder && [recorder.draft, ...recorder.additionalKeys].some(Boolean) && !activeConflict && recorder.group === 'general'
    ? getReplacedNetflixNativeKeyBindings(recorder.action, { enabled: settings.bindings[recorder.action]?.enabled ?? true,
        key: recorder.draft, additionalKeys: recorder.additionalKeys.filter((key): key is KeyBinding => key !== null) })
    : []

  return {
    conflict,
    recorder: recorder && {
      keys: [recorder.draft, ...recorder.additionalKeys],
      keyConflicts: keyConflicts ?? undefined,
      canSaveDraft,
      canRestoreDraft,
      replacedNetflixKeys,
      preferredSpeed: recorder.preferredSpeed?.draft,
      preferredSpeedStale,
      storageFull,
    },
    setBindingEnabled: (target: ShortcutTarget, enabled: boolean) => requestEnabled(target, enabled),
    resetBinding: (target: ShortcutTarget) => {
      if (target.group === 'general' && !isShortcutAction(target.action)) return
      const binding = target.group === 'subtitleNavigation'
        ? DEFAULT_SETTINGS.subtitleNavigation.bindings[target.action] : DEFAULT_SETTINGS.bindings[target.action]
      requestEnabled(target, binding.enabled, binding.key, 'reset')
    },
    edit: (target: ShortcutTarget, returnFocus?: HTMLButtonElement) => {
      const { key, additionalKeys = [] } = bindingFor(target)
      const speed = target.group === 'general' ? getPreferredSpeed(settings, target.action) : undefined
      recorderReturnFocus.current = returnFocus ?? null
      setEditing({
        kind: 'record',
        recorder: { ...target, initialKey: key, draft: key, additionalKeys,
          initialAdditionalKeys: additionalKeys, intent: { kind: 'preserve-enabled' },
          snapshot: captureShortcutEdit(settings, speed !== undefined && target.group === 'general'
            ? { kind: 'preferredSpeed', action: target.action as 'setPreferredSpeed' | `preferred-speed:${string}` }
            : { kind: 'binding', target }),
          ...(speed !== undefined ? { preferredSpeed: { initial: speed, draft: String(speed) } } : {}) },
      })
    },
    addPreferredSpeed: (returnFocus: HTMLButtonElement) => {
      recorderReturnFocus.current = returnFocus
      const action = `preferred-speed:${crypto.randomUUID()}` as const
      setEditing({ kind: 'record', recorder: { group: 'general', action,
        snapshot: captureShortcutEdit(settings, { kind: 'preferredSpeed', action, isNew: true }),
        initialKey: null, draft: null, additionalKeys: [], initialAdditionalKeys: [], intent: { kind: 'enable', reason: 'enable' }, isNewPreferredSpeed: true,
        preferredSpeed: { initial: DEFAULT_SETTINGS.speed.preferred, draft: String(DEFAULT_SETTINGS.speed.preferred) } } })
    },
    dismissConflict: () => setEditing(current => current.kind === 'confirm' ? { kind: 'idle' } : current),
    changeConflictKey: (returnFocus: HTMLButtonElement | null) => {
      if (!validRequest) return
      const { key, reason, ...target } = validRequest
      const speed = target.group === 'general' ? getPreferredSpeed(settings, target.action) : undefined
      const initialSpeed = speed !== undefined && reason === 'reset' ? DEFAULT_SETTINGS.speed.preferred : speed
      recorderReturnFocus.current = returnFocus
      setEditing({
        kind: 'record',
        recorder: { ...target, initialKey: key, draft: key, initialAdditionalKeys: target.additionalKeys, intent: { kind: 'enable', reason },
          snapshot: captureShortcutEdit(settings, speed !== undefined && target.group === 'general'
            ? { kind: 'preferredSpeed', action: target.action as 'setPreferredSpeed' | `preferred-speed:${string}` }
            : { kind: 'binding', target }),
          ...(initialSpeed !== undefined ? { preferredSpeed: { initial: initialSpeed, draft: String(initialSpeed) } } : {}) },
      })
    },
    confirmTransfer: () => {
      if (!validRequest) return
      setEditing({ kind: 'idle' })
      updateSettings(current => applyBindingRequest(current, validRequest, true, true, supportsSubtitlePreservingPip))
    },
    capture: (draft: KeyBinding | null) => setEditing(current => {
      if (current.kind === 'record') return { ...current, recorder: { ...current.recorder, draft } }
      return current
    }),
    captureKeys: (keys: (KeyBinding | null)[]) => setEditing(current => current.kind === 'record'
      ? { ...current, recorder: { ...current.recorder, draft: keys[0] ?? null, additionalKeys: keys.slice(1) } } : current),
    setPreferredSpeed: (draft: string) => setEditing(current => {
      if (current.kind !== 'record' || !current.recorder.preferredSpeed) return current
      return { ...current, recorder: { ...current.recorder, preferredSpeed: { ...current.recorder.preferredSpeed, draft } } }
    }),
    normalizePreferredSpeed: () => setEditing(current => {
      if (current.kind !== 'record' || !current.recorder.preferredSpeed) return current
      const { initial, draft } = current.recorder.preferredSpeed
      const value = draft.trim() && Number.isFinite(Number(draft)) ? Number(draft) : initial
      return { ...current, recorder: { ...current.recorder, preferredSpeed: {
        ...current.recorder.preferredSpeed, draft: String(normalizeSpeedSettings({ ...settings.speed, preferred: value }).preferred),
      } } }
    }),
    restoreDraft: () => setEditing(current => {
      if (current.kind === 'record') return { ...current, recorder: { ...current.recorder, draft: current.recorder.initialKey,
        additionalKeys: current.recorder.initialAdditionalKeys,
        ...(current.recorder.preferredSpeed ? { preferredSpeed: { ...current.recorder.preferredSpeed, draft: String(current.recorder.preferredSpeed.initial) } } : {}) } }
      return current
    }),
    saveDraft: () => {
      if (!recorder || !canSaveDraft) return
      updateSettings(current => evaluateShortcutEdit(current, recorderDraft(recorder), supportsSubtitlePreservingPip).settings)
      setEditing({ kind: 'idle' })
    },
    closeRecorder: () => setEditing(current => current.kind === 'record' ? { kind: 'idle' } : current),
    restoreRecorderFocus: (event: Event) => {
      const target = recorderReturnFocus.current
      recorderReturnFocus.current = null
      if (!target) return
      event.preventDefault()
      if (target.isConnected && !target.disabled) target.focus()
      else document.getElementById('shortcut-search')?.focus()
    },
  }
}
