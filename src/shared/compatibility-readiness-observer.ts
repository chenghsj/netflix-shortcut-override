import { requestCompatibilityDiagnostics } from './compatibility-diagnostics-client'
import {
  createCompatibilityReadinessPolicy,
  type CompatibilityDiagnosticsState,
  type CompatibilityReadinessPolicy,
} from './compatibility-readiness'

type Timer = ReturnType<typeof setTimeout>
type Cancel = () => void

type PlaybackReadinessCheck = () => Promise<'continue' | 'wait' | 'cancel'>

type CompatibilityReadinessObserverOptions = {
  readinessPolicy?: CompatibilityReadinessPolicy
  requestDiagnostics?: (tabId: number) => Promise<CompatibilityDiagnosticsState>
  setTimer?: (callback: () => void, delay: number) => Timer
  clearTimer?: (timer: Timer) => void
}

export class CompatibilityReadinessObserver {
  private readonly readinessPolicy: CompatibilityReadinessPolicy
  private readonly requestDiagnostics: (tabId: number) => Promise<CompatibilityDiagnosticsState>
  private readonly setTimer: (callback: () => void, delay: number) => Timer
  private readonly clearTimer: (timer: Timer) => void
  private generation = 0
  private timer: Timer | null = null

  constructor(options: CompatibilityReadinessObserverOptions = {}) {
    this.readinessPolicy = options.readinessPolicy ?? createCompatibilityReadinessPolicy()
    this.requestDiagnostics =
      options.requestDiagnostics ??
      (tabId => requestCompatibilityDiagnostics(tabId, this.readinessPolicy))
    this.setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay))
    this.clearTimer = options.clearTimer ?? (timer => clearTimeout(timer))
  }

  observeInitial(
    tabId: number,
    onState: (state: CompatibilityDiagnosticsState) => void
  ): Cancel {
    const generation = this.start()
    let attempt = 0

    const run = async (): Promise<void> => {
      if (!this.isCurrent(generation)) return
      attempt += 1
      const state = await this.requestDiagnostics(tabId)
      if (!this.isCurrent(generation)) return
      if (this.readinessPolicy.shouldRetryMissingReceiver(state, attempt)) {
        this.schedule(generation, run, this.readinessPolicy.missingReceiverRetryIntervalMs)
        return
      }
      onState(state)
    }

    void run()
    return () => this.cancel(generation)
  }

  observeRefresh(
    tabId: number,
    handlers: {
      onStart: () => void
      onState: (state: CompatibilityDiagnosticsState) => void
    }
  ): Cancel {
    const generation = this.start()
    let hasResult = false

    const run = async (): Promise<void> => {
      if (!this.isCurrent(generation)) return
      if (!hasResult) handlers.onStart()
      const state = await this.requestDiagnostics(tabId)
      if (!this.isCurrent(generation)) return
      hasResult = true
      handlers.onState(state)
      if (this.readinessPolicy.shouldRefreshDiagnostics(state)) {
        this.schedule(generation, run, this.readinessPolicy.diagnosticsRefreshIntervalMs)
      }
    }

    void run()
    return () => this.cancel(generation)
  }

  observePlaybackReadiness(
    tabId: number,
    handlers: {
      beforeAttempt: PlaybackReadinessCheck
      onReady: () => Promise<void> | void
      onCancel: () => Promise<void> | void
      onWait?: () => void
    }
  ): Cancel {
    const generation = this.start()

    const cancel = () => {
      if (!this.isCurrent(generation)) return
      this.cancel(generation)
      void handlers.onCancel()
    }
    const run = async (): Promise<void> => {
      if (!this.isCurrent(generation)) return
      const status = await handlers.beforeAttempt()
      if (!this.isCurrent(generation)) return
      if (status === 'cancel') {
        cancel()
        return
      }
      if (status === 'wait') {
        this.cancel(generation)
        handlers.onWait?.()
        return
      }

      const state = await this.requestDiagnostics(tabId)
      if (!this.isCurrent(generation)) return
      if (this.readinessPolicy.isPlaybackReady(state)) {
        this.cancel(generation)
        await handlers.onReady()
        return
      }
      this.schedule(generation, run, this.readinessPolicy.missingReceiverRetryIntervalMs)
    }

    void run()
    return () => this.cancel(generation)
  }

  cancelActive(): void {
    this.cancel(this.generation)
  }

  private start(): number {
    this.cancel(this.generation)
    this.generation += 1
    return this.generation
  }

  private cancel(generation: number): void {
    if (generation !== this.generation) return
    this.generation += 1
    if (this.timer !== null) this.clearTimer(this.timer)
    this.timer = null
  }

  private isCurrent(generation: number): boolean {
    return generation === this.generation
  }

  private schedule(generation: number, callback: () => void, delay: number): void {
    if (!this.isCurrent(generation)) return
    this.timer = this.setTimer(() => {
      this.timer = null
      callback()
    }, delay)
  }
}

export const createCompatibilityReadinessObserver = (
  options?: CompatibilityReadinessObserverOptions
) => new CompatibilityReadinessObserver(options)
