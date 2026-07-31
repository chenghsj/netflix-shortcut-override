import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  createCompatibilityReadinessPolicy,
  INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE,
  type CompatibilityDiagnosticsState,
} from '@/shared/compatibility-readiness'
import { createCompatibilityReadinessObserver } from '@/shared/compatibility-readiness-observer'
import {
  isNetflixWatchUrl,
  type PlaybackFocusTarget,
} from '@/shared/playback-focus-restoration'

export type PageStatus = 'watch' | 'netflix' | 'external' | 'unknown'

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

const LONG_PAGE_LOAD_THRESHOLD_MS = 10_000

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

export const useCompatibilitySession = () => {
  const readinessPolicy = useMemo(() => createCompatibilityReadinessPolicy(), [])
  const readinessObserverRef = useRef(
    createCompatibilityReadinessObserver({ readinessPolicy })
  )
  const initialDiagnosticsCompleteRef = useRef(false)
  const pageContextRef = useRef<ActivePageContext>({ generation: 0, status: 'unknown' })
  const pageContextRequestRef = useRef<Promise<ActivePageContext> | null>(null)
  const settledDiagnosticsStateRef = useRef<CompatibilityDiagnosticsState>(
    INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE
  )
  const [pageContext, setPageContext] = useState<ActivePageContext>({
    generation: 0,
    status: 'unknown',
  })
  const [diagnosticsState, setDiagnosticsState] =
    useState<CompatibilityDiagnosticsState>(INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)
  const [longLoadingGeneration, setLongLoadingGeneration] =
    useState<number | null>(null)

  const cancelCompatibilityDiagnosticsRequest = useCallback(() => {
    readinessObserverRef.current.cancelActive()
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
      settledDiagnosticsStateRef.current = INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE
      setDiagnosticsState(INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE)

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

  const startDiagnosticsCycle = useCallback(
    (tabId: number, mode: 'initial' | 'refresh'): (() => void) => {
      if (mode === 'initial') {
        return readinessObserverRef.current.observeInitial(tabId, nextState => {
          initialDiagnosticsCompleteRef.current = true
          commitCompatibilityDiagnosticsState(nextState)
        })
      }

      const cancel = readinessObserverRef.current.observeRefresh(tabId, {
        onStart: () => setDiagnosticsState(INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE),
        onState: commitCompatibilityDiagnosticsState,
      })

      return () => {
        cancel()
        setDiagnosticsState(currentState =>
          currentState.status === 'loading'
            ? settledDiagnosticsStateRef.current
            : currentState
        )
      }
    },
    [commitCompatibilityDiagnosticsState]
  )

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

    return startDiagnosticsCycle(pageContext.tabId, 'initial')
  }, [
    diagnosticsOpen,
    pageContext.loadStatus,
    pageContext.status,
    pageContext.tabId,
    startDiagnosticsCycle,
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

    return startDiagnosticsCycle(pageContext.tabId, 'refresh')
  }, [
    diagnosticsOpen,
    pageContext.loadStatus,
    pageContext.status,
    pageContext.tabId,
    startDiagnosticsCycle,
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
    settledDiagnosticsStateRef.current = INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE
    setDiagnosticsState(INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE)
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
