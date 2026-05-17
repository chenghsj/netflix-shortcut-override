const rewindPath =
  'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z'
const forwardPath =
  'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z'

const createSeekIcon = (path: string, seconds: number): string => {
  const label = Math.round(Math.abs(seconds)).toString()
  const fontSize = label.length >= 3 ? 5.5 : 7

  return `<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="${path}"/><text x="12" y="16.5" font-size="${fontSize}" font-family="sans-serif" font-weight="900" text-anchor="middle">${label}</text></svg>`
}

export const mediaHintIcons = {
  play: '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M8 5v14l11-7z"/></svg>',
  pause:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  rewind: (seconds: number) => createSeekIcon(rewindPath, seconds),
  forward: (seconds: number) => createSeekIcon(forwardPath, seconds),
  skipIntro:
    '<svg data-hint-icon="skip-intro" viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M5 5v14l10-7z"/><path d="M17 5h2v14h-2z"/></svg>',
  volume:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>',
  mute: '<svg viewBox="0 0 24 24" width="36" height="36" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  speed:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M12 14l4-4"/><path d="M6.5 18h11"/></svg>',
  fullscreen:
    '<svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2"><path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></svg>',
}

let hintTimer: number | null = null
const HINT_ENTER_MS = 180
const HINT_EXIT_MS = 280
const HINT_TOTAL_DURATION_MS = 720
const HINT_VISIBLE_OPACITY = '0.9'
const HINT_HIDDEN_TRANSFORM = 'translate(-50%,-50%) scale(0.96)'
const HINT_VISIBLE_TRANSFORM = 'translate(-50%,-50%) scale(1)'
const HINT_EXIT_TRANSFORM = 'translate(-50%,-50%) scale(0.98)'
const HINT_ENTER_TRANSITION = `opacity ${HINT_ENTER_MS}ms ease,transform ${HINT_ENTER_MS}ms cubic-bezier(0.2,0.8,0.2,1)`
const HINT_EXIT_TRANSITION = `opacity ${HINT_EXIT_MS}ms ease-out,transform ${HINT_EXIT_MS}ms ease-out`

const getHintAnchor = (targetDoc: Document): HTMLElement | null => {
  const localVideo = targetDoc.querySelector('video')
  if (localVideo instanceof HTMLVideoElement) return localVideo.parentElement ?? localVideo

  if (targetDoc !== document) {
    const rootVideo = document.querySelector('video')
    if (rootVideo instanceof HTMLVideoElement) return rootVideo.parentElement ?? rootVideo
  }

  return null
}

const getHintRenderDocument = (targetDoc: Document): Document =>
  getHintAnchor(targetDoc)?.ownerDocument ?? targetDoc

const getHintRenderHost = (renderDoc: Document): HTMLElement => {
  const fullscreenElement = renderDoc.fullscreenElement
  if (fullscreenElement instanceof HTMLElement) return fullscreenElement

  return renderDoc.body
}

const positionHint = (element: HTMLElement, targetDoc: Document): void => {
  const hintAnchor = getHintAnchor(targetDoc)
  const anchorRect = hintAnchor?.getBoundingClientRect()

  if (anchorRect && anchorRect.width > 0 && anchorRect.height > 0) {
    element.style.left = `${anchorRect.left + anchorRect.width / 2}px`
    element.style.top = `${anchorRect.top + anchorRect.height / 2}px`
    return
  }

  const defaultView = targetDoc.defaultView
  const viewportWidth = defaultView?.innerWidth ?? window.innerWidth
  const viewportHeight = defaultView?.innerHeight ?? window.innerHeight

  element.style.left = `${viewportWidth / 2}px`
  element.style.top = `${viewportHeight / 2}px`
}

export const showMediaHint = (
  iconHtml: string,
  label: string,
  targetDoc: Document,
  enabled: boolean
) => {
  if (!enabled) return

  const hintDoc = getHintRenderDocument(targetDoc)
  const host = getHintRenderHost(hintDoc)
  let hint = hintDoc.getElementById('shortcut-override-media-hint')

  if (!hint) {
    hint = hintDoc.createElement('div')
    hint.id = 'shortcut-override-media-hint'
    hint.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      `transform:${HINT_HIDDEN_TRANSFORM}`,
      'display:flex',
      'flex-direction:column',
      'align-items:center',
      'gap:8px',
      'padding:20px 32px',
      'border-radius:12px',
      'background:rgba(48,48,48,0.6)',
      'color:white',
      'font-family:sans-serif',
      'pointer-events:none',
      'z-index:2147483647',
      'opacity:0',
      `transition:${HINT_ENTER_TRANSITION}`,
      'will-change:opacity,transform',
    ].join(';')
  }

  if (hint.parentElement !== host) host.appendChild(hint)

  const icon = hintDoc.createElement('div')
  icon.style.color = 'white'
  icon.innerHTML = iconHtml
  const labelElement = hintDoc.createElement('span')
  labelElement.style.cssText = 'font-size:13px;font-weight:600;letter-spacing:0.03em'
  labelElement.textContent = label
  hint.replaceChildren(icon, labelElement)

  positionHint(hint, hintDoc)
  if (hint.style.opacity !== HINT_VISIBLE_OPACITY) {
    hint.style.opacity = '0'
    hint.style.transform = HINT_HIDDEN_TRANSFORM
    void hint.offsetWidth
  }
  hint.style.opacity = HINT_VISIBLE_OPACITY
  hint.style.transform = HINT_VISIBLE_TRANSFORM
  hint.style.transition = HINT_ENTER_TRANSITION

  if (hintTimer) window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => {
    hint?.style.setProperty('transition', HINT_EXIT_TRANSITION)
    hint?.style.setProperty('opacity', '0')
    hint?.style.setProperty('transform', HINT_EXIT_TRANSFORM)
  }, HINT_TOTAL_DURATION_MS - HINT_EXIT_MS)
}
