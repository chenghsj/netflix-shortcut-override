export const SHORTCUT_ACTIONS = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'toggleSubtitles',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'speedUp',
  'speedDown',
  'speedReset',
] as const

export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number]

export const LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja', 'ko'] as const
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
  key: KeyBinding
}

export type SpeedSettings = {
  min: number
  max: number
  step: number
}

export type SpaceHoldSettings = {
  enabled: boolean
  speed: number
  showHint: boolean
}

export type SeekSettings = {
  seconds: number
}

export const PIP_SUBTITLE_SIZES = ['small', 'medium', 'large'] as const
export type PipSubtitleSize = (typeof PIP_SUBTITLE_SIZES)[number]

export const PIP_SUBTITLE_BACKGROUNDS = ['none', 'translucent', 'dark'] as const
export type PipSubtitleBackground = (typeof PIP_SUBTITLE_BACKGROUNDS)[number]

export type PipSettings = {
  subtitlesEnabled: boolean
  subtitleSize: PipSubtitleSize
  subtitleBackground: PipSubtitleBackground
}

export type ShortcutSettings = {
  version: number
  enabled: boolean
  locale: LocalePreference
  theme: ThemeMode
  speed: SpeedSettings
  spaceHold: SpaceHoldSettings
  seek: SeekSettings
  pip: PipSettings
  bindings: Record<ShortcutAction, ShortcutBinding>
}
