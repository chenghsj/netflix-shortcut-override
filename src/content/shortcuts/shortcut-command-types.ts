import type { ShortcutSettings } from '@/shared/shortcuts'

export type CommandContext = {
  settings: ShortcutSettings
  targetDoc: Document
  isCurrentAction: () => boolean
}

export type ShortcutCommand = (context: CommandContext) => boolean
