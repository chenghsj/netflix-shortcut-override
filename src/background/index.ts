import { CaptionPermissionError, fetchNetflixCaptionText } from './netflix-caption-fetch'
import {
  NETFLIX_API_MESSAGE_TYPE,
  isNetflixApiAction,
  type NetflixApiMessage,
} from '@/shared/netflix-api'
import { executeNetflixPageApi } from '@/shared/netflix-page-api-executor'
import { requestPlaybackFocusRestoration } from '@/background/playback-focus-restoration'
import { isPlaybackFocusRestorationRequest } from '@/shared/playback-focus-restoration'
import { registerFeatureAnnouncements } from '@/background/feature-announcements'

registerFeatureAnnouncements()

chrome.action?.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (isPlaybackFocusRestorationRequest(message)) {
    void requestPlaybackFocusRestoration({
      tabId: message.tabId,
      windowId: message.windowId,
    }).catch(() => undefined)
    return false
  }

  if (message && typeof message === 'object' && 'type' in message && message.type === 'FETCH_NETFLIX_CAPTION') {
    const request = message as { url?: unknown; watchId?: unknown }
    if (sender.id !== chrome.runtime.id || sender.frameId !== 0 || typeof sender.tab?.id !== 'number' || typeof request.url !== 'string' || typeof request.watchId !== 'string') return false
    const { url, watchId } = request
    void chrome.tabs.get(sender.tab.id).then(tab => {
      const current = new URL(tab.url ?? '')
      const origin = new URL(sender.url ?? sender.origin ?? '')
      if (current.protocol !== 'https:' || !['netflix.com', 'www.netflix.com'].includes(current.hostname) || origin.origin !== current.origin || current.pathname.match(/^\/watch\/(\d+)/)?.[1] !== watchId) throw new Error('Video changed')
      return fetchNetflixCaptionText(url)
    }).then(text => sendResponse({ text })).catch(error => {
      // Keep diagnostic codes, never signed delivery URLs or response bodies.
      const reason = error instanceof Error ? error.message : ''
      const status = reason.match(/HTTP (\d{3})/)?.[1]
      const code = error instanceof CaptionPermissionError ? error.code : status ? `CAPTION_HTTP_${status}` : reason.includes('timed out') ? 'CAPTION_TIMEOUT' : reason.includes('rejected') ? 'CAPTION_URL_REJECTED' : reason.includes('Video changed') ? 'VIDEO_CHANGED' : reason.includes('size limit') || reason.includes('2 MB') ? 'CAPTION_TOO_LARGE' : reason.includes('redirect') ? 'CAPTION_REDIRECT' : 'CAPTION_NETWORK'
      sendResponse({ error: true, code })
    })
    return true
  }

  const apiMessage = message as Partial<NetflixApiMessage>
  if (
    apiMessage.type !== NETFLIX_API_MESSAGE_TYPE ||
    !isNetflixApiAction(apiMessage.action)
  ) {
    return false
  }

  const tabId = sender.tab?.id
  if (typeof tabId !== 'number') {
    sendResponse({ success: false, error: 'No sender tab ID.' })
    return false
  }

  chrome.scripting
    .executeScript({
      target: { tabId },
      world: 'MAIN',
      func: executeNetflixPageApi,
      args: [apiMessage.action, apiMessage.value],
    })
    .then(injectionResults => sendResponse({ success: true, result: injectionResults[0]?.result }))
    .catch(error =>
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unable to execute Netflix API.',
      })
    )

  return true
})
