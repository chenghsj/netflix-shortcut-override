import { useCallback, useState } from 'react'
import type { ShortcutSettings } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type Update = (current: ShortcutSettings) => ShortcutSettings
const featureState = (settings: ShortcutSettings) => JSON.stringify([
  settings.enabled, settings.bindings, settings.subtitleNavigation, settings.holdSpeed.enabled, settings.hiddenFeatures,
])

export function useFeatureManagement({ settings, updateSettings }: {
  settings: ShortcutSettings
  updateSettings: ReturnType<typeof useShortcutSettingsForm>['updateSettings']
}) {
  const [draft, setDraft] = useState<{ base: string; updates: Update[] } | null>(null)
  const cancel = useCallback(() => setDraft(null), [])
  const stale = Boolean(draft && draft.base !== featureState(settings))

  return {
    settings: draft?.updates.reduce((current, update) => update(current), settings) ?? settings,
    stale,
    start: () => setDraft({ base: featureState(settings), updates: [] }),
    cancel,
    updateSettings: (update: Update) => {
      if (draft) setDraft(current => current && { ...current, updates: [...current.updates, update] })
      else updateSettings(update)
    },
    apply: () => {
      // Replay against the latest settings to preserve unrelated edits from other views.
      if (stale) return
      if (draft?.updates.length) updateSettings(current => featureState(current) === draft.base
        ? draft.updates.reduce((next, update) => update(next), current) : current)
      setDraft(null)
    },
  }
}
