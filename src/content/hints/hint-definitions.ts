const rewindPath =
  'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z'
const forwardPath =
  'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z'

export type HintIcon = {
  readonly html: string
}

export const createHintIcon = (html: string): HintIcon => ({ html })

export const PIP_DOCUMENT_MARKER = 'shortcutOverridePip'

const createSeekIcon = (path: string, seconds: number): string => {
  const label = Math.round(Math.abs(seconds)).toString()
  const fontSize = label.length >= 3 ? 5.5 : 7

  return `<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="${path}"/><text x="12" y="16.5" font-size="${fontSize}" font-family="sans-serif" font-weight="900" text-anchor="middle">${label}</text></svg>`
}

export const mediaHintIcons = {
  play: '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M8 5v14l11-7z"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><rect x="6" y="5" width="4" height="14" rx="2"/><rect x="14" y="5" width="4" height="14" rx="2"/></svg>',
  playbackPlay:
    '<svg data-hint-icon="playback-play" viewBox="0 0 24 24" width="56" height="56" fill="white"><path transform="translate(1.25 0)" d="M5.2 2.4C4.55 2.03 3.75 2.5 3.75 3.25v17.5c0 .75.8 1.22 1.45.85l15.5-8.75c.67-.38.67-1.34 0-1.72L5.2 2.4z"/></svg>',
  playbackPause:
    '<svg data-hint-icon="playback-pause" viewBox="0 0 24 24" width="56" height="56" fill="white"><rect x="5" y="3" width="5" height="18" rx="1.25"/><rect x="14" y="3" width="5" height="18" rx="1.25"/></svg>',
  rewind: (seconds: number) => createSeekIcon(rewindPath, seconds),
  forward: (seconds: number) => createSeekIcon(forwardPath, seconds),
  volume:
    '<svg data-hint-icon="volume-up" viewBox="0 0 24 24" width="48" height="48" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  volumeDown:
    '<svg data-hint-icon="volume-down" viewBox="0 0 24 24" width="48" height="48" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>',
  mute:
    '<svg data-hint-icon="volume-mute" viewBox="0 0 24 24" width="48" height="48" fill="white"><path d="M12 4L9.91 6.09L12 8.18M4.27 3L3 4.27L7.73 9H3v6h4l5 5v-6.73l4.25 4.26c-.67.51-1.42.93-2.25 1.17v2.07c1.38-.32 2.63-.95 3.68-1.81L19.73 21L21 19.73l-9-9M19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.9 8.9 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71m-2.5 0c0-1.77-1-3.29-2.5-4.03v2.21l2.45 2.45c.05-.2.05-.42.05-.63"/></svg>',
  speed:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M12 14l4-4"/><path d="M6.5 18h11"/></svg>',
  holdSpeed:
    '<svg data-hint-icon="hold-speed" viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M4 5v14l9-7-9-7zM11 5v14l9-7-9-7z" stroke="white" stroke-width="0.8" stroke-linejoin="round"/></svg>',
  speedUp:
    '<svg data-hint-icon="speed-up" viewBox="0 0 24 24" width="56" height="56" fill="white" stroke="white" stroke-width="1.4" stroke-linejoin="round"><path d="M5 5v14l8-7-8-7zM14 5v14l8-7-8-7z"/></svg>',
  speedDown:
    '<svg data-hint-icon="speed-down" viewBox="0 0 24 24" width="56" height="56" fill="white" stroke="white" stroke-width="1.4" stroke-linejoin="round"><path d="M19 5v14l-8-7 8-7zM10 5v14l-8-7 8-7z"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2"><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></svg>',
}

export type HintRequest =
  | { type: 'media'; icon: HintIcon; label: string }
  | { type: 'playback'; icon: HintIcon }
  | { type: 'volume'; icon: HintIcon; label: string }
  | { type: 'speed'; icon: HintIcon; label: string }
  | { type: 'seek'; direction: -1 | 1; seconds: number }
  | { type: 'spaceHold'; label: string }

export interface HintManager {
  show(request: HintRequest): void
  hide(): void
  destroy(): void
}
