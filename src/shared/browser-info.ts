export const isFirefoxBrowser = (userAgent = globalThis.navigator?.userAgent ?? '') =>
  /\bFirefox\/\d/i.test(userAgent) && !/\bSeamonkey\/\d/i.test(userAgent)
