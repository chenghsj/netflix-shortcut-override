import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createCompatibilityReadinessPolicy,
  type CompatibilityDiagnosticsState,
} from './compatibility-readiness'
import { createCompatibilityReadinessObserver } from './compatibility-readiness-observer'
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

const createStates = () => {
  const policy = createCompatibilityReadinessPolicy()
  return {
    policy,
    ready: policy.resolveState({ diagnostics: READY_DIAGNOSTICS }),
    reloadRequired: policy.resolveState({
      errorMessage: 'Could not establish connection. Receiving end does not exist.',
    }),
    unavailable: policy.resolveState({ errorMessage: 'The message port closed.' }),
  }
}

describe('CompatibilityReadinessObserver', () => {
  afterEach(() => vi.useRealTimers())

  it('retries an initial missing receiver only through the policy limit', async () => {
    vi.useFakeTimers()
    const { policy, reloadRequired } = createStates()
    const requestDiagnostics = vi.fn().mockResolvedValue(reloadRequired)
    const onState = vi.fn()
    const observer = createCompatibilityReadinessObserver({
      readinessPolicy: policy,
      requestDiagnostics,
    })

    observer.observeInitial(17, onState)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(400)

    expect(requestDiagnostics).toHaveBeenCalledTimes(3)
    expect(onState).toHaveBeenCalledTimes(1)
    expect(onState).toHaveBeenCalledWith(reloadRequired)
  })

  it('cancels a scheduled observation and ignores its late response', async () => {
    vi.useFakeTimers()
    const { policy, reloadRequired, ready } = createStates()
    let resolveRequest: ((state: CompatibilityDiagnosticsState) => void) | undefined
    const requestDiagnostics = vi.fn(
      () => new Promise<CompatibilityDiagnosticsState>(resolve => { resolveRequest = resolve })
    )
    const onState = vi.fn()
    const observer = createCompatibilityReadinessObserver({ readinessPolicy: policy, requestDiagnostics })

    const cancel = observer.observeInitial(17, onState)
    await vi.advanceTimersByTimeAsync(0)
    cancel()
    resolveRequest?.(ready)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(onState).not.toHaveBeenCalled()
    expect(requestDiagnostics).toHaveBeenCalledOnce()
    expect(reloadRequired.status).toBe('reload-required')
  })

  it('refreshes unavailable diagnostics without repeating the start signal', async () => {
    vi.useFakeTimers()
    const { policy, unavailable, ready } = createStates()
    const requestDiagnostics = vi
      .fn<() => Promise<CompatibilityDiagnosticsState>>()
      .mockResolvedValueOnce(unavailable)
      .mockResolvedValueOnce(ready)
    const onStart = vi.fn()
    const onState = vi.fn()
    const observer = createCompatibilityReadinessObserver({ readinessPolicy: policy, requestDiagnostics })

    observer.observeRefresh(17, { onStart, onState })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(onStart).toHaveBeenCalledOnce()
    expect(onState).toHaveBeenNthCalledWith(1, unavailable)
    expect(onState).toHaveBeenNthCalledWith(2, ready)
  })

  it('stops focus observation when the pending request expires', async () => {
    vi.useFakeTimers()
    const { policy, unavailable } = createStates()
    const requestDiagnostics = vi.fn().mockResolvedValue(unavailable)
    const beforeAttempt = vi
      .fn<() => Promise<'continue' | 'wait' | 'cancel'>>()
      .mockResolvedValueOnce('continue')
      .mockResolvedValueOnce('cancel')
    const onCancel = vi.fn()
    const observer = createCompatibilityReadinessObserver({ readinessPolicy: policy, requestDiagnostics })

    observer.observePlaybackReadiness(17, {
      beforeAttempt,
      onReady: vi.fn(),
      onCancel,
    })
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(200)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(requestDiagnostics).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
