import { DEFAULT_SETTINGS, normalizeSettings, type ShortcutSettings } from '@/shared/shortcuts'

export const SETTINGS_STORAGE_KEY = 'shortcutSettings'

type StorageChangeCallback = (settings: ShortcutSettings) => void

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync)

export const getSettings = async (): Promise<ShortcutSettings> => {
  if (!hasChromeStorage()) {
    const raw = globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY)
    return normalizeSettings(raw ? JSON.parse(raw) : DEFAULT_SETTINGS)
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(SETTINGS_STORAGE_KEY, result => {
      const error = chrome.runtime.lastError?.message
      if (error) {
        reject(new Error(error))
        return
      }

      resolve(normalizeSettings(result[SETTINGS_STORAGE_KEY]))
    })
  })
}

export const saveSettings = async (settings: ShortcutSettings): Promise<ShortcutSettings> => {
  const normalized = normalizeSettings(settings)

  if (!hasChromeStorage()) {
    globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
    return normalized
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: normalized }, () => {
      const error = chrome.runtime.lastError?.message
      if (error) {
        reject(new Error(error))
        return
      }

      resolve(normalized)
    })
  })
}

export const subscribeSettings = (callback: StorageChangeCallback): (() => void) => {
  if (!hasChromeStorage() || !chrome.storage.onChanged) return () => undefined

  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== 'sync' || !changes[SETTINGS_STORAGE_KEY]) return
    callback(normalizeSettings(changes[SETTINGS_STORAGE_KEY].newValue))
  }

  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
