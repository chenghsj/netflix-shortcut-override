import { expect, it, vi } from 'vitest'

import fixtures from '@/shared/fixtures/settings-v0.6.4.json'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { getSettings, saveSettings, SETTINGS_STORAGE_KEY } from '@/shared/storage'

it('preserves stored appearance when PiP preferences change before the initial settings read finishes', async () => {
  await saveSettings({ ...DEFAULT_SETTINGS, uiStyle: 'markdown' })
  const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()
  if (!originalGet) throw new Error('Missing storage mock')
  let deferNextRead = true
  let releaseInitialRead: (() => void) | undefined
  vi.spyOn(chrome.storage.sync, 'get').mockImplementation((keys, callback) => {
    if (deferNextRead) {
      deferNextRead = false
      originalGet(keys, values => {
        releaseInitialRead = () => {
          releaseInitialRead = undefined
          callback?.(values)
        }
      })
      return Promise.resolve({})
    }
    return originalGet(keys, callback)
  })
  window.history.replaceState(null, '', '/watch/123')
  const iframe = document.createElement('iframe')
  document.body.appendChild(iframe)
  const pipWindow = iframe.contentWindow
  if (!pipWindow) throw new Error('Missing PiP fixture window')
  Object.defineProperty(pipWindow, 'close', { configurable: true, value: vi.fn() })
  Object.defineProperty(window, 'documentPictureInPicture', {
    configurable: true,
    value: { requestWindow: vi.fn().mockResolvedValue(pipWindow) },
  })
  try {
    await import('@/content/index')
    await vi.waitFor(() => expect(releaseInitialRead).toBeTypeOf('function'))
    chrome.storage.sync.set({ [SETTINGS_STORAGE_KEY]: fixtures.cases[0].settings })
    const video = document.createElement('video')
    document.body.appendChild(video)
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyP', key: 'P', shiftKey: true, bubbles: true, cancelable: true,
    }))
    await vi.waitFor(() => {
      expect(pipWindow.document.querySelector('[data-pip-control="subtitles-button"]')).not.toBeNull()
    })
    const menuButton = pipWindow.document.querySelector<HTMLButtonElement>('[data-pip-control="subtitles-button"]')
    if (!menuButton) throw new Error('Missing subtitle menu button')
    menuButton.click()
    const backgroundMenu = pipWindow.document.querySelector<HTMLButtonElement>('[data-pip-subtitle-nav="background"]')
    if (!backgroundMenu) throw new Error('Missing subtitle background menu')
    backgroundMenu.click()
    const darkBackground = pipWindow.document.querySelector<HTMLInputElement>('[data-pip-subtitle-background="dark"]')
    if (!darkBackground) throw new Error('Missing dark background option')
    darkBackground.click()
    await vi.waitFor(async () => {
      expect((await getSettings()).pip.subtitleBackground).toBe('dark')
    })
    expect((await getSettings()).uiStyle).toBe('markdown')
    releaseInitialRead?.()
    await vi.waitFor(async () => {
      expect(await getSettings()).toMatchObject({ uiStyle: 'markdown', pip: { subtitleBackground: 'dark' } })
    })
  } finally {
    pipWindow.dispatchEvent(new Event('pagehide'))
    iframe.remove()
    Reflect.deleteProperty(window, 'documentPictureInPicture')
    releaseInitialRead?.()
    vi.restoreAllMocks()
  }
})
