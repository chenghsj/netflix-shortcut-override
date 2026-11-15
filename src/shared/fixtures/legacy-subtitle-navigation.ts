import { DEFAULT_SETTINGS } from '../shortcut-settings'

// Schemas before v27 required every subtitle shortcut to have a key.
export function legacySubtitleNavigation() {
  const settings = structuredClone(DEFAULT_SETTINGS.subtitleNavigation)
  settings.bindings.replay = {
    enabled: false,
    key: { code: 'KeyS', key: 's', ctrl: false, alt: false, shift: false, meta: false },
  }
  return settings
}
