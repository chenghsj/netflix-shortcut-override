import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  normalizeSpeedSettings,
} from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import { observeSettings, saveSettings, updateSettings as storageUpdateSettings } from '@/shared/storage'

export type SpeedField = 'min' | 'max' | 'step'
export type SpeedDraft = Record<SpeedField, string>

const formatSpeedValue = (value: number): string => value.toString()

const speedDraftFromSettings = (speed: ShortcutSettings['speed']): SpeedDraft => ({
  min: formatSpeedValue(speed.min),
  max: formatSpeedValue(speed.max),
  step: formatSpeedValue(speed.step),
})

const reconcileDraftValue = (draft: string, previous: number, next: number): string =>
  draft === previous.toString() ? next.toString() : draft

const reconcileSpeedDraft = (
  draft: SpeedDraft,
  previous: ShortcutSettings['speed'],
  next: ShortcutSettings['speed']
): SpeedDraft => ({
  min: reconcileDraftValue(draft.min, previous.min, next.min),
  max: reconcileDraftValue(draft.max, previous.max, next.max),
  step: reconcileDraftValue(draft.step, previous.step, next.step),
})

type SaveRequest = { id: number; observation: number }
type SaveOutcome =
  | { kind: 'saved'; settings: ShortcutSettings }
  | { kind: 'failed'; error: unknown }

export const useShortcutSettingsForm = () => {
  const [settings, setSettings] = useState<ShortcutSettings>(DEFAULT_SETTINGS)
  const [speedDraft, setSpeedDraft] = useState<SpeedDraft>(() =>
    speedDraftFromSettings(DEFAULT_SETTINGS.speed)
  )
  const [loaded, setLoaded] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const latestSettingsRef = useRef<ShortcutSettings>(DEFAULT_SETTINGS)
  const confirmedSettingsRef = useRef<ShortcutSettings>(DEFAULT_SETTINGS)
  const observationRef = useRef(0)
  const saveRequestIdRef = useRef(0)
  const confirmedRequestIdRef = useRef(0)
  const mountedRef = useRef(true)

  const syncDrafts = useCallback((nextSettings: ShortcutSettings) => {
    const previous = latestSettingsRef.current
    latestSettingsRef.current = nextSettings
    setSettings(nextSettings)
    setSpeedDraft(draft => reconcileSpeedDraft(draft, previous.speed, nextSettings.speed))
  }, [])

  useEffect(() => {
    let active = true
    mountedRef.current = true

    const observation = observeSettings(nextSettings => {
      const confirmed = {
        ...nextSettings,
        uiStyle: nextSettings.uiStyle ?? latestSettingsRef.current.uiStyle,
      }
      observationRef.current += 1
      confirmedSettingsRef.current = confirmed
      syncDrafts(confirmed)
    })
    void observation.ready
      .then(() => {
        if (active) setSaveError(null)
      })
      .catch(error => {
        if (!active) return
        setSaveError(error instanceof Error ? error.message : 'Unable to load settings.')
      })
      .finally(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
      mountedRef.current = false
      saveRequestIdRef.current += 1
      observation.unsubscribe()
    }
  }, [syncDrafts])

  const settleSave = (request: SaveRequest, outcome: SaveOutcome) => {
    if (!mountedRef.current) return
    if (
      outcome.kind === 'saved' && request.observation === observationRef.current &&
      request.id > confirmedRequestIdRef.current
    ) {
      confirmedSettingsRef.current = outcome.settings
      confirmedRequestIdRef.current = request.id
    }
    if (request.id !== saveRequestIdRef.current) return
    syncDrafts(confirmedSettingsRef.current)
    setSaveError(outcome.kind === 'failed'
      ? outcome.error instanceof Error ? outcome.error.message : 'Unable to save settings.'
      : null)
  }

  const submitSave = (write: () => Promise<ShortcutSettings>): Promise<ShortcutSettings> => {
    const request = { id: ++saveRequestIdRef.current, observation: observationRef.current }
    setSaveError(null)
    const promise = write()
    void promise.then(
      settings => settleSave(request, { kind: 'saved', settings }),
      error => settleSave(request, { kind: 'failed', error })
    )
    return promise
  }

  const updateSettings = (updater: (current: ShortcutSettings) => ShortcutSettings) => {
    const normalized = normalizeSettings(updater(latestSettingsRef.current))
    latestSettingsRef.current = normalized
    setSettings(normalized)
    void submitSave(() => storageUpdateSettings(updater))
  }

  const replaceSettings = (nextSettings: ShortcutSettings): Promise<ShortcutSettings> =>
    submitSave(() => saveSettings(normalizeSettings(nextSettings)))

  const setSpeedDraftField = (field: SpeedField, value: string) => {
    setSpeedDraft(current => ({
      ...current,
      [field]: value,
    }))
  }

  const commitSpeedField = (field: SpeedField) => {
    const draftValue = speedDraft[field].trim()
    const parsed = Number.parseFloat(draftValue)

    if (!draftValue || !Number.isFinite(parsed)) {
      setSpeedDraftField(field, formatSpeedValue(settings.speed[field]))
      return
    }

    const nextSpeed = normalizeSpeedSettings({
      ...settings.speed,
      [field]: parsed,
    })
    setSpeedDraft(draft => ({
      ...reconcileSpeedDraft(draft, settings.speed, nextSpeed),
      [field]: formatSpeedValue(nextSpeed[field]),
    }))
    updateSettings(current => ({
      ...current,
      speed: normalizeSpeedSettings({
        ...current.speed,
        [field]: parsed,
      }),
    }))
  }

  const handleSpeedKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      const field = event.currentTarget.dataset.speedField as SpeedField | undefined
      if (!field) return
      setSpeedDraftField(field, formatSpeedValue(settings.speed[field]))
      event.currentTarget.blur()
    }
  }

  const resetShortcutBindings = () => {
    updateSettings(current => ({ ...current, seekShortcuts: [], preferredSpeedShortcuts: [], hiddenFeatures: current.hiddenFeatures.filter(id => !id.startsWith('group:')), subtitleSizeCycle: DEFAULT_SETTINGS.subtitleSizeCycle, subtitleSizeShortcuts: [], bindings: DEFAULT_SETTINGS.bindings }))
  }

  const resetHoldSpeed = () => {
    updateSettings(current => ({ ...current, holdSpeed: DEFAULT_SETTINGS.holdSpeed }))
  }

  const setHoldSpeedEnabled = (enabled: boolean) => {
    updateSettings(current => ({
      ...current,
      holdSpeed: { ...current.holdSpeed, enabled },
    }))
  }

  const setHoldSpeedShowHint = (showHint: boolean) => {
    updateSettings(current => ({
      ...current,
      holdSpeed: { ...current.holdSpeed, showHint },
    }))
  }

  const holdSpeedEnableControlDisabled = !settings.bindings.playPause.enabled
  const holdSpeedDetailsDisabled =
    holdSpeedEnableControlDisabled || !settings.holdSpeed.enabled

  return {
    settings,
    loaded,
    saveError,
    updateSettings,
    replaceSettings,
    resetShortcutBindings,
    speed: {
      draft: speedDraft,
      setField: setSpeedDraftField,
      commitField: commitSpeedField,
      handleKeyDown: handleSpeedKeyDown,
    },
    holdSpeed: {
      enabled: settings.holdSpeed.enabled,
      showHint: settings.holdSpeed.showHint,
      enableControlDisabled: holdSpeedEnableControlDisabled,
      detailsDisabled: holdSpeedDetailsDisabled,
      setEnabled: setHoldSpeedEnabled,
      setShowHint: setHoldSpeedShowHint,
      reset: resetHoldSpeed,
    },
  }
}
