import { ShieldCheckIcon } from 'lucide-react'

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

type CompatibilityDiagnosticsDialogProps = {
  copy: ReturnType<typeof getCopy>
  open: boolean
  state: CompatibilityDiagnosticsState
  onOpenChange: (open: boolean) => void
}

export function CompatibilityDiagnosticsDialog({
  copy,
  open,
  state,
  onOpenChange,
}: CompatibilityDiagnosticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          aria-label={copy.diagnosticsTitle}
          title={copy.diagnosticsTitle}
        >
          <ShieldCheckIcon />
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
        />
      </DialogContent>
    </Dialog>
  )
}
