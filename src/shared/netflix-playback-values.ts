export const DEFAULT_NETFLIX_VOLUME = 0.1

export const clampNetflixVolume = (
  volume: number,
  fallback = DEFAULT_NETFLIX_VOLUME
): number => {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(volume) ? volume : fallback))
  return Number(clamped.toFixed(2))
}

export const normalizeAudibleNetflixVolume = (volume: number): number | null => {
  if (!Number.isFinite(volume)) return null
  const normalized = clampNetflixVolume(volume)
  return normalized > 0 ? normalized : null
}

export const normalizeNetflixRestoreVolume = (volume: number): number =>
  normalizeAudibleNetflixVolume(volume) ?? DEFAULT_NETFLIX_VOLUME
