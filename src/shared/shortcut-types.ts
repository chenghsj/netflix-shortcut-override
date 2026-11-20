import type { UiStyle } from './ui-styles'
import type { SubtitleFavorite } from './subtitle-favorites'
import type { AudioFavorite } from './audio-favorites'

export { UI_STYLES } from './ui-styles'
export type { UiStyle } from './ui-styles'

export const SHORTCUT_ACTIONS = [
  'playPause',
  'seekBackward',
  'seekForward',
  'previousFrame',
  'nextFrame',
  'volumeUp',
  'volumeDown',
  'mute',
  'toggleSubtitles',
  'cycleSubtitleTrack',
  'previousSubtitleTrack',
  'previousAudioTrack',
  'nextAudioTrack',
  'cycleSubtitleSize',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'previousEpisode',
  'nextEpisode',
  'speedUp',
  'speedDown',
  'setPreferredSpeed',
  'speedReset',
] as const

export type BuiltinShortcutAction = (typeof SHORTCUT_ACTIONS)[number]
export type SeekShortcutAction = `seek:${string}`
export type SubtitleSizeShortcutAction = `subtitle-size:${string}`
export type PreferredSpeedShortcutAction = `preferred-speed:${string}`
export type ShortcutAction = BuiltinShortcutAction | SeekShortcutAction | SubtitleSizeShortcutAction | PreferredSpeedShortcutAction

export type PreferredSpeedShortcut = {
  id: PreferredSpeedShortcutAction
  speed: number
}

export type SubtitleSizeShortcut = {
  id: SubtitleSizeShortcutAction
  kind: 'cycle' | 'fixed'
  sizes: number[]
}

export type SeekShortcut = {
  id: SeekShortcutAction
  kind: 'relative' | 'percentage'
  // A relative entry owns a positive shared interval and two derived key actions.
  value: number
}

export const LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja', 'ko', 'es', 'pt-BR', 'fr', 'de', 'id'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_PREFERENCES = ['auto', ...LOCALES] as const
export type LocalePreference = (typeof LOCALE_PREFERENCES)[number]

export const THEME_MODES = ['auto', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export type KeyBinding = {
  code: string
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type KeyEventLike = {
  code: string
  key: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

export type ShortcutBinding = {
  enabled: boolean
  // Keep the original key field for single-key settings and older backups.
  key: KeyBinding | null
  // Saved bindings have a primary key before any additional keys; no empty rows.
  additionalKeys?: KeyBinding[]
}

export type SpeedSettings = {
  min: number
  max: number
  step: number
  preferred: number
}

export type HoldSpeedSettings = {
  enabled: boolean
  speed: number
  showHint: boolean
}

export type SeekSettings = {
  seconds: number
}

export type AutoSkipSettings = {
  intro: boolean
  recap: boolean
}

export const PIP_SUBTITLE_SIZES = ['small', 'medium', 'large'] as const
export type PipSubtitleSize = (typeof PIP_SUBTITLE_SIZES)[number]
export type SubtitleSize = PipSubtitleSize | number

export const PIP_SUBTITLE_BACKGROUNDS = ['none', 'translucent', 'dark'] as const
export type PipSubtitleBackground = (typeof PIP_SUBTITLE_BACKGROUNDS)[number]

export type PipSettings = {
  subtitlesEnabled: boolean
  subtitleSize: SubtitleSize
  subtitleBackground: PipSubtitleBackground
}

export const SUBTITLE_NAVIGATION_ACTIONS = ['previous', 'next', 'replay', 'playback'] as const
export type SubtitleNavigationAction = (typeof SUBTITLE_NAVIGATION_ACTIONS)[number]
export type SubtitleNavigationSettings = { enabled: boolean; bindings: Record<SubtitleNavigationAction, ShortcutBinding> }

export type ShortcutSettings = {
  version: number
  enabled: boolean
  locale: LocalePreference
  hiddenFeatures: string[]
  theme: ThemeMode
  uiStyle: UiStyle
  speed: SpeedSettings
  preferredSpeedShortcuts: PreferredSpeedShortcut[]
  subtitleNavigation: SubtitleNavigationSettings
  subtitleFavorites: SubtitleFavorite[]
  audioFavorites: AudioFavorite[]
  subtitleSize: SubtitleSize
  subtitleSizeCycle: number[]
  subtitleSizeShortcuts: SubtitleSizeShortcut[]
  holdSpeed: HoldSpeedSettings
  seek: SeekSettings
  seekShortcuts: SeekShortcut[]
  autoSkip: AutoSkipSettings
  autoNextEpisode: boolean
  hidePauseOverlay: boolean
  pip: PipSettings
  bindings: Record<ShortcutAction, ShortcutBinding>
}
