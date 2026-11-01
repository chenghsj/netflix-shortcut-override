import { useEffect, useRef, useState } from 'react'

import { DEFAULT_PRACTICE_BINDINGS, practiceConflict } from '@/shared/subtitle-practice'
import {
  DEFAULT_KEY_BINDINGS,
  findBindingConflict,
  findEnabledBindingConflicts,
  getReplacedNetflixNativeKeyBindings,
  keyBindingsEqual,
} from '@/shared/shortcut-bindings'
import {
  SHORTCUT_ACTIONS,
  SUBTITLE_PRACTICE_ACTIONS,
  type KeyBinding,
  type ShortcutAction,
  type ShortcutBinding,
  type ShortcutSettings,
  type SubtitlePracticeAction,
} from '@/shared/shortcut-types'
import { subscribeSettings } from '@/shared/storage'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

export type ShortcutTarget =
  | { group: 'general'; action: ShortcutAction }
  | { group: 'practice'; action: SubtitlePracticeAction }

type BindingRequest = ShortcutTarget & {
  savedKey: KeyBinding
  key: KeyBinding
  reason: 'enable' | 'reset'
}
type RecordingIntent =
  | { kind: 'preserve-enabled' }
  | { kind: 'enable'; reason: BindingRequest['reason'] }
type Recorder = ShortcutTarget & {
  draft: KeyBinding | null
  savedKey: KeyBinding
  intent: RecordingIntent
}
type Editing =
  | { kind: 'idle' }
  | { kind: 'confirm'; request: BindingRequest }
  | { kind: 'record'; recorder: Recorder }
type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

function applyBindingRequest(
  settings: ShortcutSettings,
  request: BindingRequest,
  enabled: boolean,
  replaceConflicts: boolean,
  ignoredActions: readonly ShortcutAction[],
): ShortcutSettings {
  if (
    request.group === 'practice' && request.reason === 'enable' && enabled &&
    !settings.subtitlePractice.bindings[request.action].enabled &&
    (!settings.enabled || !settings.subtitlePractice.enabled)
  ) return settings

  const update = <Action extends string>(
    bindings: Record<Action, ShortcutBinding>,
    actions: readonly Action[],
    action: Action,
    ignored: readonly Action[] = [],
  ) => {
    if (!keyBindingsEqual(bindings[action].key, request.savedKey)) return bindings
    const conflicts = findEnabledBindingConflicts(bindings, actions, action, request.key, ignored)
    if (enabled && conflicts.length && !replaceConflicts) return bindings
    const next = { ...bindings }
    if (enabled && replaceConflicts) {
      for (const conflict of conflicts) {
        next[conflict] = { ...bindings[conflict], enabled: false }
      }
    }
    next[action] = { key: request.key, enabled }
    return next
  }

  if (request.group === 'practice') {
    return {
      ...settings,
      subtitlePractice: {
        ...settings.subtitlePractice,
        bindings: update(settings.subtitlePractice.bindings, SUBTITLE_PRACTICE_ACTIONS, request.action),
      },
    }
  }
  return {
    ...settings,
    bindings: update(settings.bindings, SHORTCUT_ACTIONS, request.action, ignoredActions),
  }
}

export function useShortcutEditor({
  settings,
  updateSettings,
  ignoredGeneralActions,
}: Pick<SettingsForm, 'settings' | 'updateSettings'> & {
  ignoredGeneralActions: readonly ShortcutAction[]
}) {
  const [editing, setEditing] = useState<Editing>({ kind: 'idle' })
  const recorderReturnFocus = useRef<HTMLButtonElement | null>(null)
  useEffect(() => subscribeSettings(() => {
    setEditing(current => current.kind === 'confirm' ? { kind: 'idle' } : current)
  }), [])

  const bindingFor = (target: ShortcutTarget) => target.group === 'practice'
    ? settings.subtitlePractice.bindings[target.action]
    : settings.bindings[target.action]
  const conflictsFor = (target: ShortcutTarget, key: KeyBinding) => target.group === 'practice'
    ? findEnabledBindingConflicts(settings.subtitlePractice.bindings, SUBTITLE_PRACTICE_ACTIONS, target.action, key)
    : findEnabledBindingConflicts(settings.bindings, SHORTCUT_ACTIONS, target.action, key, ignoredGeneralActions)
  const requestEnabled = (
    target: ShortcutTarget,
    enabled: boolean,
    key = bindingFor(target).key,
    reason: BindingRequest['reason'] = 'enable',
  ) => {
    const request: BindingRequest = { ...target, savedKey: bindingFor(target).key, key, reason }
    if (enabled && conflictsFor(target, key).length) {
      setEditing({ kind: 'confirm', request })
      return
    }
    setEditing({ kind: 'idle' })
    updateSettings(current => applyBindingRequest(current, request, enabled, false, ignoredGeneralActions))
  }

  const request = editing.kind === 'confirm' ? editing.request : null
  const validRequest = request &&
    keyBindingsEqual(request.savedKey, bindingFor(request).key) &&
    (request.group === 'general' || (settings.enabled && (request.reason === 'reset' || settings.subtitlePractice.enabled)))
    ? request : null
  const conflict = validRequest ? {
    group: validRequest.group,
    action: validRequest.action,
    key: validRequest.key,
    actions: conflictsFor(validRequest, validRequest.key),
  } : null

  const recorder = editing.kind === 'record' ? editing.recorder : null
  const activeConflict = recorder?.draft && (recorder.intent.kind === 'enable' || bindingFor(recorder).enabled)
    ? recorder.group === 'practice'
      ? practiceConflict(settings, recorder.action, recorder.draft)
      : findBindingConflict(settings, recorder.action, recorder.draft, { ignoredActions: ignoredGeneralActions })
    : null
  const canSaveDraft = Boolean(
    recorder?.draft && !activeConflict && (
      recorder.group === 'general' || (settings.enabled && (
        recorder.intent.kind === 'preserve-enabled' ||
        recorder.intent.reason === 'reset' ||
        settings.subtitlePractice.enabled
      ))
    )
  )
  const canRestoreDraft = Boolean(recorder?.draft && !keyBindingsEqual(recorder.draft, recorder.savedKey))
  const replacedNetflixKeys = recorder?.draft && !activeConflict && recorder.group === 'general'
    ? getReplacedNetflixNativeKeyBindings(recorder.action, { ...settings.bindings[recorder.action], key: recorder.draft })
    : []

  return {
    conflict,
    recorder: recorder && {
      action: recorder.action,
      draft: recorder.draft,
      activeConflict,
      canSaveDraft,
      canRestoreDraft,
      replacedNetflixKeys,
    },
    setBindingEnabled: (target: ShortcutTarget, enabled: boolean) => requestEnabled(target, enabled),
    resetBinding: (target: ShortcutTarget) => requestEnabled(target, true, target.group === 'practice'
      ? DEFAULT_PRACTICE_BINDINGS[target.action].key : DEFAULT_KEY_BINDINGS[target.action], 'reset'),
    edit: (target: ShortcutTarget) => {
      const savedKey = bindingFor(target).key
      setEditing({
        kind: 'record',
        recorder: { ...target, savedKey, draft: savedKey, intent: { kind: 'preserve-enabled' } },
      })
    },
    dismissConflict: () => setEditing(current => current.kind === 'confirm' ? { kind: 'idle' } : current),
    changeConflictKey: (returnFocus: HTMLButtonElement | null) => {
      if (!validRequest) return
      const { key, reason, ...target } = validRequest
      recorderReturnFocus.current = returnFocus
      setEditing({
        kind: 'record',
        recorder: { ...target, draft: key, intent: { kind: 'enable', reason } },
      })
    },
    confirmTransfer: () => {
      if (!validRequest) return
      setEditing({ kind: 'idle' })
      updateSettings(current => applyBindingRequest(current, validRequest, true, true, ignoredGeneralActions))
    },
    capture: (draft: KeyBinding) => setEditing(current => current.kind === 'record'
      ? { ...current, recorder: { ...current.recorder, draft } } : current),
    restoreSavedDraft: () => setEditing(current => current.kind === 'record'
      ? { ...current, recorder: { ...current.recorder, draft: current.recorder.savedKey } } : current),
    saveDraft: () => {
      if (!recorder?.draft || !canSaveDraft) return
      const { draft, intent, ...target } = recorder
      const request: BindingRequest = {
        ...target,
        key: draft,
        reason: intent.kind === 'enable' ? intent.reason : 'enable',
      }
      const enabled = intent.kind === 'enable' || bindingFor(recorder).enabled
      updateSettings(current => applyBindingRequest(current, request, enabled, false, ignoredGeneralActions))
      setEditing({ kind: 'idle' })
    },
    closeRecorder: () => setEditing(current => current.kind === 'record' ? { kind: 'idle' } : current),
    restoreRecorderFocus: (event: Event) => {
      const target = recorderReturnFocus.current
      recorderReturnFocus.current = null
      if (!target) return
      event.preventDefault()
      if (target.isConnected && !target.disabled) target.focus()
    },
  }
}
