import { CircleHelpIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { FieldLabel } from '@/components/ui/field'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type SettingLabelWithTooltipProps = {
  htmlFor: string
  label: string
  tooltip: string
  className?: string
  labelClassName?: string
}

export function SettingLabelWithTooltip({
  htmlFor,
  label,
  tooltip,
  className,
  labelClassName,
}: SettingLabelWithTooltipProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <FieldLabel htmlFor={htmlFor} className={labelClassName}>
        {label}
      </FieldLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`${label} info`}
          >
            <CircleHelpIcon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="max-w-80 whitespace-pre-line"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
