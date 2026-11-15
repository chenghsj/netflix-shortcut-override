import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'
import {
  NETFLIX_API_MESSAGE_TYPE,
  type NetflixApiAction,
  type NetflixApiRequest,
  type NetflixApiResponse,
} from '@/shared/netflix-api'
import { getBrowserCapabilities } from '@/shared/browser-capabilities'

let netflixApiRequestId = 0

const hasNetflixPageBridge = (): boolean =>
  document.documentElement?.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR) === 'ready'

const sendNetflixPageApi = (
  action: NetflixApiAction,
  value?: number,
  subtitleFavorites?: NetflixApiRequest['subtitleFavorites'],
  audioFavorites?: NetflixApiRequest['audioFavorites']
): Promise<NetflixApiResponse> =>
  new Promise(resolve => {
    const id = `shortcut-override-${Date.now()}-${(netflixApiRequestId += 1)}`
    const timeout = window.setTimeout(() => {
      window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
      resolve({ success: false, error: 'No page bridge response.' })
    }, 160)

    const handleResponse = (event: Event) => {
      const detail =
        'detail' in event
          ? (event.detail as (NetflixApiResponse & { id?: string }) | null)
          : null
      if (!detail || detail.id !== id) return

      window.clearTimeout(timeout)
      window.removeEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
      resolve(detail)
    }

    window.addEventListener(NETFLIX_API_RESPONSE_EVENT, handleResponse)
    window.dispatchEvent(
      new CustomEvent(NETFLIX_API_REQUEST_EVENT, {
        detail: { source: 'shortcut-override', id, action, value, ...(subtitleFavorites && { subtitleFavorites }), ...(audioFavorites && { audioFavorites }) },
      })
    )
  })

const sendNetflixBackgroundApi = (
  action: NetflixApiAction,
  value?: number,
  subtitleFavorites?: NetflixApiRequest['subtitleFavorites'],
  audioFavorites?: NetflixApiRequest['audioFavorites']
): Promise<NetflixApiResponse> =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({
      type: NETFLIX_API_MESSAGE_TYPE, action, value, ...(subtitleFavorites && { subtitleFavorites }), ...(audioFavorites && { audioFavorites }),
    }, response => {
      const error = chrome.runtime.lastError?.message
      if (error) {
        resolve({ success: false, error })
        return
      }

      resolve(response ?? { success: false, error: 'No background response.' })
    })
  })

export const sendNetflixApi = async (
  action: NetflixApiAction,
  value?: number,
  subtitleFavorites?: NetflixApiRequest['subtitleFavorites'],
  audioFavorites?: NetflixApiRequest['audioFavorites']
): Promise<NetflixApiResponse> => {
  if (!getBrowserCapabilities().requiresNetflixPageBridge || !hasNetflixPageBridge()) {
    return sendNetflixBackgroundApi(action, value, subtitleFavorites, audioFavorites)
  }

  const pageResponse = await sendNetflixPageApi(action, value, subtitleFavorites, audioFavorites)
  if (pageResponse.success) return pageResponse

  // Relative commands can advance twice if the page handled
  // the request but its response arrived late.
  if (action === 'seek' || action === 'stepFrame' || action === 'cycleSubtitleTrack' || action === 'cycleAudioTrack') return pageResponse

  const backgroundResponse = await sendNetflixBackgroundApi(action, value)
  return backgroundResponse.success ? backgroundResponse : pageResponse
}
