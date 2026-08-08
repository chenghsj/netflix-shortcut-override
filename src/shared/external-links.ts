export const EXTERNAL_LINKS = {
  githubRepository: 'https://github.com/chenghsj/netflix-shortcut-override',
  shortcutOverrideChromeWebStore:
    'https://chromewebstore.google.com/detail/shortcut-override-for-net/jebnhiecgnchnioahfagmnebdknddbom/reviews',
  shortcutOverrideEdgeAddons:
    'https://microsoftedge.microsoft.com/addons/detail/shortcut-override-for-netflix/ddfnieehcebicbmnejlafjphppdjmdhi',
  shortcutOverrideFirefoxAddons:
    'https://addons.mozilla.org/firefox/addon/70ea1dc7212746bd96bd/reviews/',
  streamDanmakuChromeWebStore:
    'https://chromewebstore.google.com/detail/stream-danmaku/kdiacdhfefjobidmfgjfnemcihgkejhc',
  streamDanmakuMicrosoftEdgeAddons:
    'https://microsoftedge.microsoft.com/addons/detail/stream-danmaku/bangbnionoomjnekkplkdgckenkpkikk',
} as const

export const getStreamDanmakuStoreUrl = (userAgent = globalThis.navigator?.userAgent ?? '') => {
  if (/\bEdg\//.test(userAgent)) {
    return EXTERNAL_LINKS.streamDanmakuMicrosoftEdgeAddons
  }

  return EXTERNAL_LINKS.streamDanmakuChromeWebStore
}

export const getShortcutOverrideRatingUrl = (
  userAgent = globalThis.navigator?.userAgent ?? ''
) => {
  if (/\bEdg\/\d/i.test(userAgent)) {
    return EXTERNAL_LINKS.shortcutOverrideEdgeAddons
  }

  if (/\bFirefox\/\d/i.test(userAgent) && !/\bSeamonkey\/\d/i.test(userAgent)) {
    return EXTERNAL_LINKS.shortcutOverrideFirefoxAddons
  }

  return EXTERNAL_LINKS.shortcutOverrideChromeWebStore
}
