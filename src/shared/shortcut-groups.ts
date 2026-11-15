import type { ShortcutAction } from './shortcut-types'

export const SHORTCUT_GROUPS = [
  { title: 'playback', actions: ['playPause', 'fullscreen', 'pictureInPicture'] },
  { title: 'seeking', actions: ['previousFrame', 'nextFrame', 'skipIntro', 'previousEpisode', 'nextEpisode'] },
  { title: 'subtitles', actions: ['toggleSubtitles', 'cycleSubtitleSize', 'cycleSubtitleTrack', 'previousSubtitleTrack'] },
  { title: 'volume', actions: ['volumeUp', 'volumeDown', 'mute', 'previousAudioTrack', 'nextAudioTrack'] },
  { title: 'speed', actions: ['speedUp', 'speedDown', 'speedReset', 'setPreferredSpeed'] },
] as const satisfies readonly { title: string; actions: readonly ShortcutAction[] }[]

export const SEEK_GROUPS = ['seek', 'percentage'] as const
export const SHORTCUT_GROUP_IDS = [...SHORTCUT_GROUPS.map(group => group.title), ...SEEK_GROUPS]
export type ShortcutGroupId = typeof SHORTCUT_GROUP_IDS[number]
