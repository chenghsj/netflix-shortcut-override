import { DEFAULT_SETTINGS, normalizeSettings } from '@/shared/shortcut-settings'
import type { ShortcutSettings } from '@/shared/shortcut-types'

export const SETTINGS_STORAGE_KEY = 'shortcutSettings'

type StorageChangeCallback = (settings: ShortcutSettings) => void

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync)

const normalizeStoredSettings = (raw: unknown): ShortcutSettings =>
  normalizeSettings(raw ?? DEFAULT_SETTINGS)

const toPersistedSettings = (settings: ShortcutSettings) => {
  const normalized = normalizeSettings(settings)
  return {
    ...normalized,
    // Keep this alias while v0.5.x installations may share sync storage with v0.6.x.
    spaceHold: normalized.holdSpeed,
  }
}

export const getSettings = async (): Promise<ShortcutSettings> => {
  if (!hasChromeStorage()) {
    const raw = globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY)
    return normalizeStoredSettings(raw ? JSON.parse(raw) : undefined)
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(SETTINGS_STORAGE_KEY, result => {
      const error = chrome.runtime.lastError?.message
      if (error) {
        reject(new Error(error))
        return
      }

      resolve(normalizeStoredSettings(result[SETTINGS_STORAGE_KEY]))
    })
  })
}

export const saveSettings = async (settings: ShortcutSettings): Promise<ShortcutSettings> => {
  const normalized = normalizeSettings(settings)
  const persisted = toPersistedSettings(normalized)

  if (!hasChromeStorage()) {
    globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(persisted))
    return normalized
  }

  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: persisted }, () => {
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
