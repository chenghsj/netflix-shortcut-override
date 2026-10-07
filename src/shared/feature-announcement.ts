import { getSettings, SETTINGS_STORAGE_KEY } from '@/shared/storage'
import { normalizeSettings } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'

export type FeatureAnnouncementDefinition = {
  id: string
  introducedIn: string
  /** Only persisted activation retires the introduction. Omit for informational features. */
  isEnabled?: (settings: ShortcutSettings) => boolean
}

export type FeatureAnnouncementState = { pending: boolean; unread: boolean }

const hasExtensionStorage = () =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)

const readFlag = (key: string): Promise<boolean> => {
  if (!hasExtensionStorage()) return Promise.resolve(localStorage.getItem(key) === 'true')
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, items => {
      const error = chrome.runtime.lastError?.message
      if (error) reject(new Error(error))
      else resolve(items[key] === true)
    })
  })
}

const writeFlag = (key: string, value: boolean): Promise<void> => {
  if (!hasExtensionStorage()) {
    localStorage.setItem(key, String(value))
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime.lastError?.message
      if (error) reject(new Error(error))
      else resolve()
    })
  })
}

// Chrome versions use up to four numeric components, padded with zeroes.
const parseVersion = (version: string): number[] | undefined =>
  /^\d+(?:\.\d+){0,3}$/.test(version) ? version.split('.').map(Number) : undefined

const compareVersions = (left: string, right: string): number | undefined => {
  const a = parseVersion(left)
  const b = parseVersion(right)
  if (!a || !b) return undefined
  for (let index = 0; index < 4; index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export const createFeatureAnnouncement = ({ id, introducedIn, isEnabled }: FeatureAnnouncementDefinition) => {
  // Restrict IDs so one feature cannot collide with another feature's suffix keys.
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Invalid announcement ID')
  if (!parseVersion(introducedIn)) throw new Error('Invalid announcement release version')

  const keys = {
    // Preserve the original acknowledgement key for existing installations.
    dismissed: `announcement:${id}`,
    eligible: `announcement:${id}:eligible`,
    seen: `announcement:${id}:seen`,
  } as const
  const dismiss = () => writeFlag(keys.dismissed, true)
  const markSeen = () => writeFlag(keys.seen, true)

  const recordInstall = async (details: chrome.runtime.InstalledDetails, currentVersion: string): Promise<void> => {
    if (details.reason === 'install') {
      await writeFlag(keys.eligible, false)
      return
    }
    if (details.reason !== 'update' || !details.previousVersion) return
    const currentComparison = compareVersions(currentVersion, introducedIn)
    if (compareVersions(details.previousVersion, introducedIn) === -1 && currentComparison !== undefined && currentComparison >= 0) {
      // Development reloads and later updates never reset seen/dismissed state.
      await writeFlag(keys.eligible, true)
    }
  }

  const getState = async (): Promise<FeatureAnnouncementState> => {
    const [dismissed, eligible, seen, enabled] = await Promise.all([
      readFlag(keys.dismissed), readFlag(keys.eligible), readFlag(keys.seen),
      isEnabled ? getSettings().then(isEnabled) : false,
    ])
    if (dismissed) return { pending: false, unread: false }
    if (enabled) {
      await dismiss()
      return { pending: false, unread: false }
    }
    return { pending: eligible, unread: eligible && !seen }
  }

  const subscribe = (callback: (activated?: boolean) => void): (() => void) => {
    const localKeys: string[] = Object.values(keys)
    if (!hasExtensionStorage()) {
      const listener = (event: StorageEvent) => {
        if (event.key && (localKeys.includes(event.key) || (isEnabled && event.key === SETTINGS_STORAGE_KEY))) callback()
      }
      window.addEventListener('storage', listener)
      return () => window.removeEventListener('storage', listener)
    }
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && localKeys.some(key => changes[key])) callback()
      if (area === 'sync' && isEnabled && changes[SETTINGS_STORAGE_KEY]) {
        // Capture activation even if a second change disables it before refresh.
        callback(isEnabled(normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue)))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }

  return { id, introducedIn, keys, recordInstall, getState, markSeen, dismiss, subscribe }
}

export type FeatureAnnouncement = ReturnType<typeof createFeatureAnnouncement>
