import {
  AlertCircleIcon,
  CaptionsIcon,
  CircleHelpIcon,
  KeyboardIcon,
} from 'lucide-react'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { Alert, AlertDescription } from '@/components/app-ui/alert'
import { Badge } from '@/components/app-ui/badge'
import { Switch } from '@/components/app-ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/app-ui/tooltip'
import { cn } from '@/lib/utils'
import { SUBTITLE_NAVIGATION_POPUP_COPY } from '@/popup/subtitle-navigation-copy'
import { getCopy } from '@/shared/i18n'
import { keyBindingsEqual } from '@/shared/shortcut-bindings'
import { SUBTITLE_PRACTICE_ACTIONS, type Locale, type ShortcutAction, type ShortcutSettings } from '@/shared/shortcut-types'
import { SUBTITLE_PERMISSION_COPY, SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'
import type { useSubtitleActivation } from '@/shared/use-subtitle-activation'

const POPUP_SHORTCUT_ACTIONS: ShortcutAction[] = [
  'playPause',
  'seekBackward',
  'seekForward',
  'volumeUp',
  'volumeDown',
  'mute',
  'toggleSubtitles',
  'fullscreen',
  'pictureInPicture',
  'skipIntro',
  'speedUp',
  'speedDown',
  'setPreferredSpeed',
  'speedReset',
]

type SubtitleActivation = ReturnType<typeof useSubtitleActivation>

type PopupShortcutsPanelProps = {
  settings: ShortcutSettings
  locale: Locale
  supportsSubtitlePreservingPip: boolean
  activation: Pick<SubtitleActivation, 'pending' | 'error' | 'setEnabled'>
  statusText: string | null
}

export function PopupShortcutsPanel({
  settings,
  locale,
  supportsSubtitlePreservingPip,
  activation: subtitleActivation,
  statusText,
}: PopupShortcutsPanelProps) {
  const copy = getCopy(locale)
  const subtitleCopy = SUBTITLE_PRACTICE_COPY[locale]
  const subtitlePopupCopy = SUBTITLE_NAVIGATION_POPUP_COPY[locale]
  const subtitleNavigationEnabled = settings.enabled && settings.subtitlePractice.enabled
  const shouldShowPageStatus = Boolean(statusText)

  return (
    <>
      {shouldShowPageStatus && (
        <Alert role="note" className="rounded-[var(--ui-card-radius)] p-3 shadow-md">
          <AlertCircleIcon aria-hidden="true" />
          <AlertDescription className="leading-relaxed dark:text-card-foreground">
            {statusText}
          </AlertDescription>
        </Alert>
      )}
      <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md">
        <h2 className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
          <KeyboardIcon className="size-5 shrink-0" />
          {copy.shortcuts}
        </h2>
        <div className="flex flex-col gap-0.5">
          {POPUP_SHORTCUT_ACTIONS.map(action => {
            const binding = settings.bindings[action]
            const actionSupported =
              action !== 'pictureInPicture' ||
              supportsSubtitlePreservingPip
            const overridingSubtitleAction = subtitleNavigationEnabled && binding.enabled && actionSupported
              ? SUBTITLE_PRACTICE_ACTIONS.find(subtitleAction => {
                  const subtitleBinding = settings.subtitlePractice.bindings[subtitleAction]
                  return subtitleBinding.enabled && keyBindingsEqual(subtitleBinding.key, binding.key)
                })
              : undefined
            const overrideDescription = overridingSubtitleAction
              ? subtitlePopupCopy.overriddenBy.replace('{action}', subtitleCopy[overridingSubtitleAction])
              : undefined
            return (
              <div
                key={action}
                className="flex min-h-7 items-center justify-between gap-3 rounded-md px-1.5 transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    'min-w-0 truncate text-sm leading-normal',
                    (!binding.enabled || !actionSupported || overridingSubtitleAction) && 'text-muted-foreground'
                  )}
                  title={actionSupported ? copy.actions[action] : copy.pictureInPictureUnsupported}
                >
                  {copy.actions[action]}
                </span>
                {!actionSupported ? (
                  <Badge
                    variant="secondary"
                    className="max-w-24 justify-start truncate px-1.5 text-xs"
                    title={copy.pictureInPictureUnsupported}
                  >
                    {copy.diagnosticsUnsupportedValue}
                  </Badge>
                ) : overridingSubtitleAction ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <KeyBindingKbd
                      binding={binding.key}
                      className="max-w-32 justify-end overflow-hidden opacity-60"
                    />
                    <Badge
                      variant="secondary"
                      className="max-w-32 justify-start truncate rounded px-1.5 text-xs shadow-xs"
                      title={overrideDescription}
                      aria-label={overrideDescription}
                    >
                      {subtitlePopupCopy.overridden}
                    </Badge>
                  </div>
                ) : binding.enabled ? (
                  <KeyBindingKbd
                    binding={binding.key}
                    className="max-w-32 shrink-0 justify-end overflow-hidden"
                  />
                ) : (
                  <Badge
                    variant="secondary"
                    className="max-w-24 justify-start truncate px-1.5 text-xs"
                    title={copy.disabledStatus}
                  >
                    {copy.disabledStatus}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section
        className="rounded-[var(--ui-card-radius)] border-2 border-border bg-card p-3 shadow-md"
        aria-labelledby="popup-subtitle-navigation-title"
      >
        <div className={cn('flex items-center justify-between gap-3', subtitleNavigationEnabled && 'mb-2')}>
          <div className="flex min-w-0 items-center gap-1.5">
            <h2 id="popup-subtitle-navigation-title" className="flex items-center gap-2 font-heading text-sm font-semibold text-foreground">
              <CaptionsIcon className="size-5 shrink-0" aria-hidden="true" />
              {subtitleCopy.title}
            </h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`${subtitleCopy.title} info`}
                >
                  <CircleHelpIcon className="size-3.5" aria-hidden="true" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="max-w-80">
                <div className="space-y-2 whitespace-normal">
                  {subtitleCopy.description.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id="popup-subtitle-navigation-enabled"
            checked={settings.subtitlePractice.enabled}
            disabled={!settings.enabled || subtitleActivation.pending}
            aria-label={subtitleCopy.enabled}
            aria-busy={subtitleActivation.pending}
            aria-describedby={[
              !settings.enabled && 'popup-subtitle-navigation-guidance',
              subtitleActivation.error && 'popup-subtitle-permission-error',
            ].filter(Boolean).join(' ') || undefined}
            onCheckedChange={subtitleActivation.setEnabled}
          />
        </div>
        {!settings.enabled && (
          <p id="popup-subtitle-navigation-guidance" className="mt-2 text-sm text-muted-foreground">
            {subtitlePopupCopy.requiresEnabled}
          </p>
        )}
        {subtitleActivation.error && (
          <p id="popup-subtitle-permission-error" role="alert" className="mt-2 text-sm text-destructive">
            {SUBTITLE_PERMISSION_COPY[locale][subtitleActivation.error]}
          </p>
        )}
        {subtitleNavigationEnabled && (
          <div className="flex flex-col gap-0.5">
            {SUBTITLE_PRACTICE_ACTIONS.map(action => {
              const binding = settings.subtitlePractice.bindings[action]
              return (
                <div key={action} className="flex min-h-7 items-center justify-between gap-3 rounded-md px-1.5 transition-colors hover:bg-accent">
                  <span className={cn('min-w-0 truncate text-sm leading-normal', !binding.enabled && 'text-muted-foreground')} title={subtitleCopy[action]}>
                    {subtitleCopy[action]}
                  </span>
                  {binding.enabled ? (
                    <KeyBindingKbd binding={binding.key} className="max-w-32 shrink-0 justify-end overflow-hidden" />
                  ) : (
                    <Badge variant="secondary" className="max-w-24 justify-start truncate rounded px-1.5 text-xs shadow-xs" title={copy.disabledStatus}>
                      {copy.disabledStatus}
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
