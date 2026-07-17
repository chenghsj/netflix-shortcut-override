export const MEDIA_HINT_ID = 'shortcut-override-media-hint'
export const PLAYBACK_HINT_ID = 'shortcut-override-playback-hint'
export const VOLUME_HINT_ID = 'shortcut-override-volume-hint'
export const VOLUME_HINT_LABEL_ID = 'shortcut-override-volume-hint-label'
export const SPEED_HINT_ID = 'shortcut-override-speed-hint'
export const SPEED_HINT_LABEL_ID = 'shortcut-override-speed-hint-label'
export const SEEK_HINT_ID = 'shortcut-override-seek-hint'
export const SPACE_HOLD_HINT_ID = 'shortcut-override-space-hold-hint'

export const HINT_IDS = [
  MEDIA_HINT_ID,
  PLAYBACK_HINT_ID,
  VOLUME_HINT_ID,
  VOLUME_HINT_LABEL_ID,
  SPEED_HINT_ID,
  SPEED_HINT_LABEL_ID,
  SEEK_HINT_ID,
  SPACE_HOLD_HINT_ID,
] as const

export const TRANSIENT_HINT_VISIBLE_DURATION_MS = 360
export const HINT_VISIBLE_OPACITY = '0.9'
export const HINT_HIDDEN_TRANSFORM = 'translate(-50%,-50%) scale(0.96)'
export const HINT_VISIBLE_TRANSFORM = 'translate(-50%,-50%) scale(1)'
export const HINT_EXIT_TRANSFORM = 'translate(-50%,-50%) scale(0.98)'
export const HINT_ENTER_TRANSITION =
  'opacity 180ms ease,transform 180ms cubic-bezier(0.2,0.8,0.2,1)'
export const HINT_EXIT_TRANSITION = 'opacity 180ms ease-out,transform 180ms ease-out'
export const PLAYBACK_HINT_ENTER_TRANSITION =
  'opacity 100ms ease,transform 100ms cubic-bezier(0.2,0.8,0.2,1)'
export const PLAYBACK_HINT_EXIT_TRANSITION = 'opacity 180ms ease-out,transform 180ms ease-out'
export const PLAYBACK_HINT_TOTAL_DURATION_MS = 620
export const PLAYBACK_HINT_EXIT_MS = 180
export const PLAYBACK_HINT_HIDDEN_TRANSFORM = 'translate(-50%,-50%) scale(0.88)'
export const PLAYBACK_HINT_VISIBLE_TRANSFORM = 'translate(-50%,-50%) scale(1)'
export const PLAYBACK_HINT_EXIT_TRANSFORM = 'translate(-50%,-50%) scale(0.96)'
export const VOLUME_HINT_LABEL_HIDDEN_TRANSFORM = 'translate(-50%,-5px)'
export const VOLUME_HINT_LABEL_VISIBLE_TRANSFORM = 'translate(-50%,0)'
export const VOLUME_HINT_LABEL_EXIT_TRANSFORM = 'translate(-50%,-3px)'
export const VOLUME_HINT_LABEL_ENTER_TRANSITION =
  'opacity 100ms ease,transform 100ms cubic-bezier(0.2,0.8,0.2,1)'
export const VOLUME_HINT_LABEL_EXIT_TRANSITION =
  'opacity 180ms ease-out,transform 180ms ease-out'
export const SEEK_HINT_ENTER_TRANSITION = 'opacity 100ms ease'
export const SEEK_HINT_EXIT_TRANSITION = 'opacity 180ms ease-out'
export const SEEK_ACCUMULATION_WINDOW_MS = 700
export const SEEK_HINT_EDGE_INSET_PX = 48
export const SEEK_HINT_OUTER_TRANSFORM = 'translateY(-50%)'
export const SPACE_HOLD_HINT_VISIBLE_TRANSFORM = 'translate(-50%,0)'
export const SPACE_HOLD_HINT_HIDDEN_TRANSFORM = 'translate(-50%,-6px)'
export const SPACE_HOLD_HINT_ENTER_TRANSITION =
  'opacity 140ms ease,transform 140ms cubic-bezier(0.2,0.8,0.2,1)'
export const HINT_SCALE_CSS_VAR = '--shortcut-override-hint-scale'
