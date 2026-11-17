import type { PreferredSpeedShortcut, ShortcutAction, ShortcutSettings } from './shortcut-types'

export const PREFERRED_SPEED_LIMITS = { min: 0.25, max: 5, inputStep: 0.05 } as const

export const isPreferredSpeedShortcut = (value: unknown): value is PreferredSpeedShortcut => {
  if (!value || typeof value !== 'object') return false
  const shortcut = value as Partial<PreferredSpeedShortcut>
  return typeof shortcut.id === 'string' && /^preferred-speed:[a-zA-Z0-9-]{1,64}$/.test(shortcut.id) &&
    typeof shortcut.speed === 'number' && Number.isFinite(shortcut.speed) && shortcut.speed >= PREFERRED_SPEED_LIMITS.min && shortcut.speed <= PREFERRED_SPEED_LIMITS.max &&
    Math.abs(shortcut.speed * 20 - Math.round(shortcut.speed * 20)) < 1e-9
}

export const getPreferredSpeed = (settings: ShortcutSettings, action: ShortcutAction): number | undefined =>
  action === 'setPreferredSpeed' ? settings.speed.preferred : settings.preferredSpeedShortcuts.find(shortcut => shortcut.id === action)?.speed
