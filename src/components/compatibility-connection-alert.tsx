import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getCopy } from '@/shared/i18n'

type CompatibilityConnectionAlertProps = {
  copy: ReturnType<typeof getCopy>
  onReloadPage: () => void
}

export function CompatibilityConnectionAlert({
  copy,
  onReloadPage,
}: CompatibilityConnectionAlertProps) {
  return (
    <section
      className="rounded-lg border bg-card p-3 shadow-xs"
      role="alert"
      aria-labelledby="compatibility-connection-alert-title"
    >
      <div className="flex items-start gap-2.5">
        <TriangleAlertIcon className="size-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <h2
            id="compatibility-connection-alert-title"
            className="text-xs font-semibold text-foreground"
          >
            {copy.diagnosticsInactive}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {copy.diagnosticsReloadRequired}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-2.5 w-full"
        onClick={onReloadPage}
      >
        <RefreshCwIcon data-icon="inline-start" />
        {copy.diagnosticsReloadPage}
      </Button>
    </section>
  )
}
