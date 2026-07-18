import { RefreshCwIcon, ShieldAlertIcon, ShieldCheckIcon } from 'lucide-react'
import { useEffect } from 'react'

import {
  CompatibilityDiagnosticsCard,
  type CompatibilityDiagnosticsState,
} from '@/components/compatibility-diagnostics-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { getCopy } from '@/shared/i18n'

export type CompatibilityDiagnosticsTriggerState =
  | 'checking'
  | 'default'
  | 'reload-required'

type CompatibilityDiagnosticsDialogProps = {
  copy: ReturnType<typeof getCopy>
  open: boolean
  state: CompatibilityDiagnosticsState
  triggerState: CompatibilityDiagnosticsTriggerState
  onOpenChange: (open: boolean) => void
  onReloadPage: () => void
}

const useLockPopupBackgroundScroll = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return

    const scrollingElement = document.scrollingElement ?? document.documentElement
    const scrollLeft = scrollingElement.scrollLeft
    const scrollTop = scrollingElement.scrollTop
    const preventScroll = (event: Event) => event.preventDefault()
    const restoreScrollPosition = () => {
      if (scrollingElement.scrollLeft !== scrollLeft) scrollingElement.scrollLeft = scrollLeft
      if (scrollingElement.scrollTop !== scrollTop) scrollingElement.scrollTop = scrollTop
    }

    document.addEventListener('wheel', preventScroll, { capture: true, passive: false })
    document.addEventListener('touchmove', preventScroll, { capture: true, passive: false })
    document.addEventListener('scroll', restoreScrollPosition, true)

    return () => {
      document.removeEventListener('wheel', preventScroll, true)
      document.removeEventListener('touchmove', preventScroll, true)
      document.removeEventListener('scroll', restoreScrollPosition, true)
    }
  }, [locked])
}

export function CompatibilityDiagnosticsDialog({
  copy,
  open,
  state,
  triggerState,
  onOpenChange,
  onReloadPage,
}: CompatibilityDiagnosticsDialogProps) {
  useLockPopupBackgroundScroll(open)
  const triggerLabel =
    triggerState === 'checking'
      ? copy.diagnosticsChecking
      : triggerState === 'reload-required'
        ? `${copy.diagnosticsTitle}: ${copy.diagnosticsInactive}`
        : copy.diagnosticsTitle

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          aria-label={triggerLabel}
          title={triggerLabel}
          disabled={triggerState === 'checking'}
        >
          {triggerState === 'checking' ? (
            <RefreshCwIcon className="animate-spin" />
          ) : triggerState === 'reload-required' ? (
            <ShieldAlertIcon />
          ) : (
            <ShieldCheckIcon />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[20rem] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{copy.diagnosticsTitle}</DialogTitle>
          <DialogDescription>{copy.diagnosticsChecking}</DialogDescription>
        </DialogHeader>
        <CompatibilityDiagnosticsCard
          className="border-0 bg-transparent shadow-none [&>div:first-child]:pr-7"
          copy={copy}
          state={state}
          onReloadPage={onReloadPage}
        />
      </DialogContent>
    </Dialog>
  )
}
