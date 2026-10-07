import { FEATURE_ANNOUNCEMENTS } from '@/shared/feature-announcements'
import type { FeatureAnnouncement } from '@/shared/feature-announcement'

export const registerFeatureAnnouncements = (
  announcements: readonly FeatureAnnouncement[] = FEATURE_ANNOUNCEMENTS,
) => {
  // Serialize refreshes so a slow initial read cannot restore a cleared badge.
  let queue = Promise.resolve()
  let active = true
  const refresh = (activated?: FeatureAnnouncement, installed?: chrome.runtime.InstalledDetails) => {
    queue = queue.then(async () => {
      if (!active) return
      if (installed) {
        const currentVersion = chrome.runtime.getManifest().version
        await Promise.all(announcements.map(announcement => announcement.recordInstall(installed, currentVersion)))
      }
      // Remember activation even if the feature is disabled before this read.
      if (activated) await activated.dismiss()
      const states = await Promise.all(announcements.map(announcement => announcement.getState()))
      if (!active) return
      const unread = states.some(state => state.unread)
      if (unread) {
        await chrome.action.setBadgeBackgroundColor({ color: '#b91c1c' })
        await chrome.action.setBadgeTextColor({ color: '#ffffff' })
      }
      await chrome.action.setBadgeText({ text: unread ? 'NEW' : '' })
    }).catch(() => undefined)
  }
  const unsubscribes = announcements.map(announcement =>
    announcement.subscribe(activated => refresh(activated ? announcement : undefined)),
  )
  const installed = (details: chrome.runtime.InstalledDetails) => refresh(undefined, details)
  const startup = () => refresh()
  chrome.runtime.onInstalled.addListener(installed)
  chrome.runtime.onStartup.addListener(startup)
  // Also restore the badge when an MV3 worker wakes after being suspended.
  refresh()
  return () => {
    active = false
    for (const unsubscribe of unsubscribes) unsubscribe()
    chrome.runtime.onInstalled.removeListener(installed)
    chrome.runtime.onStartup.removeListener(startup)
  }
}
