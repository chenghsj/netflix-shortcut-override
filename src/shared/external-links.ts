export const EXTERNAL_LINKS = {
  githubRepository: 'https://github.com/chenghsj/netflix-shortcut-override',
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
