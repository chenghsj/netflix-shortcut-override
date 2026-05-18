export const interceptShortcutEvent = (event: KeyboardEvent) => {
  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
}

export const isTypingTarget = (targetDoc: Document): boolean => {
  const active = targetDoc.activeElement
  if (!(active instanceof HTMLElement)) return false

  return active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable
}

export const getTargetDocument = (event: KeyboardEvent): Document => event.view?.document ?? document

export const findVideo = (targetDoc: Document): HTMLVideoElement | null => {
  const localVideo = targetDoc.querySelector('video')
  if (localVideo instanceof HTMLVideoElement) return localVideo

  const rootVideo = document.querySelector('video')
  return rootVideo instanceof HTMLVideoElement ? rootVideo : null
}

const skipIntroSelector = [
  '[data-uia*="skip-intro" i]',
  '[data-uia*="skip-recap" i]',
  '[data-uia*="skip-credits" i]',
  '[aria-label*="skip intro" i]',
  '[aria-label*="skip recap" i]',
  '[aria-label*="skip credits" i]',
  '[aria-label*="略過片頭"]',
  '[aria-label*="跳過片頭"]',
  '[aria-label*="跳过片头"]',
  '[aria-label*="略過介紹"]',
  '[aria-label*="跳過介紹"]',
  '[aria-label*="跳过介绍"]',
  '[aria-label*="略過前情提要"]',
  '[aria-label*="跳過前情提要"]',
  '[aria-label*="跳过前情提要"]',
  '[aria-label*="前回までのあらすじをスキップ"]',
  '[aria-label*="あらすじをスキップ"]',
  '[aria-label*="オープニングをスキップ"]',
  '[aria-label*="イントロをスキップ"]',
  '[aria-label*="줄거리 건너뛰기"]',
  '[aria-label*="인트로 건너뛰기"]',
].join(', ')

const skipIntroText =
  /skip\s+(intro|recap|opening|credits)|略過片頭|跳過片頭|跳过片头|略過介紹|跳過介紹|跳过介绍|略過前情提要|跳過前情提要|跳过前情提要|前回までのあらすじをスキップ|あらすじをスキップ|オープニングをスキップ|イントロをスキップ|줄거리 건너뛰기|건너뛰기|인트로 건너뛰기/i

const isVisibleElement = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect()
  const style = element.ownerDocument.defaultView?.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style?.display !== 'none' &&
    style?.visibility !== 'hidden' &&
    style?.opacity !== '0'
  )
}

const getDocumentPathname = (targetDoc: Document): string =>
  targetDoc.defaultView?.location.pathname ?? targetDoc.location.pathname

const isWatchPage = (targetDoc: Document): boolean => {
  if (getDocumentPathname(targetDoc).startsWith('/watch')) return true
  return targetDoc !== document && getDocumentPathname(document).startsWith('/watch')
}

const hasVisiblePlaybackRoot = (targetDoc: Document): boolean => {
  const docs = targetDoc === document ? [targetDoc] : [targetDoc, document]
  return docs.some(doc =>
    Array.from(doc.querySelectorAll<HTMLElement>('.watch-video, [data-uia="player"]')).some(
      isVisibleElement
    )
  )
}

export const canHandlePlaybackShortcut = (targetDoc: Document): boolean =>
  isWatchPage(targetDoc) || hasVisiblePlaybackRoot(targetDoc)

export const findSkipIntroButton = (targetDoc: Document): HTMLElement | null => {
  const docs = targetDoc === document ? [targetDoc] : [targetDoc, document]
  for (const doc of docs) {
    const selectorMatch = Array.from(doc.querySelectorAll<HTMLElement>(skipIntroSelector)).find(
      isVisibleElement
    )
    if (selectorMatch) return selectorMatch

    const textMatch = Array.from(doc.querySelectorAll<HTMLElement>('button, [role="button"]')).find(
      element => isVisibleElement(element) && skipIntroText.test(element.textContent ?? '')
    )
    if (textMatch) return textMatch
  }
  return null
}

export const toggleFullscreen = (targetDoc: Document) => {
  if (targetDoc.fullscreenElement) {
    void targetDoc.exitFullscreen()
  } else {
    const target =
      targetDoc.querySelector<HTMLElement>('.watch-video') ?? targetDoc.documentElement
    void target.requestFullscreen()
  }
}

export const isPlainSpaceEvent = (event: KeyboardEvent): boolean =>
  event.code === 'Space' &&
  !event.ctrlKey &&
  !event.altKey &&
  !event.shiftKey &&
  !event.metaKey
