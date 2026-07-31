import { createCompatibilityReadinessObserver } from '@/shared/compatibility-readiness-observer'
import {
  isNetflixWatchUrl,
  restoreVisibleNetflixWatchPageFocus,
  type PlaybackFocusTarget,
} from '@/shared/playback-focus-restoration'

const PENDING_FOCUS_RESTORATIONS_KEY =
  'pendingPlaybackFocusRestorations'
const FOCUS_RESTORATION_TTL_MS = 30_000
const FOCUS_RETRY_INTERVAL_MS = 100
const FOCUS_MAX_ATTEMPTS = 3

type PendingFocusRestoration = PlaybackFocusTarget & {
  requestId: string
  expiresAt: number
}

type PendingFocusRestorations = Record<string, PendingFocusRestoration>

type ScheduledExpiration = {
  requestId: string
  timer: ReturnType<typeof setTimeout>
}

const expirationTimers = new Map<number, ScheduledExpiration>()
const readinessObservers = new Map<
  number,
  { requestId: string; cancel: () => void }
>()

const clearPendingFocusRestorationTimers = (tabId: number) => {
  const expirationTimer = expirationTimers.get(tabId)
  if (expirationTimer !== undefined) {
    clearTimeout(expirationTimer.timer)
    expirationTimers.delete(tabId)
  }
  const readinessObserver = readinessObservers.get(tabId)
  if (readinessObserver !== undefined) {
    readinessObserver.cancel()
    readinessObservers.delete(tabId)
  }
}

const getPendingFocusRestorations = (): Promise<PendingFocusRestorations> =>
  new Promise(resolve => {
    chrome.storage.session.get(PENDING_FOCUS_RESTORATIONS_KEY, items => {
      const stored = items[PENDING_FOCUS_RESTORATIONS_KEY]
      resolve(
        stored && typeof stored === 'object'
          ? stored as PendingFocusRestorations
          : {}
      )
    })
  })

const setPendingFocusRestorations = (
  restorations: PendingFocusRestorations
): Promise<void> =>
  new Promise(resolve => {
    chrome.storage.session.set(
      { [PENDING_FOCUS_RESTORATIONS_KEY]: restorations },
      resolve
    )
  })

const isSameRequest = (
  current: PendingFocusRestoration | undefined,
  expected: PendingFocusRestoration
): boolean => current?.requestId === expected.requestId

const isCurrentPendingFocusRestoration = async (
  expected: PendingFocusRestoration
): Promise<boolean> => {
  const restorations = await getPendingFocusRestorations()
  return isSameRequest(restorations[String(expected.tabId)], expected)
}

const removePendingFocusRestoration = async (
  tabId: number,
  expectedRequestId?: string
) => {
  const restorations = await getPendingFocusRestorations()
  const current = restorations[String(tabId)]
  if (expectedRequestId !== undefined && current?.requestId !== expectedRequestId) {
    return
  }
  clearPendingFocusRestorationTimers(tabId)
  delete restorations[String(tabId)]
  await setPendingFocusRestorations(restorations)
}

const scheduleExpiration = (
  pending: PendingFocusRestoration,
  replaceExisting = false
) => {
  const existingTimer = expirationTimers.get(pending.tabId)
  if (existingTimer?.requestId === pending.requestId) return
  if (existingTimer !== undefined && !replaceExisting) return
  if (existingTimer !== undefined) clearTimeout(existingTimer.timer)
  expirationTimers.set(pending.tabId, {
    requestId: pending.requestId,
    timer: setTimeout(() => {
      void removePendingFocusRestoration(
        pending.tabId,
        pending.requestId
      ).catch(() => undefined)
    }, Math.max(0, pending.expiresAt - Date.now())),
  })
}

const cancelPendingFocusRestorations = async (
  shouldCancel: (pending: PendingFocusRestoration) => boolean
) => {
  const restorations = await getPendingFocusRestorations()
  let changed = false
  for (const [tabId, pending] of Object.entries(restorations)) {
    if (!shouldCancel(pending)) continue
    clearPendingFocusRestorationTimers(Number(tabId))
    delete restorations[tabId]
    changed = true
  }
  if (changed) await setPendingFocusRestorations(restorations)
}

const getTab = (tabId: number): Promise<chrome.tabs.Tab | undefined> =>
  new Promise(resolve => {
    chrome.tabs.get(tabId, tab => {
      resolve(chrome.runtime.lastError ? undefined : tab)
    })
  })

const getWindow = (
  windowId: number
): Promise<chrome.windows.Window | undefined> =>
  new Promise(resolve => {
    chrome.windows.get(windowId, window => {
      resolve(chrome.runtime.lastError ? undefined : window)
    })
  })

type FocusTargetState = 'waiting' | 'eligible' | 'cancel'

const getFocusTargetState = async (
  target: PlaybackFocusTarget
): Promise<FocusTargetState> => {
  const [tab, targetWindow] = await Promise.all([
    getTab(target.tabId),
    getWindow(target.windowId),
  ])
  if (
    tab?.windowId !== target.windowId ||
    !tab.active ||
    !isNetflixWatchUrl(tab.url) ||
    !targetWindow?.focused
  ) {
    return 'cancel'
  }
  return tab.status === 'complete' ? 'eligible' : 'waiting'
}

const completeFocusRestoration = async (
  pending: PendingFocusRestoration
): Promise<void> => {
  for (let attempt = 0; attempt < FOCUS_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise(resolve =>
        setTimeout(resolve, FOCUS_RETRY_INTERVAL_MS)
      )
    }
    const [isCurrent, currentTargetState] = await Promise.all([
      isCurrentPendingFocusRestoration(pending),
      getFocusTargetState(pending),
    ])
    if (!isCurrent) return
    if (currentTargetState !== 'eligible') {
      await removePendingFocusRestoration(pending.tabId, pending.requestId)
      return
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: pending.tabId },
        world: 'MAIN',
        func: restoreVisibleNetflixWatchPageFocus,
      })
      if (results[0]?.result === true) break
    } catch {
      // Focus restoration is best effort.
    }
  }
  await removePendingFocusRestoration(pending.tabId, pending.requestId)
}

const observePlaybackReadiness = (pending: PendingFocusRestoration): void => {
  const existing = readinessObservers.get(pending.tabId)
  if (existing?.requestId === pending.requestId) return
  existing?.cancel()

  const observer = createCompatibilityReadinessObserver()
  const cancel = observer.observePlaybackReadiness(pending.tabId, {
    beforeAttempt: async () => {
      if (Date.now() >= pending.expiresAt) return 'cancel'
      if (!(await isCurrentPendingFocusRestoration(pending))) return 'cancel'
      const targetState = await getFocusTargetState(pending)
      if (targetState === 'cancel') return 'cancel'
      return targetState === 'waiting' ? 'wait' : 'continue'
    },
    onReady: async () => {
      readinessObservers.delete(pending.tabId)
      await completeFocusRestoration(pending)
    },
    onCancel: () => removePendingFocusRestoration(pending.tabId, pending.requestId),
    onWait: () => {
      const current = readinessObservers.get(pending.tabId)
      if (current?.requestId === pending.requestId) readinessObservers.delete(pending.tabId)
    },
  })
  readinessObservers.set(pending.tabId, { requestId: pending.requestId, cancel })
}

const attemptFocusRestoration = async (
  pending: PendingFocusRestoration
): Promise<void> => {
  if (Date.now() >= pending.expiresAt) {
    await removePendingFocusRestoration(pending.tabId, pending.requestId)
    return
  }

  const targetState = await getFocusTargetState(pending)
  if (!(await isCurrentPendingFocusRestoration(pending))) return
  if (targetState === 'cancel') {
    await removePendingFocusRestoration(pending.tabId, pending.requestId)
    return
  }
  if (targetState === 'waiting') return
  observePlaybackReadiness(pending)
}

export const requestPlaybackFocusRestoration = async (
  target: PlaybackFocusTarget
): Promise<void> => {
  const requestedAt = Date.now()
  const pending: PendingFocusRestoration = {
    ...target,
    requestId: crypto.randomUUID(),
    expiresAt: requestedAt + FOCUS_RESTORATION_TTL_MS,
  }
  const restorations = await getPendingFocusRestorations()
  restorations[String(target.tabId)] = pending
  await setPendingFocusRestorations(restorations)
  scheduleExpiration(pending, true)
  await attemptFocusRestoration(pending)
}

const resumePendingFocusRestoration = async (tabId: number) => {
  const restorations = await getPendingFocusRestorations()
  const pending = restorations[String(tabId)]
  if (pending) await attemptFocusRestoration(pending)
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && !isNetflixWatchUrl(changeInfo.url)) {
    void removePendingFocusRestoration(tabId).catch(() => undefined)
    return
  }
  if (changeInfo.status !== 'complete') return
  void resumePendingFocusRestoration(tabId).catch(() => undefined)
})

chrome.tabs.onActivated.addListener(activeInfo => {
  void cancelPendingFocusRestorations(
    pending =>
      pending.windowId === activeInfo.windowId &&
      pending.tabId !== activeInfo.tabId
  ).catch(() => undefined)
})

chrome.windows.onFocusChanged.addListener(windowId => {
  void cancelPendingFocusRestorations(
    pending => pending.windowId !== windowId
  ).catch(() => undefined)
})

chrome.tabs.onRemoved.addListener(tabId => {
  void removePendingFocusRestoration(tabId).catch(() => undefined)
})

const initializePendingFocusRestorations = async () => {
  const restorations = await getPendingFocusRestorations()
  for (const pending of Object.values(restorations)) {
    if (Date.now() >= pending.expiresAt) {
      await removePendingFocusRestoration(pending.tabId, pending.requestId)
      continue
    }
    scheduleExpiration(pending)
    void attemptFocusRestoration(pending).catch(() => undefined)
  }
}

void initializePendingFocusRestorations().catch(() => undefined)
