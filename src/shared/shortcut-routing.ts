import { bindingMatchesKey, findActionForKey, getBindingKeys, getShortcutActions, keyBindingFromEvent } from './shortcut-bindings'
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
    return binding.enabled && bindingMatchesKey(binding, key)
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
    settings.bindings[action].enabled && bindingMatchesKey(settings.bindings[action], key) &&
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
  const resolved = binding.enabled && settings.subtitleNavigation.enabled
    ? getBindingKeys(binding).map(key => resolvePlaybackShortcut(settings, {
        ...key, ctrlKey: key.ctrl, altKey: key.alt, shiftKey: key.shift, metaKey: key.meta,
      }, supportsSubtitlePreservingPip)).find(match => match?.group === 'general' && match.supported)
    : null
  return { overridingAction: resolved?.group === 'general' && resolved.supported ? resolved.action : undefined }
}
