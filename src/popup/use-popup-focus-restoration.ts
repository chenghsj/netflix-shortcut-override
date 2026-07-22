import { useCallback, useEffect, useRef } from 'react'

import {
  PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
  type PlaybackFocusTarget,
} from '@/shared/playback-focus-restoration'

export const usePopupFocusRestoration = (
  resolvePlaybackFocusTarget: () =>
    | PlaybackFocusTarget
    | undefined
    | Promise<PlaybackFocusTarget | undefined>
) => {
  const focusRestorationSuppressedRef = useRef(false)

  useEffect(() => {
    const restoreFocus = () => {
      if (focusRestorationSuppressedRef.current || !chrome.runtime?.sendMessage) return

      const requestFocusRestoration = (
        target: PlaybackFocusTarget | undefined
      ) => {
        if (!target) return

        void Promise.resolve(
          chrome.runtime.sendMessage({
            type: PLAYBACK_FOCUS_RESTORATION_MESSAGE_TYPE,
            ...target,
          })
        )
          .catch(() => undefined)
      }

      try {
        const target = resolvePlaybackFocusTarget()
        if (target instanceof Promise) {
          void target
            .then(requestFocusRestoration)
            .catch(() => undefined)
          return
        }

        requestFocusRestoration(target)
      } catch {
        // Focus restoration is best effort.
      }
    }

    window.addEventListener('pagehide', restoreFocus, { once: true })
    return () => window.removeEventListener('pagehide', restoreFocus)
  }, [resolvePlaybackFocusTarget])

  const suppressFocusRestoration = useCallback(() => {
    focusRestorationSuppressedRef.current = true
  }, [])

  return { suppressFocusRestoration }
}
