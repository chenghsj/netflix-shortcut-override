import {
  NETFLIX_API_MESSAGE_TYPE,
  isNetflixApiAction,
  type NetflixApiMessage,
} from '@/shared/netflix-api'
import { executeNetflixPageApi } from '@/shared/netflix-page-api-executor'

chrome.action?.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage()
})

chrome.runtime.onMessage.addListener((message: Partial<NetflixApiMessage>, sender, sendResponse) => {
  if (message.type !== NETFLIX_API_MESSAGE_TYPE || !isNetflixApiAction(message.action)) {
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
      args: [message.action, message.value],
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
