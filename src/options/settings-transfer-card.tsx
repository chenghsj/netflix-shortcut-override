import {
  DatabaseBackupIcon,
  DownloadIcon,
  UploadIcon,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { KeyBindingKbd } from '@/components/key-binding-kbd'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LOCALE_LABELS, getCopy } from '@/shared/i18n'
import {
  createSettingsBackup,
  getSettingsBackupFilename,
  parseSettingsBackup,
  serializeSettingsBackup,
  type ParsedSettingsBackup,
  type SettingsBackupParseErrorCode,
} from '@/shared/settings-backup'
import { SHORTCUT_ACTIONS, SUBTITLE_PRACTICE_ACTIONS, type Locale, type ShortcutSettings } from '@/shared/shortcut-types'
import { SUBTITLE_PRACTICE_COPY } from '@/shared/subtitle-practice'

type SettingsTransferCardProps = {
  copy: ReturnType<typeof getCopy>
  locale: Locale
  settings: ShortcutSettings
  onImport: (settings: ShortcutSettings) => Promise<ShortcutSettings>
}

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
  copy,
  locale,
  settings,
  onImport,
}: SettingsTransferCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingBackup, setPendingBackup] = useState<ParsedSettingsBackup | null>(null)
  const [parseError, setParseError] = useState<SettingsBackupParseErrorCode | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [imported, setImported] = useState(false)
  const [importing, setImporting] = useState(false)

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
    setImported(false)
    setParseError(null)
    setImportError(null)

    let source: string
    try {
      source = await file.text()
    } catch {
      setParseError('invalidJson')
      return
    }

    const result = parseSettingsBackup(source)
    if (!result.ok) {
      setParseError(result.error)
      return
    }

    setPendingBackup(result.value)
  }

  const confirmImport = async () => {
    if (!pendingBackup || importing) return
    setImporting(true)
    setImportError(null)

    try {
      await onImport(pendingBackup.settings)
      setPendingBackup(null)
      setImported(true)
    } catch (error) {
      setImportError(
        formatTemplate(copy.importSaveError, { message: getErrorMessage(error) })
      )
    } finally {
      setImporting(false)
    }
  }

  const importedSettings = pendingBackup?.settings
  const subtitleCopy = SUBTITLE_PRACTICE_COPY[locale]
  const enabledSubtitleShortcutCount = importedSettings
    ? SUBTITLE_PRACTICE_ACTIONS.filter(action => importedSettings.subtitlePractice.bindings[action].enabled).length
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
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackupIcon data-icon="inline-start" />
            {copy.backupRestore}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{copy.backupRestoreDesc}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportSettings}>
              <DownloadIcon data-icon="inline-start" />
              {copy.exportSettings}
            </Button>
            <Button
              variant="outline"
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
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(pendingBackup)}
        onOpenChange={open => {
          if (open || importing) return
          setPendingBackup(null)
          setImportError(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.importDialogTitle}</DialogTitle>
            <DialogDescription>{copy.importDialogDesc}</DialogDescription>
          </DialogHeader>

          {pendingBackup && importedSettings && (
            <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
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
              <dd>{enabledShortcutCount} / {SHORTCUT_ACTIONS.length}</dd>
              <dt className="text-muted-foreground">{subtitleCopy.title}</dt>
              <dd className="min-w-0">
                <p>{formatTemplate(copy.backupSubtitleNavigationSummary, {
                  status: enabledLabel(importedSettings.subtitlePractice.enabled),
                  count: enabledSubtitleShortcutCount,
                  total: SUBTITLE_PRACTICE_ACTIONS.length,
                })}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {SUBTITLE_PRACTICE_ACTIONS.map(action => {
                    const binding = importedSettings.subtitlePractice.bindings[action]
                    return (
                      <li key={action} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{subtitleCopy[action]}</span>
                        <KeyBindingKbd binding={binding.key} className="flex-wrap" />
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
            <Alert variant="destructive">
              <AlertTitle>{importError}</AlertTitle>
            </Alert>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => {
                setPendingBackup(null)
                setImportError(null)
              }}
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
