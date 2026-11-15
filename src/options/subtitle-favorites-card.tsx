import { getCopy } from '@/shared/i18n'
import { MAX_SUBTITLE_FAVORITES, type SubtitleFavorite } from '@/shared/subtitle-favorites'
import { LanguageFavoritesCard, type LanguageFavoritesCardProps } from './language-favorites-card'

type SubtitleFavoritesCardProps = Pick<LanguageFavoritesCardProps<SubtitleFavorite>,
  'favorites' | 'locale' | 'onChange' | 'defaultOpen' | 'collapsible'>

export function SubtitleFavoritesCard(props: SubtitleFavoritesCardProps) {
  return <LanguageFavoritesCard {...props} id="subtitle-favorites" copy={getCopy(props.locale).subtitleFavorites}
    maxFavorites={MAX_SUBTITLE_FAVORITES} favoriteKey={favorite => favorite.language}
    createFavorites={language => [{ language }]} />
}
