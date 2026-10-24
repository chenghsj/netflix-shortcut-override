import { ChevronsUpDownIcon, StoreIcon } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/app-ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/app-ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/app-ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/app-ui/tooltip'
import { cn } from '@/lib/utils'
import { getStreamDanmakuStoreUrl } from '@/shared/external-links'

const STREAM_DANMAKU_VALUE = 'stream-danmaku'

const openExternalProject = (url: string) => {
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    void chrome.tabs.create({ url })
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

type OtherProjectsSelectProps = {
  label: string
  ariaLabel: string
  streamDanmakuLabel: string
  streamDanmakuTitle: string
  size?: 'sm' | 'default'
  className?: string
  labelClassName?: string
  iconOnly?: boolean
  onNavigate?: () => void
}

export function OtherProjectsSelect({
  label,
  ariaLabel,
  streamDanmakuLabel,
  streamDanmakuTitle,
  size = 'sm',
  className,
  labelClassName,
  iconOnly = false,
  onNavigate,
}: OtherProjectsSelectProps) {
  const [open, setOpen] = useState(false)
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="outline"
        size={iconOnly ? 'icon' : size}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={cn(
          iconOnly ? 'rounded-full' : 'min-w-28 justify-between has-data-[icon=inline-start]:pl-3',
          className,
        )}
      >
        <StoreIcon data-icon="inline-start" aria-hidden="true" />
        {!iconOnly && <>
          <span className={cn('min-w-0 flex-1 truncate text-left', labelClassName)}>{label}</span>
          <ChevronsUpDownIcon data-icon="inline-end" className="opacity-50" />
        </>}
      </Button>
    </PopoverTrigger>
  )

  return (
    <Popover open={open} onOpenChange={nextOpen => {
      setOpen(nextOpen)
      setTooltipOpen(false)
    }}>
      {iconOnly ? (
        <Tooltip open={tooltipOpen && !open} onOpenChange={nextOpen => setTooltipOpen(nextOpen && !open)}>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={8}>{label}</TooltipContent>
        </Tooltip>
      ) : trigger}
      <PopoverContent align="end" className="w-(--radix-popover-trigger-width) min-w-44 p-0">
        <Command
          filter={(itemValue, search, keywords) => {
            const haystack = `${itemValue} ${(keywords ?? []).join(' ')}`.toLowerCase()
            return haystack.includes(search.toLowerCase()) ? 1 : 0
          }}
        >
          <CommandList className="max-h-56">
            <CommandGroup>
              <CommandItem
                value={STREAM_DANMAKU_VALUE}
                keywords={[streamDanmakuLabel, streamDanmakuTitle]}
                className="[&>svg:last-child]:hidden"
                onSelect={() => {
                  onNavigate?.()
                  setOpen(false)
                  openExternalProject(getStreamDanmakuStoreUrl())
                }}
              >
                <img
                  src="/icons/stream-danmaku.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-4 shrink-0 rounded-[3px]"
                />
                <span className="min-w-0 flex-1 truncate" title={streamDanmakuTitle}>
                  {streamDanmakuLabel}
                </span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
