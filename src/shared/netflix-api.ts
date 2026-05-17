export const NETFLIX_API_MESSAGE_TYPE = 'EXECUTE_NETFLIX_API'

export const NETFLIX_API_ACTIONS = [
  'play',
  'pause',
  'seek',
  'setVolume',
  'setMuted',
  'unmuteWithVolume',
  'setPlaybackRate',
] as const

export type NetflixApiAction = (typeof NETFLIX_API_ACTIONS)[number]

export type NetflixApiMessage = {
  type: typeof NETFLIX_API_MESSAGE_TYPE
  action: NetflixApiAction
  value?: number
}

export type NetflixApiRequest = {
  source: 'shortcut-override'
  id: string
  action: NetflixApiAction
  value?: number
}

export type NetflixPageResult = {
  action: NetflixApiAction
  bridge?: 'main-world'
  playerApiFound: boolean
  sessionIds: string[]
  sessionId?: string
  playerFound: boolean
  seekCalled: boolean
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
