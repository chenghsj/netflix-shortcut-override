import {
  CircleHelpIcon,
  GaugeIcon,
  KeyboardIcon,
  PlayIcon,
  RotateCcwIcon,
  SettingsIcon,
  TimerIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { GitHubIcon } from '@/components/github-icon'
import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { LanguageCombobox } from '@/components/language-combobox'
import { OtherProjectsSelect } from '@/components/other-projects-select'
import { SettingsSaveStatus } from '@/components/settings-save-status'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCopy } from '@/shared/i18n'
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  SEEK_LIMITS,
  SHORTCUT_ACTIONS,
  SPEED_LIMITS,
  findBindingConflict,
  keyBindingFromEvent,
  keyBindingsEqual,
  type KeyBinding,
  type ShortcutAction,
} from '@/shared/shortcuts'
import {
  seekDraftFromSettings,
  speedDraftFromSettings,
  useShortcutSettingsForm,
} from '@/shared/use-shortcut-settings-form'
import { EXTERNAL_LINKS } from '@/shared/external-links'

const ignoredRecordKeys = new Set([
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
])

type RecorderState = {
  action: ShortcutAction
  draft: KeyBinding | null
  savedKey: KeyBinding
} | null

const FieldLabelWithTooltip = ({
  htmlFor,
  label,
  tooltip,
}: {
  htmlFor: string
  label: string
  tooltip: string
}) => (
  <div className="flex w-fit items-center gap-1.5">
    <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-4 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`${label} info`}
        >
          <CircleHelpIcon className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        className="max-w-56 whitespace-pre-line leading-relaxed"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  </div>
)

export function OptionsApp() {
  const {
    settings,
    speedDraft,
    seekDraft,
    loaded,
    saveError,
    updateSettings,
    setSpeedDraft,
    setSpeedDraftField,
    setSeekDraft,
    setSeekDraftSeconds,
    commitSpeedField,
    commitSeekSeconds,
    handleSpeedKeyDown,
    handleSeekKeyDown,
  } = useShortcutSettingsForm()
  const [recorder, setRecorder] = useState<RecorderState>(null)
  const copy = getCopy(settings.locale)

  const resetShortcutBindings = () => {
    updateSettings(current => ({
      ...current,
      bindings: DEFAULT_SETTINGS.bindings,
    }))
  }

  const resetSpeedSettings = () => {
    setSpeedDraft(speedDraftFromSettings(DEFAULT_SETTINGS.speed))
    updateSettings(current => ({
      ...current,
      speed: DEFAULT_SETTINGS.speed,
    }))
  }

  const resetSeekSettings = () => {
    setSeekDraft(seekDraftFromSettings(DEFAULT_SETTINGS.seek))
    updateSettings(current => ({
      ...current,
      seek: DEFAULT_SETTINGS.seek,
    }))
  }

  const activeConflict = useMemo(() => {
    if (!recorder?.draft) return null
    return findBindingConflict(settings, recorder.action, recorder.draft)
  }, [recorder, settings])

  const canSaveDraft = Boolean(recorder?.draft && !activeConflict)
  const canRestoreDraft = Boolean(
    recorder?.draft && !keyBindingsEqual(recorder.draft, recorder.savedKey)
  )

  const saveDraft = () => {
    if (!recorder?.draft || activeConflict) return
    updateSettings(current => ({
      ...current,
      bindings: {
        ...current.bindings,
        [recorder.action]: {
          ...current.bindings[recorder.action],
          key: recorder.draft,
        },
      },
    }))
    setRecorder(null)
  }

  const restoreSavedDraft = () => {
    if (!recorder) return
    setRecorder({
      ...recorder,
      draft: recorder.savedKey,
    })
  }

  if (!loaded) return null

  return (
    <TooltipProvider>
      <main className="min-h-svh bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <header>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex min-w-0 items-center gap-4">
                    <img src="/icons/icon48.png" alt="" className="size-12 shrink-0" />
                    <h1 className="truncate text-2xl font-semibold leading-tight">
                      {copy.appTitle}
                    </h1>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={EXTERNAL_LINKS.githubRepository}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={copy.githubRepositoryAriaLabel}
                      >
                        <GitHubIcon data-icon="inline-start" />
                        {copy.githubRepository}
                      </a>
                    </Button>
                    <OtherProjectsSelect
                      label={copy.otherProjects}
                      ariaLabel={copy.otherProjectsAriaLabel}
                      streamDanmakuLabel={copy.streamDanmakuStore}
                      streamDanmakuTitle={copy.streamDanmakuStoreAriaLabel}
                    />
                  </div>
                </div>
                <SettingsSaveStatus
                  error={saveError}
                  errorLabel={copy.settingsSaveError}
                />
              </CardHeader>
            </Card>
          </header>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon data-icon="inline-start" />
                    {copy.quickSettings}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabel>{copy.locale}</FieldLabel>
                      <LanguageCombobox
                        className="w-36"
                        label={copy.locale}
                        size="default"
                        value={settings.locale}
                        onChange={locale =>
                          updateSettings(current => ({ ...current, locale }))
                        }
                      />
                    </Field>

                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabelWithTooltip
                        htmlFor="enable-shortcut-override"
                        label={copy.enabled}
                        tooltip={copy.enabledDesc}
                      />
                      <Switch
                        id="enable-shortcut-override"
                        checked={settings.enabled}
                        onCheckedChange={enabled =>
                          updateSettings(current => ({ ...current, enabled }))
                        }
                        aria-label={copy.enabled}
                      />
                    </Field>

                    <Field orientation="horizontal" className="items-center justify-between">
                      <FieldLabelWithTooltip
                        htmlFor="show-hints"
                        label={copy.showHints}
                        tooltip={copy.showHintsDesc}
                      />
                      <Switch
                        id="show-hints"
                        checked={settings.showHints}
                        onCheckedChange={showHints =>
                          updateSettings(current => ({ ...current, showHints }))
                        }
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <KeyboardIcon data-icon="inline-start" />
                    {copy.shortcuts}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button variant="outline" onClick={resetShortcutBindings}>
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.resetAll}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{copy.action}</TableHead>
                        <TableHead>{copy.key}</TableHead>
                        <TableHead>{copy.status}</TableHead>
                        <TableHead className="text-right">{copy.columnActions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SHORTCUT_ACTIONS.map(action => {
                        const binding = settings.bindings[action]
                        return (
                          <TableRow key={action}>
                            <TableCell className="font-medium">{copy.actions[action]}</TableCell>
                            <TableCell>
                              <KeyBindingKbd binding={binding.key} />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={binding.enabled}
                                onCheckedChange={enabled =>
                                  updateSettings(current => ({
                                    ...current,
                                    bindings: {
                                      ...current.bindings,
                                      [action]: { ...current.bindings[action], enabled },
                                    },
                                  }))
                                }
                                aria-label={`${copy.actions[action]} ${copy.status}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() =>
                                    setRecorder({
                                      action,
                                      draft: settings.bindings[action].key,
                                      savedKey: settings.bindings[action].key,
                                    })
                                  }
                                >
                                  {copy.edit}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    updateSettings(current => ({
                                      ...current,
                                      bindings: {
                                        ...current.bindings,
                                        [action]: {
                                          enabled: true,
                                          key: DEFAULT_KEY_BINDINGS[action],
                                        },
                                      },
                                    }))
                                  }
                                  aria-label={`${copy.reset} ${copy.actions[action]}`}
                                >
                                  <RotateCcwIcon />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <aside className="flex flex-col gap-6">
              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <GaugeIcon data-icon="inline-start" />
                    {copy.speed}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button
                      variant="outline"
                      onClick={resetSpeedSettings}
                      aria-label={copy.resetSpeedSettings}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabelWithTooltip
                        htmlFor="min-speed"
                        label={copy.minSpeed}
                        tooltip={copy.minSpeedTooltip}
                      />
                      <Input
                        id="min-speed"
                        type="number"
                        min={SPEED_LIMITS.min.min}
                        max={SPEED_LIMITS.min.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedDraft.min}
                        data-speed-field="min"
                        onChange={event => setSpeedDraftField('min', event.target.value)}
                        onBlur={() => commitSpeedField('min')}
                        onKeyDown={handleSpeedKeyDown}
                      />
                    </Field>
                    <Field>
                      <FieldLabelWithTooltip
                        htmlFor="max-speed"
                        label={copy.maxSpeed}
                        tooltip={copy.maxSpeedTooltip}
                      />
                      <Input
                        id="max-speed"
                        type="number"
                        min={SPEED_LIMITS.max.min}
                        max={SPEED_LIMITS.max.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedDraft.max}
                        data-speed-field="max"
                        onChange={event => setSpeedDraftField('max', event.target.value)}
                        onBlur={() => commitSpeedField('max')}
                        onKeyDown={handleSpeedKeyDown}
                      />
                    </Field>
                    <Field>
                      <FieldLabelWithTooltip
                        htmlFor="speed-step"
                        label={copy.step}
                        tooltip={copy.stepTooltip}
                      />
                      <Input
                        id="speed-step"
                        type="number"
                        min={SPEED_LIMITS.step.min}
                        max={SPEED_LIMITS.step.max}
                        step={SPEED_LIMITS.step.inputStep}
                        value={speedDraft.step}
                        data-speed-field="step"
                        onChange={event => setSpeedDraftField('step', event.target.value)}
                        onBlur={() => commitSpeedField('step')}
                        onKeyDown={handleSpeedKeyDown}
                      />
                    </Field>
                    <Field>
                      <FieldLabelWithTooltip
                        htmlFor="hold-speed"
                        label={copy.holdSpeed}
                        tooltip={copy.holdSpeedTooltip}
                      />
                      <Input
                        id="hold-speed"
                        type="number"
                        min={SPEED_LIMITS.hold.min}
                        max={SPEED_LIMITS.hold.max}
                        step={SPEED_LIMITS.hold.inputStep}
                        value={speedDraft.hold}
                        data-speed-field="hold"
                        onChange={event => setSpeedDraftField('hold', event.target.value)}
                        onBlur={() => commitSpeedField('hold')}
                        onKeyDown={handleSpeedKeyDown}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="items-center">
                  <CardTitle className="flex items-center gap-2">
                    <TimerIcon data-icon="inline-start" />
                    {copy.seek}
                  </CardTitle>
                  <CardAction className="row-span-1 self-center">
                    <Button
                      variant="outline"
                      onClick={resetSeekSettings}
                      aria-label={copy.resetSeekSettings}
                    >
                      <RotateCcwIcon data-icon="inline-start" />
                      {copy.reset}
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabelWithTooltip
                        htmlFor="seek-seconds"
                        label={copy.seekSeconds}
                        tooltip={copy.seekSecondsTooltip}
                      />
                      <Input
                        id="seek-seconds"
                        type="number"
                        min={SEEK_LIMITS.seconds.min}
                        max={SEEK_LIMITS.seconds.max}
                        step={SEEK_LIMITS.seconds.inputStep}
                        value={seekDraft.seconds}
                        onChange={event => setSeekDraftSeconds(event.target.value)}
                        onBlur={commitSeekSeconds}
                        onKeyDown={handleSeekKeyDown}
                      />
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            </aside>
          </section>
        </div>
      </main>

      <Dialog open={Boolean(recorder)} onOpenChange={open => !open && setRecorder(null)}>
        <DialogContent
          onKeyDown={event => {
            if (!recorder) return
            if (ignoredRecordKeys.has(event.code)) return
            event.preventDefault()
            event.stopPropagation()
            setRecorder({ ...recorder, draft: keyBindingFromEvent(event) })
          }}
        >
          <DialogHeader>
            <DialogTitle>{copy.recordTitle}</DialogTitle>
            <DialogDescription>{copy.recordDesc}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed bg-muted/35 px-4 text-center">
              {recorder?.draft ? (
                <KeyBindingKbd binding={recorder.draft} className="justify-center" />
              ) : (
                <span className="text-lg font-semibold">{copy.pressKey}</span>
              )}
            </div>
            {recorder?.draft && (
              <Alert variant={activeConflict ? 'destructive' : 'default'}>
                <PlayIcon />
                <AlertTitle>
                  {activeConflict
                    ? copy.conflict.replace('{action}', copy.actions[activeConflict])
                    : copy.noConflict}
                </AlertTitle>
              </Alert>
            )}
          </div>

          <Separator />

          <DialogFooter className="sm:justify-between">
            <Button
              variant="ghost"
              onClick={restoreSavedDraft}
              disabled={!canRestoreDraft}
              aria-label={`${copy.restore} ${copy.actions[recorder?.action ?? 'playPause']}`}
            >
              {copy.restore}
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setRecorder(null)}>
                {copy.cancel}
              </Button>
              <Button onClick={saveDraft} disabled={!canSaveDraft}>
                {copy.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
