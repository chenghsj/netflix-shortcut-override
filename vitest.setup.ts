import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

type ChromeStorageArea = {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

const storageState: Record<string, unknown> = {}
const storageListeners = new Set<(changes: Record<string, chrome.storage.StorageChange>, area: string) => void>()

const syncArea: ChromeStorageArea = {
  get: vi.fn((keys: string | string[] | null, callback: (items: Record<string, unknown>) => void) => {
    if (typeof keys === 'string') {
      callback({ [keys]: storageState[keys] })
      return
    }
    if (Array.isArray(keys)) {
      callback(Object.fromEntries(keys.map(key => [key, storageState[key]])))
      return
    }
    callback({ ...storageState })
  }),
  set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
    const changes = Object.fromEntries(
      Object.entries(items).map(([key, value]) => [
        key,
        {
          oldValue: storageState[key],
          newValue: value,
        },
      ])
    ) as Record<string, chrome.storage.StorageChange>
    Object.assign(storageState, items)
    for (const listener of storageListeners) listener(changes, 'sync')
    callback?.()
  }),
}

const chromeMock = {
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
    openOptionsPage: vi.fn(),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn((_query: chrome.tabs.QueryInfo, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([{ id: 1, url: 'https://www.netflix.com/watch/123' } as chrome.tabs.Tab])
    }),
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([]),
  },
  storage: {
    sync: syncArea,
    onChanged: {
      addListener: vi.fn((listener: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void) => {
        storageListeners.add(listener)
      }),
      removeListener: vi.fn((listener: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void) => {
        storageListeners.delete(listener)
      }),
    },
  },
}

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

Object.assign(globalThis, {
  chrome: chromeMock,
  ResizeObserver: ResizeObserverMock,
})

Element.prototype.scrollIntoView = vi.fn()

beforeEach(() => {
  for (const key of Object.keys(storageState)) delete storageState[key]
  vi.clearAllMocks()
})
