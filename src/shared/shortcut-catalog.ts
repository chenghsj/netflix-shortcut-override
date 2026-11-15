import { getSeekPairAction } from './seek-shortcuts'
import type { SeekShortcut, ShortcutAction, ShortcutSettings } from './shortcut-types'

export type ShortcutSeekPair = {
  id: string
  shortcut: SeekShortcut | null
  actions: { backward: ShortcutAction; forward: ShortcutAction }
}

// Domain relationships only. Each view owns its labels, order, visibility and search.
export function createShortcutCatalog(settings: Pick<ShortcutSettings, 'seekShortcuts' | 'preferredSpeedShortcuts'>) {
  const pairs: ShortcutSeekPair[] = [
    { id: 'builtin', shortcut: null, actions: { backward: 'seekBackward', forward: 'seekForward' } },
    ...settings.seekShortcuts.filter(shortcut => shortcut.kind === 'relative').map(shortcut => ({
      id: shortcut.id,
      shortcut,
      actions: { backward: getSeekPairAction(shortcut, 'backward'), forward: getSeekPairAction(shortcut, 'forward') },
    })),
  ]
  const percentages = settings.seekShortcuts.filter(shortcut => shortcut.kind === 'percentage')

  return {
    groups: {
      seek: { pairs, actions: pairs.flatMap(pair => [pair.actions.backward, pair.actions.forward]) },
      percentage: { shortcuts: percentages, actions: percentages.map(shortcut => shortcut.id) },
      preferredSpeed: { actions: ['setPreferredSpeed' as const, ...settings.preferredSpeedShortcuts.map(shortcut => shortcut.id)] },
    },
    holdSpeed: { id: 'holdSpeed' as const, parentAction: 'playPause' as const },
    seekPairFor: (action: ShortcutAction) => pairs.find(pair => pair.actions.backward === action || pair.actions.forward === action),
  }
}
