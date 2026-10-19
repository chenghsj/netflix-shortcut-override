import { getSettings, subscribeSettings } from '@/shared/storage'

export const registerActionIcon = () => {
  let active = true
  let settingsChanged = false
  let queue = Promise.resolve()
  const update = (enabled: boolean) => {
    // Keep rapid toggles in order, even when an earlier API call is still pending.
    queue = queue.then(async () => {
      if (!active) return
      const prefix = enabled ? 'icon' : 'icon-disabled'
      await chrome.action.setIcon({
        path: {
          16: `icons/${prefix}16.png`,
          32: `icons/${prefix}32.png`,
          48: `icons/${prefix}48.png`,
          128: `icons/${prefix}128.png`,
        },
      })
    }).catch(() => undefined)
  }
  const unsubscribe = subscribeSettings(settings => {
    settingsChanged = true
    update(settings.enabled)
  })
  // Restore the stored state whenever the background worker starts or wakes.
  void getSettings().then(settings => {
    if (!settingsChanged) update(settings.enabled)
  }).catch(() => undefined)
  return () => {
    active = false
    unsubscribe()
  }
}
