// Keep the user-initiated subtitle request within the manifest's existing hosts.
export const NETFLIX_CAPTION_HOST_PERMISSIONS = [
  '*://*.netflix.com/*',
  'https://*.nflxvideo.net/*',
  'https://*.nflximg.net/*',
  'https://*.nflxext.com/*',
] as const
