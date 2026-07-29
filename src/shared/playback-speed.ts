import { clamp, normalizeSpeedSettings } from './shortcut-settings'
import type { SpeedSettings } from './shortcut-types'

const BASE_PLAYBACK_RATE = 1

export const resolveNextPlaybackRate = (
  currentRate: number,
  direction: -1 | 1,
  speed: SpeedSettings
): number => {
  const normalizedSpeed = normalizeSpeedSettings(speed)
  const safeCurrent = Number.isFinite(currentRate) && currentRate > 0 ? currentRate : 1
  const stepped = safeCurrent + direction * normalizedSpeed.step
  const next =
    direction === -1 && safeCurrent > BASE_PLAYBACK_RATE && stepped < BASE_PLAYBACK_RATE
      ? BASE_PLAYBACK_RATE
      : direction === 1 && safeCurrent < BASE_PLAYBACK_RATE && stepped > BASE_PLAYBACK_RATE
        ? BASE_PLAYBACK_RATE
        : stepped

  return Number(clamp(next, normalizedSpeed.min, normalizedSpeed.max).toFixed(2))
}
