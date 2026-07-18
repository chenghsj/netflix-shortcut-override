import {
  CheckCircle2Icon,
  ClipboardCheckIcon,
  ClipboardIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  formatCompatibilityDiagnosticsReport,
  isCompatibilityCoreReady,
  type CompatibilityDiagnostics,
} from '@/shared/diagnostics'
import { getCopy } from '@/shared/i18n'

export type CompatibilityDiagnosticsState =
  | { status: 'loading'; diagnostics: null }
  | { status: 'ready'; diagnostics: CompatibilityDiagnostics }
  | { status: 'unavailable'; diagnostics: null }
  | { status: 'reload-required'; diagnostics: null }

type CompatibilityDiagnosticsCardProps = {
  className?: string
  copy: ReturnType<typeof getCopy>
  state: CompatibilityDiagnosticsState
  onReloadPage: () => void
}

type DiagnosticsRowProps = {
  label: string
  value: string
  passed: boolean
  neutral?: boolean
}

function DiagnosticsRow({ label, value, passed, neutral = false }: DiagnosticsRowProps) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3">
      <span className="min-w-0 truncate text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-1.5 text-xs font-medium',
          neutral ? 'text-muted-foreground' : passed ? 'text-emerald-600' : 'text-amber-600'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'size-1.5 rounded-full',
            neutral ? 'bg-muted-foreground' : passed ? 'bg-emerald-500' : 'bg-amber-500'
          )}
        />
        {value}
      </span>
    </div>
  )
}

export function CompatibilityDiagnosticsCard({
  className,
  copy,
  state,
  onReloadPage,
}: CompatibilityDiagnosticsCardProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const diagnostics = state.diagnostics
  const coreReady = isCompatibilityCoreReady(diagnostics)
  const compatible = coreReady && diagnostics?.pipSupported === true

  const report = useMemo(() => {
    const extensionVersion =
      typeof chrome !== 'undefined' && chrome.runtime?.getManifest
        ? chrome.runtime.getManifest().version
        : 'unknown'

    return formatCompatibilityDiagnosticsReport({
      diagnostics,
      extensionVersion,
      browser: navigator.userAgent,
    })
  }, [diagnostics])

  const copyDiagnostics = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  return (
    <section
      className={cn('rounded-lg border bg-card p-3 shadow-xs', className)}
      aria-labelledby="diagnostics-title"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <h2
          id="diagnostics-title"
          className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <ShieldCheckIcon className="size-3.5" />
          {copy.diagnosticsTitle}
        </h2>
      </div>

      {state.status === 'loading' && (
        <div className="flex items-start gap-2">
          <RefreshCwIcon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground" role="status">
            {copy.diagnosticsChecking}
          </p>
        </div>
      )}

      {state.status === 'unavailable' && (
        <div className="flex items-start gap-2">
          <RefreshCwIcon className="mt-0.5 size-4 shrink-0 animate-spin text-amber-600" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {copy.diagnosticsRetrying}
          </p>
        </div>
      )}

      {state.status === 'reload-required' && (
        <div className="flex items-start gap-2">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-xs leading-relaxed text-muted-foreground" role="status">
            {copy.diagnosticsReloadRequired}
          </p>
        </div>
      )}

      {state.status === 'ready' && diagnostics && (
        <>
          <div className="mb-2.5 flex items-start gap-2">
            {compatible ? (
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : !coreReady ? (
              <RefreshCwIcon className="mt-0.5 size-4 shrink-0 animate-spin text-amber-600" />
            ) : (
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
            )}
            <p className="text-xs leading-relaxed text-muted-foreground" role="status">
              {compatible
                ? copy.diagnosticsReady
                : coreReady
                  ? copy.diagnosticsWarning
                  : copy.diagnosticsPending}
            </p>
          </div>
          <div className="flex flex-col border-t pt-2">
            <DiagnosticsRow
              label={copy.diagnosticsContentScript}
              value={copy.diagnosticsReadyValue}
              passed={diagnostics.contentScriptReady}
            />
            <DiagnosticsRow
              label={copy.diagnosticsSettings}
              value={
                diagnostics.enabled
                  ? copy.diagnosticsEnabledValue
                  : copy.diagnosticsDisabledValue
              }
              passed={diagnostics.settingsLoaded}
              neutral={!diagnostics.enabled}
            />
            <DiagnosticsRow
              label={copy.diagnosticsVideo}
              value={
                diagnostics.videoFound
                  ? copy.diagnosticsFoundValue
                  : copy.diagnosticsMissingValue
              }
              passed={diagnostics.videoFound}
            />
            <DiagnosticsRow
              label={copy.diagnosticsBridge}
              value={
                diagnostics.bridgeReady
                  ? copy.diagnosticsReadyValue
                  : copy.diagnosticsMissingValue
              }
              passed={diagnostics.bridgeReady}
            />
            <DiagnosticsRow
              label={copy.diagnosticsNetflixApi}
              value={
                diagnostics.playerApiFound && diagnostics.playerFound
                  ? copy.diagnosticsFoundValue
                  : copy.diagnosticsMissingValue
              }
              passed={diagnostics.playerApiFound && diagnostics.playerFound}
            />
            <DiagnosticsRow
              label={copy.diagnosticsPictureInPicture}
              value={
                diagnostics.pipSupported
                  ? copy.diagnosticsSupportedValue
                  : copy.diagnosticsUnsupportedValue
              }
              passed={diagnostics.pipSupported}
            />
          </div>
        </>
      )}

      {state.status === 'reload-required' && (
        <Button
          variant="outline"
          size="xs"
          className="mt-2.5 w-full"
          onClick={onReloadPage}
        >
          <RefreshCwIcon data-icon="inline-start" />
          {copy.diagnosticsReloadPage}
        </Button>
      )}

      {state.status === 'ready' && (
        <Button
          variant="outline"
          size="xs"
          className="mt-2.5 w-full"
          onClick={copyDiagnostics}
        >
          {copyStatus === 'copied' ? (
            <ClipboardCheckIcon data-icon="inline-start" />
          ) : (
            <ClipboardIcon data-icon="inline-start" />
          )}
          {copyStatus === 'copied'
            ? copy.diagnosticsCopied
            : copyStatus === 'failed'
              ? copy.diagnosticsCopyFailed
              : copy.diagnosticsCopy}
        </Button>
      )}
    </section>
  )
}
