export const NETFLIX_PAGE_HOST_PERMISSIONS = ['*://*.netflix.com/*'] as const

// Optional CDN access is requested only when the user enables subtitle navigation.
export const NETFLIX_CAPTION_HOST_PERMISSIONS = [
  'https://*.nflxvideo.net/*',
] as const
