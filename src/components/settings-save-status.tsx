import { cn } from '@/lib/utils'

type SettingsSaveStatusProps = {
  error: string | null
  errorLabel: string
  className?: string
}

export function SettingsSaveStatus({
  error,
  errorLabel,
  className,
}: SettingsSaveStatusProps) {
  if (!error) return null

  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn(
        'text-xs leading-relaxed text-destructive',
        className
      )}
    >
      {errorLabel}: {error}
    </p>
  )
}
