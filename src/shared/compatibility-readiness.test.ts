import { describe, expect, it } from 'vitest'

import {
  createCompatibilityReadinessPolicy,
  createCompatibilityRequestGeneration,
  INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE,
} from './compatibility-readiness'
import type { CompatibilityDiagnostics } from './diagnostics'

const READY_DIAGNOSTICS = {
  contentScriptReady: true,
  settingsLoaded: true,
  enabled: true,
  videoFound: true,
  bridgeReady: true,
  playerApiFound: true,
  playerFound: true,
  pipSupported: true,
  pipActive: false,
} satisfies CompatibilityDiagnostics

describe('compatibility readiness policy', () => {
  it('applies browser bridge and enabled-state policy consistently', () => {
    const chromePolicy = createCompatibilityReadinessPolicy(
      'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36'
    )
    const firefoxPolicy = createCompatibilityReadinessPolicy(
      'Mozilla/5.0 Firefox/141.0'
    )
    const ready = chromePolicy.resolveState({ diagnostics: READY_DIAGNOSTICS })
    const disabled = chromePolicy.resolveState({
      diagnostics: { ...READY_DIAGNOSTICS, enabled: false },
    })

    expect(chromePolicy.requirePageBridge).toBe(true)
    expect(firefoxPolicy.requirePageBridge).toBe(false)
    expect(chromePolicy.isCoreReady(ready)).toBe(true)
    expect(chromePolicy.isPlaybackReady(ready)).toBe(true)
    expect(chromePolicy.isCoreReady(disabled)).toBe(true)
    expect(chromePolicy.isPlaybackReady(disabled)).toBe(false)
  })

  it('classifies receiver failures and owns retry and refresh decisions', () => {
    const policy = createCompatibilityReadinessPolicy()
    const reloadRequired = policy.resolveState({
      errorMessage: 'Could not establish connection. Receiving end does not exist.',
    })
    const unavailable = policy.resolveState({ errorMessage: 'The message port closed.' })
    const pending = policy.resolveState({
      diagnostics: { ...READY_DIAGNOSTICS, playerFound: false },
    })

    expect(reloadRequired.status).toBe('reload-required')
    expect(unavailable.status).toBe('unavailable')
    expect(policy.shouldRetryMissingReceiver(reloadRequired, 1)).toBe(true)
    expect(policy.shouldRetryMissingReceiver(reloadRequired, 3)).toBe(false)
    expect(policy.shouldRefreshDiagnostics(unavailable)).toBe(true)
    expect(policy.shouldRefreshDiagnostics(pending)).toBe(true)
    expect(policy.shouldRefreshDiagnostics(reloadRequired)).toBe(false)
    expect(policy.shouldRefreshDiagnostics(INITIAL_COMPATIBILITY_DIAGNOSTICS_STATE)).toBe(true)
  })

  it('suppresses stale diagnostic responses without sharing live state', () => {
    const first = createCompatibilityRequestGeneration()
    const second = createCompatibilityRequestGeneration()
    const firstGeneration = first.start()
    const secondGeneration = second.start()

    expect(first.isCurrent(firstGeneration)).toBe(true)
    expect(second.isCurrent(secondGeneration)).toBe(true)

    first.cancel()
    expect(first.isCurrent(firstGeneration)).toBe(false)
    expect(second.isCurrent(secondGeneration)).toBe(true)
  })
})
