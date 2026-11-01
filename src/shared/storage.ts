import { DEFAULT_SETTINGS, normalizeSettings } from '@/shared/shortcut-settings'
import type { ShortcutSettings, UiStyle } from '@/shared/shortcut-types'
import { isUiStyle } from '@/shared/ui-styles'

export const SETTINGS_STORAGE_KEY = 'shortcutSettings'
export const UI_STYLE_STORAGE_KEY = 'shortcutUiStyle'
export const UI_STYLE_DEFAULT_KEY = 'shortcutUiStyleDefault'
type StorageValues = Record<string, unknown>
type SettingsSnapshot = {
  functional?: unknown
  selection?: unknown
  syncedDefault?: unknown
  localDefault?: unknown
}
const storageFields = [
  { area: 'sync', key: SETTINGS_STORAGE_KEY, field: 'functional' },
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
  const settings = normalizeSettings(snapshot.functional ?? DEFAULT_SETTINGS)
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

const persistSettings = async (settings: ShortcutSettings): Promise<ShortcutSettings> => {
  const normalized = normalizeSettings(settings)
  const persisted = {
    ...normalized,
    // Keep this alias while v0.5.x installations may share sync storage with v0.6.x.
    spaceHold: normalized.holdSpeed,
  }
  const values = { [SETTINGS_STORAGE_KEY]: persisted, [UI_STYLE_STORAGE_KEY]: normalized.uiStyle }
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
  let pendingAppearanceChange = false
  let delivered: SettingsUpdate | undefined
  const emit = () => {
    if (!active) return
    pendingAppearanceChange = false
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
    else pendingAppearanceChange = true
  })
  const ready = readSnapshot().then(initial => {
    if (!active) return
    for (const key of snapshotKeys) {
      if (key in initial && !changedSinceSubscribe.has(key)) snapshot[key] = initial[key]
    }
    hydrated = true
    if (emitInitial || pendingAppearanceChange || (delivered && delivered.uiStyle !== projectSettings(snapshot).uiStyle)) emit()
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
