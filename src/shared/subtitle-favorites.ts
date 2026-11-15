export type SubtitleFavorite = {
  language: string
}

export const MAX_SUBTITLE_FAVORITES = 20

export const sameSubtitleFavorite = (left: SubtitleFavorite, right: SubtitleFavorite): boolean =>
  left.language === right.language

export const normalizeSubtitleFavorites = (value: unknown): SubtitleFavorite[] => {
  if (!Array.isArray(value)) return []

  const favorites: SubtitleFavorite[] = []
  for (const item of value) {
    if (!item || typeof item.language !== 'string') {
      continue
    }
    const tag = item.language.trim().replaceAll('_', '-')
    // Favorites identify a language, script and region, without locale extensions.
    if (!/^[a-z]{2,3}(?:-[a-z]{4})?(?:-(?:[a-z]{2}|\d{3}))?$/i.test(tag)) continue
    const [language] = Intl.getCanonicalLocales(tag)
    if (language === 'und' || language.startsWith('und-')) continue

    const favorite: SubtitleFavorite = { language }
    if (favorites.some(existing => sameSubtitleFavorite(existing, favorite))) continue
    favorites.push(favorite)
    if (favorites.length === MAX_SUBTITLE_FAVORITES) break
  }
  return favorites
}
