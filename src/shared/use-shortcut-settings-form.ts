import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import {
  DEFAULT_SETTINGS,
  normalizeSeekSettings,
  normalizeSettings,
  normalizeSpeedSettings,
  type ShortcutSettings,
} from '@/shared/shortcuts'
import { getSettings, saveSettings, subscribeSettings } from '@/shared/storage'

export type SpeedField = keyof ShortcutSettings['speed']
export type SeekField = keyof ShortcutSettings['seek']
export type SpeedDraft = Record<SpeedField, string>
export type SeekDraft = Record<SeekField, string>

const formatSpeedValue = (value: number): string => value.toString()
const formatSeekValue = (value: number): string => value.toString()

export const speedDraftFromSettings = (speed: ShortcutSettings['speed']): SpeedDraft => ({
  min: formatSpeedValue(speed.min),
  max: formatSpeedValue(speed.max),
  step: formatSpeedValue(speed.step),
  hold: formatSpeedValue(speed.hold),
})

export const seekDraftFromSettings = (seek: ShortcutSettings['seek']): SeekDraft => ({
  seconds: formatSeekValue(seek.seconds),
})

export const useShortcutSettingsForm = () => {
  const [settings, setSettings] = useState<ShortcutSettings>(DEFAULT_SETTINGS)
  const [speedDraft, setSpeedDraft] = useState<SpeedDraft>(() =>
    speedDraftFromSettings(DEFAULT_SETTINGS.speed)
  )
  const [seekDraft, setSeekDraft] = useState<SeekDraft>(() =>
    seekDraftFromSettings(DEFAULT_SETTINGS.seek)
  )
  const [loaded, setLoaded] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, startSavingTransition] = useTransition()
  const latestSettingsRef = useRef<ShortcutSettings>(DEFAULT_SETTINGS)
  const saveRequestIdRef = useRef(0)

  const syncDrafts = useCallback((nextSettings: ShortcutSettings) => {
    latestSettingsRef.current = nextSettings
    setSettings(nextSettings)
    setSpeedDraft(speedDraftFromSettings(nextSettings.speed))
    setSeekDraft(seekDraftFromSettings(nextSettings.seek))
  }, [])

  useEffect(() => {
    let active = true

    void getSettings()
      .then(nextSettings => {
        if (!active) return
        syncDrafts(nextSettings)
        setSaveError(null)
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
    }
  }, [syncDrafts])

  useEffect(
    () =>
      subscribeSettings(nextSettings => {
        syncDrafts(nextSettings)
      }),
    [syncDrafts]
  )

  const updateSettings = (updater: (current: ShortcutSettings) => ShortcutSettings) => {
    const normalized = normalizeSettings(updater(latestSettingsRef.current))
    latestSettingsRef.current = normalized
    setSettings(normalized)
    setSaveError(null)

    const saveRequestId = (saveRequestIdRef.current += 1)
    startSavingTransition(async () => {
      try {
        await saveSettings(normalized)
        if (saveRequestIdRef.current === saveRequestId) setSaveError(null)
      } catch (error) {
        if (saveRequestIdRef.current !== saveRequestId) return
        setSaveError(error instanceof Error ? error.message : 'Unable to save settings.')
      }
    })
  }

  const setSpeedDraftField = (field: SpeedField, value: string) => {
    setSpeedDraft(current => ({
      ...current,
      [field]: value,
    }))
  }

  const setSeekDraftSeconds = (value: string) => {
    setSeekDraft({ seconds: value })
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
    setSpeedDraft(speedDraftFromSettings(nextSpeed))
    updateSettings(current => ({
      ...current,
      speed: normalizeSpeedSettings({
        ...current.speed,
        [field]: parsed,
      }),
    }))
  }

  const commitSeekSeconds = () => {
    const draftValue = seekDraft.seconds.trim()
    const parsed = Number.parseFloat(draftValue)

    if (!draftValue || !Number.isFinite(parsed)) {
      setSeekDraftSeconds(formatSeekValue(settings.seek.seconds))
      return
    }

    const nextSeek = normalizeSeekSettings({
      ...settings.seek,
      seconds: parsed,
    })
    setSeekDraft(seekDraftFromSettings(nextSeek))
    updateSettings(current => ({
      ...current,
      seek: normalizeSeekSettings({
        ...current.seek,
        seconds: parsed,
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

  const handleSeekKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      return
    }

    if (event.key === 'Escape') {
      setSeekDraftSeconds(formatSeekValue(settings.seek.seconds))
      event.currentTarget.blur()
    }
  }

  return {
    settings,
    speedDraft,
    seekDraft,
    loaded,
    isSaving,
    saveError,
    updateSettings,
    setSpeedDraft,
    setSpeedDraftField,
    setSeekDraft,
    setSeekDraftSeconds,
    commitSpeedField,
    commitSeekSeconds,
    handleSpeedKeyDown,
    handleSeekKeyDown,
  }
}
