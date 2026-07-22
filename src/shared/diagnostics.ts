export const COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE =
  'GET_SHORTCUT_OVERRIDE_COMPATIBILITY_DIAGNOSTICS'

export type CompatibilityDiagnosticsRequest = {
  type: typeof COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE
}

export type CompatibilityDiagnostics = {
  contentScriptReady: true
  settingsLoaded: boolean
  enabled: boolean
  videoFound: boolean
  bridgeReady: boolean
  playerApiFound: boolean
  playerFound: boolean
  pipSupported: boolean
  pipActive: boolean
  error?: string
}

export const isCompatibilityCoreReady = (
  diagnostics: CompatibilityDiagnostics | null
): boolean =>
  Boolean(
    diagnostics?.contentScriptReady &&
      diagnostics.settingsLoaded &&
      diagnostics.videoFound &&
      diagnostics.bridgeReady &&
      diagnostics.playerApiFound &&
      diagnostics.playerFound &&
      !diagnostics.error
  )

type DiagnosticsReportOptions = {
  diagnostics: CompatibilityDiagnostics | null
  extensionVersion: string
  browser: string
  generatedAt?: Date
}

export const formatCompatibilityDiagnosticsReport = ({
  diagnostics,
  extensionVersion,
  browser,
  generatedAt = new Date(),
}: DiagnosticsReportOptions): string => {
  const value = (state: boolean | undefined): string =>
    state === undefined ? 'unavailable' : state ? 'yes' : 'no'

  return [
    'Shortcut Override compatibility diagnostics',
    `Generated: ${generatedAt.toISOString()}`,
    `Extension version: ${extensionVersion}`,
    'Page type: Netflix watch page',
    `Content script ready: ${value(diagnostics?.contentScriptReady)}`,
    `Settings loaded: ${value(diagnostics?.settingsLoaded)}`,
    `Shortcut handling enabled: ${value(diagnostics?.enabled)}`,
    `Video found: ${value(diagnostics?.videoFound)}`,
    `Main-world bridge ready: ${value(diagnostics?.bridgeReady)}`,
    `Netflix player API found: ${value(diagnostics?.playerApiFound)}`,
    `Netflix player session found: ${value(diagnostics?.playerFound)}`,
    `Document Picture-in-Picture supported: ${value(diagnostics?.pipSupported)}`,
    `Picture-in-Picture active: ${value(diagnostics?.pipActive)}`,
    `Diagnostic error: ${diagnostics?.error ?? 'none'}`,
    `Browser: ${browser}`,
  ].join('\n')
}

export const isCompatibilityDiagnosticsRequest = (
  value: unknown
): value is CompatibilityDiagnosticsRequest => {
  if (!value || typeof value !== 'object') return false
  return (
    (value as Partial<CompatibilityDiagnosticsRequest>).type ===
    COMPATIBILITY_DIAGNOSTICS_MESSAGE_TYPE
  )
}
