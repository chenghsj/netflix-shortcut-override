import { executeNetflixPageApi } from './netflix-page-api-executor'

export function getCaptionMetadata() {
  const result = executeNetflixPageApi('getCaptionMetadata')
  if (!result.captionMetadata) {
    const code = result.error
    throw new Error(code && ['watch', 'player', 'track', 'document'].includes(code) ? code : 'player')
  }
  return result.captionMetadata
}
