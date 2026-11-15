import { audioFavoriteKey, MAX_AUDIO_FAVORITES, type AudioFavorite } from '@/shared/audio-favorites'
import { getAudioFavoritesCopy } from '@/shared/audio-favorites-copy'
import { LanguageFavoritesCard, type LanguageFavoritesCardProps } from './language-favorites-card'

type AudioFavoritesCardProps = Pick<LanguageFavoritesCardProps<AudioFavorite>,
  'favorites' | 'locale' | 'onChange' | 'defaultOpen' | 'collapsible'>

export function AudioFavoritesCard(props: AudioFavoritesCardProps) {
  const copy = getAudioFavoritesCopy(props.locale)

  return <LanguageFavoritesCard {...props} id="audio-favorites" copy={copy}
    maxFavorites={MAX_AUDIO_FAVORITES} favoriteKey={audioFavoriteKey}
    createFavorites={language => [{ language, audioDescription: false }, { language, audioDescription: true }]}
    formatLabel={(favorite, label) => favorite.audioDescription ? `${label} · ${copy.audioDescription}` : label} />
}
