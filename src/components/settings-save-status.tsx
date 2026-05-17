import { cn } from '@/lib/utils'

type SettingsSaveStatusProps = {
  isSaving: boolean
  error: string | null
  savingLabel: string
  errorLabel: string
  className?: string
}

export function SettingsSaveStatus({
  isSaving,
  error,
  savingLabel,
  errorLabel,
  className,
}: SettingsSaveStatusProps) {
  const message = error ? `${errorLabel}: ${error}` : isSaving ? savingLabel : null
  if (!message) return null

  return (
    <p
      role={error ? 'alert' : 'status'}
      aria-live="polite"
      className={cn(
        'text-xs leading-relaxed',
        error ? 'text-destructive' : 'text-muted-foreground',
        className
      )}
    >
      {message}
    </p>
  )
}
