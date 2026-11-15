import type { SubtitleFavorite } from './subtitle-favorites'
import type { AudioFavorite } from './audio-favorites'

export const NETFLIX_API_MESSAGE_TYPE = 'EXECUTE_NETFLIX_API'

export const NETFLIX_API_ACTIONS = [
  'diagnose',
  'play',
  'pause',
  'seek',
  'seekTo',
  'stepFrame',
  'setVolume',
  'setMuted',
  'unmuteWithVolume',
  'setPlaybackRate',
  'getSubtitleState',
  'getCaptionMetadata',
  'toggleSubtitles',
  'cycleSubtitleTrack',
  'cycleAudioTrack',
] as const

export type NetflixApiAction = (typeof NETFLIX_API_ACTIONS)[number]

export type NetflixApiMessage = {
  type: typeof NETFLIX_API_MESSAGE_TYPE
  action: NetflixApiAction
  value?: number
  subtitleFavorites?: readonly SubtitleFavorite[]
  audioFavorites?: readonly AudioFavorite[]
}

export type NetflixApiRequest = {
  source: 'shortcut-override'
  id: string
  action: NetflixApiAction
  value?: number
  subtitleFavorites?: readonly SubtitleFavorite[]
  audioFavorites?: readonly AudioFavorite[]
}

export type NetflixPageResult = {
  action: NetflixApiAction
  bridge?: 'main-world'
  playerApiFound: boolean
  sessionIds: string[]
  sessionId?: string
  playerFound: boolean
  seekCalled: boolean
  frameRate?: number
  frameRateEstimated?: boolean
  audioTrackSwitchCalled?: boolean
  audioTrack?: string
  audioTrackLanguage?: string
  audioTrackIsAudioDescription?: boolean
  audioCycleOutcome?: 'no-tracks-available' | 'unchanged'
  subtitleToggleCalled?: boolean
  subtitlesEnabled?: boolean
  subtitleTrack?: string
  subtitleTrackLanguage?: string
  subtitleTrackIsClosedCaption?: boolean
  subtitleCycleOutcome?: 'no-tracks-available'
  subtitleDiagnostics?: string
  captionMetadata?: { key: string; watchId: string; url: string; currentMs: number }
  currentTime?: number
  targetTime?: number
  error?: string
}

export type NetflixApiResponse = {
  source?: 'shortcut-override'
  id?: string
  success: boolean
  result?: NetflixPageResult
  error?: string
}

export const isNetflixApiAction = (value: unknown): value is NetflixApiAction =>
  typeof value === 'string' && NETFLIX_API_ACTIONS.includes(value as NetflixApiAction)
