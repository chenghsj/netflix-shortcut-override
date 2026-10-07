import { getCaptionMetadata } from '@/shared/netflix-caption-metadata'
import { CAPTION_REQUEST_EVENT, CAPTION_RESPONSE_EVENT, readCaptionEvent } from '@/shared/netflix-caption-events'
import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'
import {
  isNetflixApiAction,
  type NetflixApiRequest,
  type NetflixApiResponse,
} from '@/shared/netflix-api'
import { executeNetflixPageApi } from '@/shared/netflix-page-api-executor'

type BridgeState = {
  abortController: AbortController
}

type BridgeWindow = typeof window & {
  __shortcutOverrideNetflixBridge?: BridgeState
}

const pageWindow = window as BridgeWindow
pageWindow.__shortcutOverrideNetflixBridge?.abortController.abort()

const abortController = new AbortController()
pageWindow.__shortcutOverrideNetflixBridge = { abortController }

const isNetflixApiRequest = (value: unknown): value is NetflixApiRequest => {
  if (!value || typeof value !== 'object') return false
  const request = value as Partial<NetflixApiRequest>

  return (
    request.source === 'shortcut-override' &&
    typeof request.id === 'string' &&
    isNetflixApiAction(request.action)
  )
}

const sendResponse = (response: NetflixApiResponse) => {
  window.dispatchEvent(new CustomEvent(NETFLIX_API_RESPONSE_EVENT, { detail: response }))
}

const handleRequest = (event: Event) => {
  const detail = 'detail' in event ? event.detail : null
  if (!isNetflixApiRequest(detail)) return

  try {
    sendResponse({
      source: 'shortcut-override',
      id: detail.id,
      success: true,
      result: executeNetflixPageApi(detail.action, detail.value),
    })
  } catch (error) {
    sendResponse({
      source: 'shortcut-override',
      id: detail.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unable to execute Netflix API.',
    })
  }
}

document.documentElement?.setAttribute(NETFLIX_API_BRIDGE_READY_ATTR, 'ready')
window.addEventListener(NETFLIX_API_REQUEST_EVENT, handleRequest, {
  signal: abortController.signal,
})

window.addEventListener(CAPTION_REQUEST_EVENT, (event: Event) => {
  const detail = readCaptionEvent(event)
  if (!detail) return
  const respond = (result: Record<string, unknown>) => {
    window.dispatchEvent(new CustomEvent(CAPTION_RESPONSE_EVENT, {
      detail: JSON.stringify({ source: 'shortcut-override', id: detail.id, ...result }),
    }))
  }
  try {
    respond({ metadata: getCaptionMetadata() })
  } catch (error) {
    const code = error instanceof Error && ['watch', 'player', 'track', 'document'].includes(error.message) ? error.message : 'player'
    respond({ error: code })
  }
}, { signal: abortController.signal })
