import { FeatureCheckbox } from '@/components/feature-checkbox'
import { getFeatureGroupActions, hideFeatureGroup, isFeatureHidden, restoreFeatureGroup, type ManagedFeatureGroup } from '@/shared/feature-management'
import { FEATURE_MANAGEMENT_COPY } from '@/shared/feature-management-copy'
import type { Locale, ShortcutSettings } from '@/shared/shortcut-types'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

export function FeatureGroupCheckbox({ settings, group, label, locale, supportsSubtitlePreservingPip, updateSettings }: {
  settings: ShortcutSettings
  group: ManagedFeatureGroup
  label: string
  locale: Locale
  supportsSubtitlePreservingPip: boolean
  updateSettings: ReturnType<typeof useShortcutSettingsForm>['updateSettings']
}) {
  const actions = getFeatureGroupActions(settings, group)
  const visible = actions.filter(action => !isFeatureHidden(settings, { group: 'general', action }))
  const checked = actions.length ? visible.length === actions.length ? true : visible.length ? 'indeterminate' : false
    : !settings.hiddenFeatures.includes(`group:${group}`)
  return <FeatureCheckbox checked={checked} aria-label={FEATURE_MANAGEMENT_COPY[locale].show.replace('{action}', label)}
    onCheckedChange={checked => updateSettings(current => checked === true
      ? restoreFeatureGroup(current, group, supportsSubtitlePreservingPip)
      : hideFeatureGroup(current, group))} />
}
