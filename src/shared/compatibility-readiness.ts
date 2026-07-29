import {
  isCompatibilityCoreReady,
  type CompatibilityDiagnostics,
} from './diagnostics'
import { getBrowserCapabilities } from './browser-capabilities'

export type CompatibilityDiagnosticsState =
  | { status: 'loading'; diagnostics: null }
  | { status: 'ready'; diagnostics: CompatibilityDiagnostics }
  | { status: 'unavailable'; diagnostics: null }
  | { status: 'reload-required'; diagnostics: null }

export type CompatibilityDiagnosticsQuery = {
  diagnostics?: CompatibilityDiagnostics
  errorMessage?: string
}

export type CompatibilityReadinessPolicy = {
  requirePageBridge: boolean
  missingReceiverRetryIntervalMs: number
  missingReceiverMaxAttempts: number
  diagnosticsRefreshIntervalMs: number
  resolveState(query: CompatibilityDiagnosticsQuery): CompatibilityDiagnosticsState
  isCoreReady(state: CompatibilityDiagnosticsState): boolean
  isPlaybackReady(state: CompatibilityDiagnosticsState): boolean
  shouldRetryMissingReceiver(state: CompatibilityDiagnosticsState, attempt: number): boolean
  shouldRefreshDiagnostics(state: CompatibilityDiagnosticsState): boolean
}

export type CompatibilityRequestGeneration = {
  start(): number
  cancel(): void
  isCurrent(generation: number): boolean
}

const MISSING_MESSAGE_RECEIVER_PATTERN =
  /could not establish connection|receiving end does not exist/i

export const INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE = {
  status: 'loading',
  diagnostics: null,
} satisfies CompatibilityDiagnosticsState

export const createCompatibilityReadinessPolicy = (
  userAgent = globalThis.navigator?.userAgent ?? ''
): CompatibilityReadinessPolicy => {
  const requirePageBridge = getBrowserCapabilities(userAgent).requiresNetflixPageBridge
  const missingReceiverRetryIntervalMs = 200
  const missingReceiverMaxAttempts = 3
  const diagnosticsRefreshIntervalMs = 2_000

  const resolveState = ({
    diagnostics,
    errorMessage,
  }: CompatibilityDiagnosticsQuery): CompatibilityDiagnosticsState => {
    if (errorMessage && MISSING_MESSAGE_RECEIVER_PATTERN.test(errorMessage)) {
      return { status: 'reload-required', diagnostics: null }
    }
    if (errorMessage || !diagnostics) {
      return { status: 'unavailable', diagnostics: null }
    }
    return { status: 'ready', diagnostics }
  }

  const isCoreReady = (state: CompatibilityDiagnosticsState): boolean =>
    state.status === 'ready' &&
    isCompatibilityCoreReady(state.diagnostics, { requirePageBridge })

  return {
    requirePageBridge,
    missingReceiverRetryIntervalMs,
    missingReceiverMaxAttempts,
    diagnosticsRefreshIntervalMs,
    resolveState,
    isCoreReady,
    isPlaybackReady: state =>
      state.status === 'ready' && isCoreReady(state) && state.diagnostics.enabled,
    shouldRetryMissingReceiver: (state, attempt) =>
      state.status === 'reload-required' && attempt < missingReceiverMaxAttempts,
    shouldRefreshDiagnostics: state =>
      state.status !== 'reload-required' && !isCoreReady(state),
  }
}

export const createCompatibilityRequestGeneration = (): CompatibilityRequestGeneration => {
  let currentGeneration = 0

  return {
    start: () => {
      currentGeneration += 1
      return currentGeneration
    },
    cancel: () => {
      currentGeneration += 1
    },
    isCurrent: generation => generation === currentGeneration,
  }
}
