import {
  NETFLIX_API_BRIDGE_READY_ATTR,
  NETFLIX_API_REQUEST_EVENT,
  NETFLIX_API_RESPONSE_EVENT,
} from '@/shared/netflix-api-events'
import {
  NETFLIX_API_MESSAGE_TYPE,
  type NetflixApiAction,
  type NetflixApiResponse,
} from '@/shared/netflix-api'

let netflixApiRequestId = 0

const hasNetflixPageBridge = (): boolean =>
  document.documentElement?.getAttribute(NETFLIX_API_BRIDGE_READY_ATTR) === 'ready'

const sendNetflixPageApi = (
  action: NetflixApiAction,
  value?: number
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
        detail: { source: 'shortcut-override', id, action, value },
      })
    )
  })

const sendNetflixBackgroundApi = (
  action: NetflixApiAction,
  value?: number
): Promise<NetflixApiResponse> =>
  new Promise(resolve => {
    chrome.runtime.sendMessage({ type: NETFLIX_API_MESSAGE_TYPE, action, value }, response => {
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
  value?: number
): Promise<NetflixApiResponse> => {
  if (!hasNetflixPageBridge()) return sendNetflixBackgroundApi(action, value)

  const pageResponse = await sendNetflixPageApi(action, value)
  if (pageResponse.success) return pageResponse

  const backgroundResponse = await sendNetflixBackgroundApi(action, value)
  return backgroundResponse.success ? backgroundResponse : pageResponse
}

export const getSeekFailureLabel = (response: NetflixApiResponse): string | null => {
  if (!response.success) return `Seek failed: ${response.error ?? 'background error'}`
  if (response.result?.seekCalled) return null
  if (response.result?.error) return `Seek failed: ${response.result.error}`
  if (response.result?.playerApiFound === false) return 'Seek failed: no Netflix API'
  if (response.result?.playerFound === false) return 'Seek failed: no Netflix player'
  return 'Seek failed: no seek call'
}
