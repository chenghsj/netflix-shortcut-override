import {
  CircleCheckIcon,
  DatabaseBackupIcon,
  DownloadIcon,
  RotateCcwIcon,
  UploadIcon,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { Alert, AlertTitle } from '@/components/app-ui/alert'
import { Button } from '@/components/app-ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/app-ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/app-ui/dialog'
import { LOCALE_LABELS, getCopy } from '@/shared/i18n'
import {
  createSettingsBackup,
  getSettingsBackupFilename,
  parseSettingsBackup,
  serializeSettingsBackup,
  type ParsedSettingsBackup,
  type SettingsBackupParseErrorCode,
} from '@/shared/settings-backup'
import { SUBTITLE_NAVIGATION_ACTIONS, type Locale, type ShortcutSettings } from '@/shared/shortcut-types'
import { getShortcutActions } from '@/shared/shortcut-bindings'
import { SUBTITLE_NAVIGATION_COPY } from '@/shared/subtitle-navigation'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'

type SettingsTransferCardProps = {
  title?: ReactNode
  copy: ReturnType<typeof getCopy>
  locale: Locale
  settings: ShortcutSettings
  onReplaceSettings: (settings: ShortcutSettings) => Promise<ShortcutSettings>
}

type SettingsTransfer =
  | { kind: 'idle' | 'reading' }
  | { kind: 'import'; backup: ParsedSettingsBackup; saving: boolean }
  | { kind: 'reset'; saving: boolean }

const formatTemplate = (
  template: string,
  values: Record<string, string | number>
): string =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )

const getExtensionVersion = (): string =>
  typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : 'unknown'

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error'

export function SettingsTransferCard({
  title,
  copy,
  locale,
  settings,
  onReplaceSettings,
}: SettingsTransferCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resetCancelRef = useRef<HTMLButtonElement>(null)
  const [transfer, setTransfer] = useState<SettingsTransfer>({ kind: 'idle' })
  const activeTransfer = useRef(transfer)
  const [parseError, setParseError] = useState<SettingsBackupParseErrorCode | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [imported, setImported] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetComplete, setResetComplete] = useState(false)
  const transferActive = transfer.kind !== 'idle'
  const pendingBackup = transfer.kind === 'import' ? transfer.backup : null
  const importing = transfer.kind === 'import' && transfer.saving
  const resetOpen = transfer.kind === 'reset'
  const resetting = resetOpen && transfer.saving
  const changeTransfer = (next: SettingsTransfer) => {
    activeTransfer.current = next
    setTransfer(next)
  }

  useEffect(() => {
    if (!resetComplete) return
    const timeout = window.setTimeout(() => setResetComplete(false), 5000)
    return () => window.clearTimeout(timeout)
  }, [resetComplete])

  const parseErrorMessages: Record<SettingsBackupParseErrorCode, string> = {
    invalidJson: copy.importInvalidJson,
    invalidRoot: copy.importInvalidRoot,
    wrongFormat: copy.importWrongFormat,
    unsupportedFormatVersion: copy.importUnsupportedFormatVersion,
    invalidMetadata: copy.importInvalidMetadata,
    missingSettings: copy.importMissingSettings,
    invalidSettingsVersion: copy.importInvalidSettingsVersion,
    invalidSettings: copy.importInvalidSettings,
    unsupportedSettingsVersion: copy.importUnsupportedSettingsVersion,
  }

  const exportSettings = () => {
    const exportedAt = new Date()
    const backup = createSettingsBackup(settings, {
      extensionVersion: getExtensionVersion(),
      exportedAt,
    })
    const url = URL.createObjectURL(
      new Blob([serializeSettingsBackup(backup)], { type: 'application/json' })
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = getSettingsBackupFilename(exportedAt)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File) => {
    if (activeTransfer.current.kind !== 'idle') return
    changeTransfer({ kind: 'reading' })
    setImported(false)
    setResetComplete(false)
    setParseError(null)
    setImportError(null)

    let result: ReturnType<typeof parseSettingsBackup>
    try {
      result = parseSettingsBackup(await file.text())
    } catch {
      setParseError('invalidJson')
      changeTransfer({ kind: 'idle' })
      return
    }

    if (!result.ok) {
      setParseError(result.error)
      changeTransfer({ kind: 'idle' })
      return
    }

    changeTransfer({ kind: 'import', backup: result.value, saving: false })
  }

  const confirmImport = async () => {
    const current = activeTransfer.current
    if (current.kind !== 'import' || current.saving) return
    changeTransfer({ ...current, saving: true })
    setImportError(null)

    try {
      await onReplaceSettings(current.backup.settings)
      changeTransfer({ kind: 'idle' })
      setImported(true)
    } catch (error) {
      setImportError(
        formatTemplate(copy.importSaveError, { message: getErrorMessage(error) })
      )
      changeTransfer(current)
    }
  }

  const changeResetOpen = (open: boolean) => {
    const current = activeTransfer.current
    if (open ? current.kind !== 'idle' : current.kind !== 'reset' || current.saving) return
    changeTransfer(open ? { kind: 'reset', saving: false } : { kind: 'idle' })
    setResetError(null)
  }

  const closeImport = () => {
    const current = activeTransfer.current
    if (current.kind !== 'import' || current.saving) return
    changeTransfer({ kind: 'idle' })
    setImportError(null)
  }

  const confirmReset = async () => {
    const current = activeTransfer.current
    if (current.kind !== 'reset' || current.saving) return
    changeTransfer({ kind: 'reset', saving: true })
    setResetError(null)
    setResetComplete(false)
    setImported(false)
    setParseError(null)

    try {
      await onReplaceSettings(DEFAULT_SETTINGS)
      changeTransfer({ kind: 'idle' })
      setResetComplete(true)
    } catch (error) {
      setResetError(
        formatTemplate(copy.resetDefaultsSaveError, { message: getErrorMessage(error) })
      )
      changeTransfer(current)
    }
  }

  const importedSettings = pendingBackup?.settings
  const subtitleCopy = SUBTITLE_NAVIGATION_COPY[locale]
  const enabledSubtitleShortcutCount = importedSettings
    ? SUBTITLE_NAVIGATION_ACTIONS.filter(action => importedSettings.subtitleNavigation.bindings[action].enabled).length
    : 0
  const enabledShortcutCount = importedSettings
    ? Object.values(importedSettings.bindings).filter(binding => binding.enabled).length
    : 0
  const importedLocale = importedSettings
    ? importedSettings.locale === 'auto'
      ? copy.localeAuto
      : LOCALE_LABELS[importedSettings.locale]
    : ''
  const importedTheme = importedSettings
    ? {
        auto: copy.themeAuto,
        light: copy.themeLight,
        dark: copy.themeDark,
      }[importedSettings.theme]
    : ''
  const enabledLabel = (enabled: boolean) =>
    enabled ? copy.backupEnabled : copy.backupDisabled

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {title ?? <span className="flex items-center gap-2"><DatabaseBackupIcon data-icon="inline-start" />{copy.backupRestore}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{copy.backupRestoreDesc}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={transferActive} onClick={exportSettings}>
              <DownloadIcon data-icon="inline-start" />
              {copy.exportSettings}
            </Button>
            <Button
              variant="outline"
              disabled={transferActive}
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = ''
                fileInputRef.current?.click()
              }}
            >
              <UploadIcon data-icon="inline-start" />
              {copy.importSettings}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              disabled={transferActive}
              aria-label={copy.importSettings}
              onChange={event => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file) void importFile(file)
              }}
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertTitle>{parseErrorMessages[parseError]}</AlertTitle>
            </Alert>
          )}
          {imported && (
            <Alert>
              <AlertTitle role="status">{copy.importSuccess}</AlertTitle>
            </Alert>
          )}
          <div className="flex flex-col items-start gap-3 border-t pt-4">
            <p className="text-sm text-muted-foreground">{copy.resetDefaultsDesc}</p>
            <Dialog open={resetOpen} onOpenChange={changeResetOpen}>
              <div className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-2">
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={transferActive}>
                    <RotateCcwIcon data-icon="inline-start" />
                    {copy.resetDefaults}
                  </Button>
                </DialogTrigger>
                <div role="status" aria-live="polite" aria-atomic="true" className="min-w-0">
                  {resetComplete && (
                    <div className="flex items-center gap-2 rounded-lg border-2 bg-card px-2.5 py-1.5 text-sm font-medium text-card-foreground shadow-xs motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
                      <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                      <span>{copy.resetDefaultsSuccess}</span>
                    </div>
                  )}
                </div>
              </div>
              <DialogContent size="compact" showCloseButton={!resetting} onOpenAutoFocus={event => {
                event.preventDefault()
                resetCancelRef.current?.focus()
              }}>
                <DialogHeader>
                  <DialogTitle>{copy.resetDefaultsDialogTitle}</DialogTitle>
                  <DialogDescription>{copy.resetDefaultsDialogDesc}</DialogDescription>
                </DialogHeader>
                {resetError && (
                  <Alert variant="destructive">
                    <AlertTitle>{resetError}</AlertTitle>
                  </Alert>
                )}
                <DialogFooter>
                  <Button ref={resetCancelRef} variant="outline" disabled={resetting} onClick={() => changeResetOpen(false)}>
                    {copy.cancel}
                  </Button>
                  <Button variant="destructive" disabled={resetting} onClick={() => void confirmReset()}>
                    {resetting ? copy.resettingDefaults : copy.resetDefaults}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(pendingBackup)}
        onOpenChange={open => { if (!open) closeImport() }}
      >
        <DialogContent size="wide" className="flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{copy.importDialogTitle}</DialogTitle>
            <DialogDescription>{copy.importDialogDesc}</DialogDescription>
          </DialogHeader>

          {pendingBackup && importedSettings && (
            <dl className="-mx-2 grid min-h-0 min-w-0 gap-x-4 gap-y-2 overflow-y-auto px-2 text-sm sm:grid-cols-[max-content_minmax(0,1fr)]">
              <dt className="text-muted-foreground">{copy.backupDate}</dt>
              <dd>
                {new Intl.DateTimeFormat(locale, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(pendingBackup.exportedAt))}
              </dd>
              <dt className="text-muted-foreground">{copy.backupExtensionVersion}</dt>
              <dd>{pendingBackup.extensionVersion}</dd>
              <dt className="text-muted-foreground">{copy.backupSettingsVersion}</dt>
              <dd>{pendingBackup.settingsVersion}</dd>
              <dt className="text-muted-foreground">{copy.backupLanguageTheme}</dt>
              <dd>{importedLocale} · {importedTheme}</dd>
              <dt className="text-muted-foreground">{copy.enabled}</dt>
              <dd>{enabledLabel(importedSettings.enabled)}</dd>
              <dt className="text-muted-foreground">{copy.backupEnabledShortcuts}</dt>
              <dd>{enabledShortcutCount} / {getShortcutActions(importedSettings).length}</dd>
              <dt className="text-muted-foreground">{subtitleCopy.title}</dt>
              <dd className="min-w-0">
                <p>{formatTemplate(copy.backupSubtitleNavigationSummary, {
                  status: enabledLabel(importedSettings.subtitleNavigation.enabled),
                  count: enabledSubtitleShortcutCount,
                  total: SUBTITLE_NAVIGATION_ACTIONS.length,
                })}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {SUBTITLE_NAVIGATION_ACTIONS.map(action => {
                    const binding = importedSettings.subtitleNavigation.bindings[action]
                    return (
                      <li key={action} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{subtitleCopy[action]}</span>
                        <KeyBindingKbd binding={binding.key} additionalKeys={binding.additionalKeys} emptyLabel={copy.unassignedShortcut} className="flex-wrap" />
                        <span className="text-muted-foreground">{enabledLabel(binding.enabled)}</span>
                      </li>
                    )
                  })}
                </ul>
              </dd>
              <dt className="text-muted-foreground">{copy.speed}</dt>
              <dd>
                {formatTemplate(copy.backupSpeedSummary, {
                  preferred: importedSettings.speed.preferred,
                  min: importedSettings.speed.min,
                  max: importedSettings.speed.max,
                  step: importedSettings.speed.step,
                })}
              </dd>
              <dt className="text-muted-foreground">{copy.seek}</dt>
              <dd>
                {formatTemplate(copy.backupSeekSummary, {
                  seconds: importedSettings.seek.seconds,
                })}
              </dd>
              <dt className="text-muted-foreground">{copy.holdSpeed}</dt>
              <dd>
                {formatTemplate(copy.backupHoldSpeedSummary, {
                  status: enabledLabel(importedSettings.holdSpeed.enabled),
                  speed: importedSettings.holdSpeed.speed,
                  hint: enabledLabel(importedSettings.holdSpeed.showHint),
                })}
              </dd>
            </dl>
          )}

          {importError && (
            <Alert variant="destructive" className="shrink-0">
              <AlertTitle>{importError}</AlertTitle>
            </Alert>
          )}

          <DialogFooter className="shrink-0">
            <Button
              variant="outline"
              disabled={importing}
              onClick={closeImport}
            >
              {copy.cancel}
            </Button>
            <Button disabled={importing} onClick={() => void confirmImport()}>
              {copy.confirmImport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
