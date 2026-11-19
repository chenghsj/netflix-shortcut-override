import { DEFAULT_SETTINGS, normalizeSettings, parseSettingsForBackup, SHORTCUT_SETTINGS_VERSION } from '@/shared/shortcut-settings'
import type { ShortcutSettings, UiStyle } from '@/shared/shortcut-types'
import { isUiStyle } from '@/shared/ui-styles'
import { resolveLocalePreference } from '@/shared/browser-locale'
import { getCopy } from '@/shared/i18n'
import { recoverCompatibleSettings } from '@/shared/settings-compatibility'

export const SETTINGS_STORAGE_KEY = 'shortcutSettings'
export const SETTINGS_COMPATIBILITY_KEY = 'shortcutSettingsCompatibilityV33'
const LEGACY_SETTINGS_COMPATIBILITY_KEY = 'shortcutSettingsCompatibility'
export const UI_STYLE_STORAGE_KEY = 'shortcutUiStyle'
export const UI_STYLE_DEFAULT_KEY = 'shortcutUiStyleDefault'
const SYNC_ITEM_LIMIT_BYTES = 8192
type StorageValues = Record<string, unknown>
type SettingsSnapshot = {
  functional?: unknown
  compatibility?: unknown
  legacyCompatibility?: unknown
  selection?: unknown
  syncedDefault?: unknown
  localDefault?: unknown
}
const storageFields = [
  { area: 'sync', key: SETTINGS_STORAGE_KEY, field: 'functional' },
  { area: 'sync', key: SETTINGS_COMPATIBILITY_KEY, field: 'compatibility' },
  { area: 'sync', key: LEGACY_SETTINGS_COMPATIBILITY_KEY, field: 'legacyCompatibility' },
  { area: 'sync', key: UI_STYLE_STORAGE_KEY, field: 'selection' },
  { area: 'sync', key: UI_STYLE_DEFAULT_KEY, field: 'syncedDefault' },
  { area: 'local', key: UI_STYLE_DEFAULT_KEY, field: 'localDefault' },
] satisfies { area: 'sync' | 'local'; key: string; field: keyof SettingsSnapshot }[]
const snapshotKeys = storageFields.map(({ field }) => field)
const SYNC_KEYS = storageFields.filter(({ area }) => area === 'sync').map(({ key }) => key)

export type SettingsUpdate = Omit<ShortcutSettings, 'uiStyle'> & { uiStyle?: UiStyle }
type StorageChangeCallback = (settings: SettingsUpdate) => void

const hasChromeStorage = (): boolean =>
  typeof chrome !== 'undefined' && Boolean(chrome.storage?.sync)

const readArea = (area: 'sync' | 'local', keys: string | string[]): Promise<StorageValues> =>
  new Promise((resolve, reject) => {
    chrome.storage[area].get(keys, result => {
      const error = chrome.runtime.lastError?.message
      if (error) reject(new Error(error))
      else resolve(result)
    })
  })

const writeArea = (area: 'sync' | 'local', values: StorageValues): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage[area].set(values, () => {
      const error = chrome.runtime.lastError?.message
      if (error) reject(new Error(error))
      else resolve()
    })
  })

const readSnapshot = async (): Promise<SettingsSnapshot> => {
  if (!hasChromeStorage()) {
    const sync = Object.fromEntries(SYNC_KEYS.map(key => {
      const raw = globalThis.localStorage?.getItem(key)
      return [key, raw ? JSON.parse(raw) : undefined]
    }))
    return {
      functional: sync[SETTINGS_STORAGE_KEY],
      compatibility: sync[SETTINGS_COMPATIBILITY_KEY],
      legacyCompatibility: sync[LEGACY_SETTINGS_COMPATIBILITY_KEY],
      selection: sync[UI_STYLE_STORAGE_KEY],
      syncedDefault: sync[UI_STYLE_DEFAULT_KEY],
    }
  }
  const [sync, local] = await Promise.all([
    readArea('sync', SYNC_KEYS),
    readArea('local', UI_STYLE_DEFAULT_KEY),
  ])
  return {
    functional: sync[SETTINGS_STORAGE_KEY],
    compatibility: sync[SETTINGS_COMPATIBILITY_KEY],
    legacyCompatibility: sync[LEGACY_SETTINGS_COMPATIBILITY_KEY],
    selection: sync[UI_STYLE_STORAGE_KEY],
    syncedDefault: sync[UI_STYLE_DEFAULT_KEY],
    localDefault: local[UI_STYLE_DEFAULT_KEY],
  }
}

const inlineStyle = (functional: unknown): unknown =>
  functional && typeof functional === 'object' && 'uiStyle' in functional
    ? functional.uiStyle
    : undefined

const styleForRead = (snapshot: SettingsSnapshot): UiStyle | undefined =>
  [snapshot.selection, snapshot.syncedDefault, inlineStyle(snapshot.functional), snapshot.localDefault]
    .find(isUiStyle)

const styleForInitialization = (
  snapshot: SettingsSnapshot,
  reason?: 'install' | 'update'
): UiStyle | undefined => {
  if (isUiStyle(snapshot.syncedDefault)) return undefined
  if (!reason && !isUiStyle(snapshot.localDefault)) return undefined
  let fallback: UiStyle
  if (snapshot.functional == null) {
    fallback = reason === 'install' ? 'neobrutalism' : 'classic'
  } else {
    fallback = normalizeSettings(snapshot.functional).uiStyle
  }
  return [snapshot.selection, inlineStyle(snapshot.functional), snapshot.localDefault, fallback]
    .find(isUiStyle)
}

const projectSettings = (snapshot: SettingsSnapshot): ShortcutSettings => {
  const settings = recoverCompatibleSettings(
    snapshot.functional ?? DEFAULT_SETTINGS,
    snapshot.compatibility ?? snapshot.legacyCompatibility,
  )
  const style = styleForRead(snapshot)
  return style ? { ...settings, uiStyle: style } : settings
}

const watchSnapshotChanges = (callback: (changes: SettingsSnapshot) => void): (() => void) => {
  if (!hasChromeStorage() || !chrome.storage.onChanged) return () => undefined
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    const changed: SettingsSnapshot = {}
    for (const { area: storageArea, key, field } of storageFields) {
      if (area === storageArea && changes[key]) changed[field] = changes[key].newValue
    }
    if (snapshotKeys.some(key => key in changed)) callback(changed)
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}

const withStableSnapshot = async <T>(consumeSnapshot: (snapshot: SettingsSnapshot) => T | Promise<T>): Promise<T> => {
  let revision = 0
  const unsubscribe = watchSnapshotChanges(() => { revision += 1 })
  try {
    for (;;) {
      const readRevision = revision
      const snapshot = await readSnapshot()
      if (readRevision !== revision) continue
      return consumeSnapshot(snapshot)
    }
  } finally {
    unsubscribe()
  }
}

export const getSettings = (): Promise<ShortcutSettings> => withStableSnapshot(projectSettings)

// Bootstrap defaults never write the selection key, even if initialization races a user edit.
export const initializeUiStyleDefault = async (reason?: 'install' | 'update'): Promise<void> => {
  const snapshot = await readSnapshot()
  const style = styleForInitialization(snapshot, reason)
  if (!style) return
  // Retain provenance locally so a failed sync write can be retried after worker restart.
  await writeArea('local', { [UI_STYLE_DEFAULT_KEY]: style })
  await writeArea('sync', { [UI_STYLE_DEFAULT_KEY]: style })
}

const settingsForStorage = (settings: ShortcutSettings) => ({
  ...settings,
  // Keep this alias while v0.5.x installations may share sync storage with v0.6.x.
  spaceHold: settings.holdSpeed,
  // Older installations sharing sync storage still read this former name.
  subtitlePractice: settings.subtitleNavigation,
})

const settingsStorageValues = (settings: ShortcutSettings) => ({
  [SETTINGS_STORAGE_KEY]: settingsForStorage(settings),
  [SETTINGS_COMPATIBILITY_KEY]: settings,
  [UI_STYLE_STORAGE_KEY]: settings.uiStyle,
})

// Sync counts the JSON bytes and storage key, including compatibility aliases.
export const fitsSettingsStorageLimit = (settings: ShortcutSettings): boolean =>
  Object.entries(settingsStorageValues(normalizeSettings(settings))).every(([key, value]) =>
    new TextEncoder().encode(JSON.stringify(value)).byteLength + key.length <= SYNC_ITEM_LIMIT_BYTES)

// Seed or upgrade protection without discarding preferences retained for older clients.
// Never rewrite the shared object or classify an empty installation here.
export const initializeSettingsCompatibility = (): Promise<void> => withStableSnapshot(async snapshot => {
  const raw = snapshot.functional
  if (!raw || typeof raw !== 'object') return
  const saved = snapshot.compatibility
  if (saved && typeof saved === 'object' && 'version' in saved && typeof saved.version === 'number') {
    if (saved.version > SHORTCUT_SETTINGS_VERSION) return
    if (saved.version === SHORTCUT_SETTINGS_VERSION && parseSettingsForBackup(saved as Record<string, unknown>).ok) return
  }
  const parsed = parseSettingsForBackup(raw as Record<string, unknown>)
  if (!parsed.ok) return
  const settings = recoverCompatibleSettings(raw, saved ?? snapshot.legacyCompatibility)
  if (!fitsSettingsStorageLimit(settings)) return
  if (hasChromeStorage()) await writeArea('sync', { [SETTINGS_COMPATIBILITY_KEY]: settings })
  else globalThis.localStorage?.setItem(SETTINGS_COMPATIBILITY_KEY, JSON.stringify(settings))
})

const persistSettings = async (settings: ShortcutSettings): Promise<ShortcutSettings> => {
  const normalized = normalizeSettings(settings)
  if (!fitsSettingsStorageLimit(normalized)) {
    throw new Error(getCopy(resolveLocalePreference(normalized.locale)).settingsStorageFull)
  }
  const values = settingsStorageValues(normalized)
  if (!hasChromeStorage()) {
    for (const [key, value] of Object.entries(values)) {
      globalThis.localStorage?.setItem(key, JSON.stringify(value))
    }
  } else {
    await writeArea('sync', values)
  }
  return normalized
}

let settingsWriteQueue: Promise<void> = Promise.resolve()

const enqueueSettingsWrite = (write: () => Promise<ShortcutSettings>): Promise<ShortcutSettings> => {
  const result = settingsWriteQueue.then(write)
  settingsWriteQueue = result.then(() => undefined, () => undefined)
  return result
}

export const updateSettings = (
  updater: (current: ShortcutSettings) => ShortcutSettings
): Promise<ShortcutSettings> => enqueueSettingsWrite(() =>
  withStableSnapshot(snapshot => persistSettings(updater(projectSettings(snapshot))))
)

export const saveSettings = (settings: ShortcutSettings): Promise<ShortcutSettings> =>
  enqueueSettingsWrite(() => persistSettings(settings))

type SettingsObservation = { ready: Promise<void>; unsubscribe: () => void }

const createSettingsObservation = (
  callback: StorageChangeCallback,
  emitInitial: boolean
): SettingsObservation => {
  if (!emitInitial && (!hasChromeStorage() || !chrome.storage.onChanged)) {
    return { ready: Promise.resolve(), unsubscribe: () => undefined }
  }
  const snapshot: SettingsSnapshot = {}
  const changedSinceSubscribe = new Set<keyof SettingsSnapshot>()
  let active = true
  let hydrated = false
  let pendingChange = false
  let delivered: SettingsUpdate | undefined
  const emit = () => {
    if (!active) return
    pendingChange = false
    const { uiStyle, ...functional } = projectSettings(snapshot)
    delivered = hydrated || isUiStyle(snapshot.selection)
      ? { ...functional, uiStyle }
      : functional
    callback(delivered)
  }
  const stopWatching = watchSnapshotChanges(changes => {
    if (!active) return
    for (const key of snapshotKeys) {
      if (!(key in changes)) continue
      snapshot[key] = changes[key]
      changedSinceSubscribe.add(key)
    }
    // Deliver each functional snapshot immediately, including a rapid off/on pair.
    if ('functional' in snapshot) emit()
    else pendingChange = true
  })
  const ready = readSnapshot().then(initial => {
    if (!active) return
    for (const key of snapshotKeys) {
      if (key in initial && !changedSinceSubscribe.has(key)) snapshot[key] = initial[key]
    }
    hydrated = true
    const current = projectSettings(snapshot)
    if (emitInitial || pendingChange || (delivered && (
      delivered.uiStyle !== current.uiStyle || JSON.stringify(normalizeSettings(delivered)) !== JSON.stringify(current)
    ))) emit()
  }, error => {
    if (emitInitial) throw error
    if (active) console.error('Unable to load settings subscription', error)
  })
  return {
    ready,
    unsubscribe: () => {
      active = false
      stopWatching()
    },
  }
}

export const observeSettings = (callback: StorageChangeCallback): SettingsObservation =>
  createSettingsObservation(callback, true)

export const subscribeSettings = (callback: StorageChangeCallback): (() => void) => {
  const observation = createSettingsObservation(callback, false)
  void observation.ready.catch(error => {
    console.error('Unable to deliver settings subscription', error)
  })
  return observation.unsubscribe
}
