import { describe, expect, it } from 'vitest'

import { formatCompatibilityDiagnosticsReport } from '@/shared/diagnostics'

describe('compatibility diagnostics report', () => {
  it('formats useful state without requiring a page URL', () => {
    const report = formatCompatibilityDiagnosticsReport({
      diagnostics: {
        contentScriptReady: true,
        settingsLoaded: true,
        enabled: true,
        videoFound: true,
        bridgeReady: true,
        playerApiFound: true,
        playerFound: true,
        pipSupported: false,
        pipActive: false,
      },
      extensionVersion: '1.2.3',
      browser: 'Test Browser',
      generatedAt: new Date('2026-07-19T00:00:00.000Z'),
    })

    expect(report).toContain('Generated: 2026-07-19T00:00:00.000Z')
    expect(report).toContain('Extension version: 1.2.3')
    expect(report).toContain('Netflix player API found: yes')
    expect(report).toContain('Document Picture-in-Picture supported: no')
    expect(report).not.toContain('/watch/')
  })
})
