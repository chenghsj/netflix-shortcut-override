const normalizeSearchText = (value: string) =>
  value.normalize('NFKC').toLowerCase().normalize('NFD').replace(/(\p{Script=Latin})\p{M}+/gu, '$1').normalize('NFC')

export const matchesSearchText = (keywords: readonly string[], query: string): boolean => {
  const text = normalizeSearchText(keywords.join(' '))
  return normalizeSearchText(query).trim().split(/[\s+]+/).filter(Boolean).every(token => text.includes(token))
}
