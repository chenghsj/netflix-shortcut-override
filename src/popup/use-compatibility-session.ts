import { useCallback, useEffect, useRef, useState } from 'react'

import {
  COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE,
  isCompatibilityCoreReady,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'
import {
  isNetflixWatchUrl,
  type PlaybackFocusTarget,
} from '@/shared/playback-focus-restoration'

export type PageStatus = 'watch' | 'netflix' | 'external' | 'unknown'

export type CompatibilityDiagnosticsState =
  | { status: 'loading'; diagnostics: null }
  | { status: 'ready'; diagnostics: CompatibilityDiagnostics }
  | { status: 'unavailable'; diagnostics: null }
  | { status: 'reload-required'; diagnostics: null }

export type CompatibilityDiagnosticsTriggerState =
  | 'checking'
  | 'default'
  | 'reload-required'

type ActivePageContext = {
  generation: number
  status: PageStatus
  tabId?: number
  windowId?: number
  loadStatus?: chrome.tabs.Tab['status']
}

const DIAGNOSTICS_REFRESH_INTERVAL_MS = 2_000
const MISSING_RECEIVER_RETRY_INTERVAL_MS = 200
const MISSING_RECEIVER_MAX_ATTEMPTS = 3
const LONG_PAGE_LOAD_THRESHOLD_MS = 10_000
const MISSING_MESSAGE_RECEIVER_PATTERN =
  /could not establish connection|receiving end does not exist/i

const INITIAL_DIAGNOSTICS_STATE = {
  status: 'loading',
  diagnostics: null,
} satisfies CompatibilityDiagnosticsState

const resolvePageStatus = (url: string | undefined): PageStatus => {
  if (!url) return 'unknown'

  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const isNetflix = host === 'netflix.com' || host.endsWith('.netflix.com')

    if (!isNetflix) return 'external'
    return isNetflixWatchUrl(url) ? 'watch' : 'netflix'
  } catch {
    return 'unknown'
  }
}

const getActivePageContext = async (): Promise<ActivePageContext> => {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
    return { generation: 0, status: 'unknown' }
  }

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        resolve({ generation: 0, status: 'unknown' })
        return
      }

      resolve({
        generation: 0,
        status: resolvePageStatus(tabs[0]?.url),
        tabId: tabs[0]?.id,
        windowId: tabs[0]?.windowId,
        loadStatus: tabs[0]?.status,
      })
    })
  })
}

const getPlaybackFocusTarget = (
  pageContext: ActivePageContext
): PlaybackFocusTarget | undefined =>
  pageContext.status === 'watch' &&
  typeof pageContext.tabId === 'number' &&
  typeof pageContext.windowId === 'number'
    ? { tabId: pageContext.tabId, windowId: pageContext.windowId }
    : undefined

const getCompatibilityDiagnostics = async (
  tabId: number
): Promise<CompatibilityDiagnosticsState> =>
  new Promise(resolve => {
    chrome.tabs.sendMessage(
      tabId,
      { type: COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE },
      response => {
        const errorMessage = chrome.runtime.lastError?.message
        if (errorMessage && MISSING_MESSAGE_RECEIVER_PATTERN.test(errorMessage)) {
          resolve({ status: 'reload-required', diagnostics: null })
          return
        }
        if (errorMessage || !response) {
          resolve({ status: 'unavailable', diagnostics: null })
          return
        }
        resolve({
          status: 'ready',
          diagnostics: response as CompatibilityDiagnostics,
        })
      }
    )
  })

export const useCompatibilitySession = () => {
  const latestDiagnosticsRequestRef = useRef(0)
  const initialDiagnosticsCompleteRef = useRef(false)
  const pageContextRef = useRef<ActivePageContext>({ generation: 0, status: 'unknown' })
  const pageContextRequestRef = useRef<Promise<ActivePageContext> | null>(null)
  const settledDiagnosticsStateRef = useRef<CompatibilityDiagnosticsState>(
    INITIAL_DIAGNOSTICS_STATE
  )
  const [pageContext, setPageContext] = useState<ActivePageContext>({
    generation: 0,
    status: 'unknown',
  })
  const [diagnosticsState, setDiagnosticsState] =
    useState<CompatibilityDiagnosticsState>(INITIAL_DIAGNOSTICS_STATE)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [longLoadingGeneration, setLongLoadingGeneration] =
    useState<number | null>(null)

  const requestCompatibilityDiagnostics = useCallback(async (tabId: number) => {
    const requestId = (latestDiagnosticsRequestRef.current += 1)
    const nextState = await getCompatibilityDiagnostics(tabId)
    return latestDiagnosticsRequestRef.current === requestId ? nextState : null
  }, [])

  const cancelCompatibilityDiagnosticsRequest = useCallback(() => {
    latestDiagnosticsRequestRef.current += 1
  }, [])

  const commitCompatibilityDiagnosticsState = useCallback(
    (nextState: CompatibilityDiagnosticsState) => {
      settledDiagnosticsStateRef.current = nextState
      setDiagnosticsState(nextState)
    },
    []
  )

  useEffect(() => {
    let active = true
    const pageContextRequest = getActivePageContext()
    pageContextRequestRef.current = pageContextRequest

    void pageContextRequest.then(nextContext => {
      if (active && pageContextRef.current.generation === 0) {
        pageContextRef.current = nextContext
        setPageContext(nextContext)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleTabUpdated: Parameters<
      typeof chrome.tabs.onUpdated.addListener
    >[0] = (tabId, changeInfo, tab) => {
      if (
        tabId !== pageContextRef.current.tabId ||
        (changeInfo.status !== 'loading' && changeInfo.status !== 'complete')
      ) {
        return
      }

      cancelCompatibilityDiagnosticsRequest()
      initialDiagnosticsCompleteRef.current = false
      settledDiagnosticsStateRef.current = INITIAL_DIAGNOSTICS_STATE
      setDiagnosticsState(INITIAL_DIAGNOSTICS_STATE)

      const nextContext: ActivePageContext = {
        generation: pageContextRef.current.generation + 1,
        status: resolvePageStatus(tab.url),
        tabId,
        windowId: tab.windowId,
        loadStatus: changeInfo.status,
      }
      pageContextRef.current = nextContext
      setPageContext(nextContext)
    }

    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    return () => chrome.tabs.onUpdated.removeListener(handleTabUpdated)
  }, [cancelCompatibilityDiagnosticsRequest])

  const resolvePlaybackFocusTarget = useCallback(():
    | PlaybackFocusTarget
    | undefined
    | Promise<PlaybackFocusTarget | undefined> => {
    const currentContext = pageContextRef.current
    if (currentContext.status !== 'unknown') {
      return getPlaybackFocusTarget(currentContext)
    }

    return pageContextRequestRef.current?.then(getPlaybackFocusTarget)
  }, [])

  useEffect(() => {
    if (pageContext.status !== 'watch' || pageContext.loadStatus !== 'loading') {
      return
    }

    const timer = window.setTimeout(
      () => setLongLoadingGeneration(pageContext.generation),
      LONG_PAGE_LOAD_THRESHOLD_MS
    )
    return () => window.clearTimeout(timer)
  }, [pageContext])

  const isPageLoadingLong =
    pageContext.status === 'watch' &&
    pageContext.loadStatus === 'loading' &&
    longLoadingGeneration === pageContext.generation

  useEffect(() => {
    if (
      diagnosticsOpen ||
      initialDiagnosticsCompleteRef.current ||
      pageContext.status !== 'watch' ||
      pageContext.loadStatus === 'loading' ||
      typeof pageContext.tabId !== 'number'
    ) {
      return
    }

    let active = true
    let retryTimer: number | undefined
    let attempt = 0
    const tabId = pageContext.tabId

    const checkDiagnosticsConnection = async () => {
      attempt += 1
      const nextState = await requestCompatibilityDiagnostics(tabId)
      if (!active || nextState === null) return

      if (
        nextState.status === 'reload-required' &&
        attempt < MISSING_RECEIVER_MAX_ATTEMPTS
      ) {
        retryTimer = window.setTimeout(
          () => void checkDiagnosticsConnection(),
          MISSING_RECEIVER_RETRY_INTERVAL_MS
        )
        return
      }

      initialDiagnosticsCompleteRef.current = true
      commitCompatibilityDiagnosticsState(nextState)
    }

    void checkDiagnosticsConnection()

    return () => {
      active = false
      cancelCompatibilityDiagnosticsRequest()
      if (retryTimer !== undefined) window.clearTimeout(retryTimer)
    }
  }, [
    cancelCompatibilityDiagnosticsRequest,
    commitCompatibilityDiagnosticsState,
    diagnosticsOpen,
    pageContext.status,
    pageContext.tabId,
    pageContext.loadStatus,
    requestCompatibilityDiagnostics,
  ])

  useEffect(() => {
    if (
      !diagnosticsOpen ||
      pageContext.status !== 'watch' ||
      pageContext.loadStatus === 'loading' ||
      typeof pageContext.tabId !== 'number'
    ) {
      return
    }

    let active = true
    let refreshTimer: number | undefined
    let hasDiagnosticsResult = false
    const tabId = pageContext.tabId

    const refreshDiagnostics = async () => {
      if (!hasDiagnosticsResult) {
        setDiagnosticsState(INITIAL_DIAGNOSTICS_STATE)
      }
      const nextState = await requestCompatibilityDiagnostics(tabId)
      if (!active || nextState === null) return
      hasDiagnosticsResult = true
      initialDiagnosticsCompleteRef.current = true
      commitCompatibilityDiagnosticsState(nextState)
      if (
        nextState.status !== 'reload-required' &&
        !isCompatibilityCoreReady(nextState.diagnostics)
      ) {
        refreshTimer = window.setTimeout(refreshDiagnostics, DIAGNOSTICS_REFRESH_INTERVAL_MS)
      }
    }

    void refreshDiagnostics()

    return () => {
      active = false
      cancelCompatibilityDiagnosticsRequest()
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer)
      setDiagnosticsState(currentState =>
        currentState.status === 'loading'
          ? settledDiagnosticsStateRef.current
          : currentState
      )
    }
  }, [
    cancelCompatibilityDiagnosticsRequest,
    commitCompatibilityDiagnosticsState,
    diagnosticsOpen,
    pageContext.status,
    pageContext.tabId,
    pageContext.loadStatus,
    requestCompatibilityDiagnostics,
  ])

  const diagnosticsTriggerState: CompatibilityDiagnosticsTriggerState =
    diagnosticsState.status === 'loading'
      ? 'checking'
      : diagnosticsState.status === 'reload-required'
        ? 'reload-required'
        : 'default'

  const reloadNetflixPage = () => {
    cancelCompatibilityDiagnosticsRequest()
    initialDiagnosticsCompleteRef.current = false
    if (typeof pageContext.tabId === 'number' && chrome.tabs?.reload) {
      void chrome.tabs.reload(pageContext.tabId)
      window.close()
    }
    settledDiagnosticsStateRef.current = INITIAL_DIAGNOSTICS_STATE
    setDiagnosticsState(INITIAL_DIAGNOSTICS_STATE)
    setDiagnosticsOpen(false)
  }

  return {
    pageStatus: pageContext.status,
    isPageLoadingLong,
    resolvePlaybackFocusTarget,
    diagnosticsState,
    diagnosticsTriggerState,
    diagnosticsOpen,
    setDiagnosticsOpen,
    reloadNetflixPage,
  }
}
