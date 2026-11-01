import { useCallback, useEffect, useRef, useState } from 'react'

import {
  NETFLIX_CAPTION_HOST_PERMISSIONS,
  NETFLIX_PAGE_HOST_PERMISSIONS,
} from '@/shared/netflix-caption-permissions'
import { subscribeSettings } from '@/shared/storage'
import type { useShortcutSettingsForm } from '@/shared/use-shortcut-settings-form'

type SettingsForm = ReturnType<typeof useShortcutSettingsForm>

export function useSubtitleActivation({
  settings,
  updateSettings,
}: Pick<SettingsForm, 'settings' | 'updateSettings'>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<'denied' | 'failed' | null>(null)
  const permissionAttempt = useRef(0)
  const permissionBusy = useRef(false)
  const cancel = useCallback(() => {
    permissionAttempt.current++
    permissionBusy.current = false
    setPending(false)
    setError(null)
  }, [])

  useEffect(() => subscribeSettings(next => {
    // Observe each disable even when another view's off/on updates share a render.
    if (!next.enabled) cancel()
  }), [cancel])
  useEffect(() => () => {
    permissionAttempt.current++
  }, [])

  const setGlobalEnabled = (enabled: boolean) => {
    if (!enabled) cancel()
    updateSettings(current => ({ ...current, enabled }))
  }

  const setEnabled = (enabled: boolean) => {
    if (!settings.enabled || permissionBusy.current) return
    setError(null)
    if (!enabled) {
      updateSettings(current => ({
        ...current,
        subtitlePractice: { ...current.subtitlePractice, enabled: false },
      }))
      return
    }
    const attempt = ++permissionAttempt.current
    permissionBusy.current = true
    setPending(true)
    const fail = (nextError: 'denied' | 'failed') => {
      if (attempt === permissionAttempt.current) setError(nextError)
    }
    const finish = () => {
      if (attempt !== permissionAttempt.current) return
      permissionBusy.current = false
      setPending(false)
    }
    try {
      // Firefox requires this request synchronously within the switch's gesture.
      void chrome.permissions.request({
        origins: [...NETFLIX_PAGE_HOST_PERMISSIONS, ...NETFLIX_CAPTION_HOST_PERMISSIONS],
      })
        .then(granted => {
          if (attempt !== permissionAttempt.current) return
          if (!granted) {
            fail('denied')
            return
          }
          updateSettings(current => current.enabled
            ? { ...current, subtitlePractice: { ...current.subtitlePractice, enabled: true } }
            : current)
        })
        .catch(() => fail('failed'))
        .finally(finish)
    } catch {
      fail('failed')
      finish()
    }
  }

  return { pending, error, setEnabled, setGlobalEnabled }
}
