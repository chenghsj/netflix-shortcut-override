import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

type ChromeStorageArea = {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
}

const storageState: Record<string, unknown> = {}
const sessionStorageState: Record<string, unknown> = {}
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

const sessionArea = {
  get: vi.fn(
    (
      keys: string | string[] | null,
      callback: (items: Record<string, unknown>) => void
    ) => {
      if (typeof keys === 'string') {
        callback({ [keys]: sessionStorageState[keys] })
        return
      }
      if (Array.isArray(keys)) {
        callback(
          Object.fromEntries(keys.map(key => [key, sessionStorageState[key]]))
        )
        return
      }
      callback({ ...sessionStorageState })
    }
  ),
  set: vi.fn((items: Record<string, unknown>, callback?: () => void) => {
    Object.assign(sessionStorageState, items)
    callback?.()
  }),
  remove: vi.fn((keys: string | string[], callback?: () => void) => {
    for (const key of typeof keys === 'string' ? [keys] : keys) {
      delete sessionStorageState[key]
    }
    callback?.()
  }),
}

const defaultTabsQuery = (
  _query: chrome.tabs.QueryInfo,
  callback: (tabs: chrome.tabs.Tab[]) => void
) => {
  callback([
    {
      id: 1,
      windowId: 1,
      status: 'complete',
      url: 'https://www.netflix.com/watch/123',
    } as chrome.tabs.Tab,
  ])
}

const defaultTabsSendMessage = (
  _tabId: number,
  _message: unknown,
  callback: (response: Record<string, unknown>) => void
) => {
  callback({
    contentScriptReady: true,
    settingsLoaded: true,
    enabled: true,
    videoFound: true,
    bridgeReady: true,
    playerApiFound: true,
    playerFound: true,
    pipSupported: true,
    pipActive: false,
  })
}

const defaultTabsGet = (
  tabId: number,
  callback: (tab: chrome.tabs.Tab) => void
) => {
  callback({
    id: tabId,
    windowId: 1,
    active: true,
    status: 'complete',
    url: 'https://www.netflix.com/watch/123',
  } as chrome.tabs.Tab)
}

const defaultWindowsGet = (
  windowId: number,
  callback: (window: chrome.windows.Window) => void
) => {
  callback({ id: windowId, focused: true } as chrome.windows.Window)
}

const chromeMock = {
  i18n: {
    getUILanguage: vi.fn(() => 'en-US'),
  },
  action: {
    onClicked: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
    getManifest: vi.fn(() => ({ version: '0.4.0' })),
    openOptionsPage: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    get: vi.fn(defaultTabsGet),
    reload: vi.fn(),
    query: vi.fn(defaultTabsQuery),
    sendMessage: vi.fn(defaultTabsSendMessage),
    onUpdated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onActivated: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    onRemoved: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  windows: {
    WINDOW_ID_NONE: -1,
    get: vi.fn(defaultWindowsGet),
    onFocusChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn().mockResolvedValue([{ frameId: 0, result: true }]),
  },
  storage: {
    sync: syncArea,
    session: sessionArea,
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

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
})

Element.prototype.scrollIntoView = vi.fn()

beforeEach(() => {
  for (const key of Object.keys(storageState)) delete storageState[key]
  for (const key of Object.keys(sessionStorageState)) delete sessionStorageState[key]
  vi.clearAllMocks()
  chromeMock.i18n.getUILanguage.mockReturnValue('en-US')
  chromeMock.runtime.sendMessage.mockReset().mockResolvedValue(undefined)
  chromeMock.tabs.get.mockReset().mockImplementation(defaultTabsGet)
  chromeMock.tabs.query.mockImplementation(defaultTabsQuery)
  chromeMock.tabs.sendMessage.mockImplementation(defaultTabsSendMessage)
  chromeMock.windows.get.mockReset().mockImplementation(defaultWindowsGet)
  chromeMock.scripting.executeScript
    .mockReset()
    .mockResolvedValue([{ frameId: 0, result: true }])
})
