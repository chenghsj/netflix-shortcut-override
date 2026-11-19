import type { ShortcutSettings } from '@/shared/shortcut-types'

export type PlaybackIntent = 'play' | 'pause' | 'toggle'
export type ShortcutRequest = { time: number; order: number }
export type PlaybackDispatcher = (intent: PlaybackIntent, execute: () => void, cancel?: () => void) => void

export type CommandContext = {
  settings: ShortcutSettings
  targetDoc: Document
  request?: ShortcutRequest
  isCurrentAction: () => boolean
  isCancelled: () => boolean
}

export type ShortcutCommand = (context: CommandContext) => boolean
