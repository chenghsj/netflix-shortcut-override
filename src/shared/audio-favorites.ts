import { normalizeSubtitleFavorites } from './subtitle-favorites'

export type AudioFavorite = {
  language: string
  audioDescription: boolean
}

export const MAX_AUDIO_FAVORITES = 20

export const audioFavoriteKey = (favorite: AudioFavorite): string =>
  `${favorite.language}:${favorite.audioDescription ? 'description' : 'standard'}`

export const sameAudioFavorite = (left: AudioFavorite, right: AudioFavorite): boolean =>
  audioFavoriteKey(left) === audioFavoriteKey(right)

export const normalizeAudioFavorites = (value: unknown): AudioFavorite[] => {
  if (!Array.isArray(value)) return []

  const favorites: AudioFavorite[] = []
  for (const item of value) {
    if (!item || typeof item.audioDescription !== 'boolean') continue
    const [normalized] = normalizeSubtitleFavorites([item])
    if (!normalized) continue
    const favorite = { ...normalized, audioDescription: item.audioDescription }
    if (favorites.some(existing => sameAudioFavorite(existing, favorite))) continue
    favorites.push(favorite)
    if (favorites.length === MAX_AUDIO_FAVORITES) break
  }
  return favorites
}
