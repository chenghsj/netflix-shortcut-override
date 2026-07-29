import {
  COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE,
  type CompatibilityDiagnostics,
} from './diagnostics'
import {
  createCompatibilityReadinessPolicy,
  type CompatibilityDiagnosticsState,
  type CompatibilityReadinessPolicy,
} from './compatibility-readiness'

export const requestCompatibilityDiagnostics = (
  tabId: number,
  readinessPolicy: CompatibilityReadinessPolicy = createCompatibilityReadinessPolicy()
): Promise<CompatibilityDiagnosticsState> =>
  new Promise(resolve => {
    chrome.tabs.sendMessage(
      tabId,
      { type: COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE },
      response => {
        resolve(
          readinessPolicy.resolveState({
            diagnostics: response
              ? (response as CompatibilityDiagnostics)
              : undefined,
            errorMessage: chrome.runtime.lastError?.message,
          })
        )
      }
    )
  })
