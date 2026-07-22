import {
  NETFLIX_API_MESSAGE_TYPE,
  isNetflixApiAction,
  type NetflixApiMessage,
} from '@/shared/netflix-api'
import { executeNetflixPageApi } from '@/shared/netflix-page-api-executor'
import { requestPlaybackFocusRestoration } from '@/background/playback-focus-restoration'
import { isPlaybackFocusRestorationRequest } from '@/shared/playback-focus-restoration'

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
