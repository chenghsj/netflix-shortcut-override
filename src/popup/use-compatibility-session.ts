import { useCallback, useEffect, useRef, useState } from 'react'

import {
  COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE,
  isCompatibilityCoreReady,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'

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
  status: PageStatus
  tabId?: number
}

const DIAGNOSTICS_REFRESH_INTERVAL_MS = 2_000
const MISSING_RECEIVER_RETRY_INTERVAL_MS = 200
const MISSING_RECEIVER_MAX_ATTEMPTS = 3
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
    return parsed.pathname.startsWith('/watch') ? 'watch' : 'netflix'
  } catch {
    return 'unknown'
  }
}

const getActivePageContext = async (): Promise<ActivePageContext> => {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return { status: 'unknown' }

  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (chrome.runtime.lastError) {
        resolve({ status: 'unknown' })
        return
      }

      resolve({
        status: resolvePageStatus(tabs[0]?.url),
        tabId: tabs[0]?.id,
      })
    })
  })
}

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
  const settledDiagnosticsStateRef = useRef<CompatibilityDiagnosticsState>(
    INITIAL_DIAGNOSTICS_STATE
  )
  const [pageContext, setPageContext] = useState<ActivePageContext>({ status: 'unknown' })
  const [diagnosticsState, setDiagnosticsState] =
    useState<CompatibilityDiagnosticsState>(INITIAL_DIAGNOSTICS_STATE)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false)

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

    void getActivePageContext().then(nextContext => {
      if (active) setPageContext(nextContext)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (
      diagnosticsOpen ||
      initialDiagnosticsCompleteRef.current ||
      pageContext.status !== 'watch' ||
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
    requestCompatibilityDiagnostics,
  ])

  useEffect(() => {
    if (
      !diagnosticsOpen ||
      pageContext.status !== 'watch' ||
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
    diagnosticsState,
    diagnosticsTriggerState,
    diagnosticsOpen,
    setDiagnosticsOpen,
    reloadNetflixPage,
  }
}
