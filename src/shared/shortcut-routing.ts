import { findActionForKey, getShortcutActions, keyBindingFromEvent, keyBindingsEqual } from './shortcut-bindings'
import {
  SUBTITLE_NAVIGATION_ACTIONS,
  type KeyBinding,
  type KeyEventLike,
  type ShortcutAction,
  type ShortcutSettings,
  type SubtitleNavigationAction,
} from './shortcut-types'

export type ShortcutTarget =
  | { group: 'general'; action: ShortcutAction }
  | { group: 'subtitleNavigation'; action: SubtitleNavigationAction }

const subtitleActionForKey = (settings: ShortcutSettings, key: KeyBinding) => {
  if (!settings.enabled || !settings.subtitleNavigation.enabled) return undefined
  return SUBTITLE_NAVIGATION_ACTIONS.find(action => {
    const binding = settings.subtitleNavigation.bindings[action]
    return binding.enabled && keyBindingsEqual(binding.key, key)
  })
}

export const getShortcutAvailability = (
  _settings: ShortcutSettings,
  action: ShortcutAction,
  supportsSubtitlePreservingPip: boolean,
) => {
  const supported = action !== 'pictureInPicture' || supportsSubtitlePreservingPip
  return { supported }
}

// Support is reported separately from matching so an unsupported binding is
// released without falling through to suppression of a remapped native key.
export const resolvePlaybackShortcut = (
  settings: ShortcutSettings,
  event: KeyEventLike,
  supportsSubtitlePreservingPip: boolean,
): (ShortcutTarget & { supported: boolean }) | null => {
  if (!settings.enabled) return null
  const key = keyBindingFromEvent(event)
  const supportedAction = getShortcutActions(settings).find(action =>
    settings.bindings[action].enabled && keyBindingsEqual(settings.bindings[action].key, key) &&
    getShortcutAvailability(settings, action, supportsSubtitlePreservingPip).supported)
  if (supportedAction) return { group: 'general', action: supportedAction, supported: true }
  const subtitleAction = subtitleActionForKey(settings, key)
  if (subtitleAction) return { group: 'subtitleNavigation', action: subtitleAction, supported: true }
  const action = findActionForKey(settings, event)
  return action ? { group: 'general', action, supported: false } : null
}

export const getSubtitleNavigationAvailability = (
  settings: ShortcutSettings,
  action: SubtitleNavigationAction,
  supportsSubtitlePreservingPip: boolean,
) => {
  const binding = settings.subtitleNavigation.bindings[action]
  const resolved = binding.key && binding.enabled && settings.subtitleNavigation.enabled
    ? resolvePlaybackShortcut(settings, {
        ...binding.key, ctrlKey: binding.key.ctrl, altKey: binding.key.alt,
        shiftKey: binding.key.shift, metaKey: binding.key.meta,
      }, supportsSubtitlePreservingPip)
    : null
  return { overridingAction: resolved?.group === 'general' && resolved.supported ? resolved.action : undefined }
}
