export type BrowserCapabilities = {
  supportsSubtitlePreservingPip: boolean
  requiresNetflixPageBridge: boolean
  closesPopupAfterOpeningOptions: boolean
}

const isFirefoxBrowser = (userAgent: string): boolean =>
  /\bFirefox\/\d/i.test(userAgent) && !/\bSeamonkey\/\d/i.test(userAgent)

export const getBrowserCapabilities = (
  userAgent = globalThis.navigator?.userAgent ?? ''
): BrowserCapabilities => {
  const isFirefox = isFirefoxBrowser(userAgent)

  return {
    supportsSubtitlePreservingPip: !isFirefox,
    requiresNetflixPageBridge: !isFirefox,
    closesPopupAfterOpeningOptions: isFirefox,
  }
}
