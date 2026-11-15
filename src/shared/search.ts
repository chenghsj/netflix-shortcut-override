const normalizeSearchText = (value: string) => value.normalize('NFKC').toLowerCase()

export const matchesSearchText = (keywords: readonly string[], query: string): boolean => {
  const text = normalizeSearchText(keywords.join(' '))
  return normalizeSearchText(query).trim().split(/[\s+]+/).filter(Boolean).every(token => text.includes(token))
}
