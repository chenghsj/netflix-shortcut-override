import { expect, it, vi } from 'vitest'

import fixtures from '@/shared/fixtures/settings-v0.6.4.json'
import { getSettings, initializeUiStyleDefault, SETTINGS_STORAGE_KEY } from '@/shared/storage'

it('preserves an upgrade appearance initialized during cold subscription hydration and a PiP save', async () => {
  const originalGet = vi.mocked(chrome.storage.sync.get).getMockImplementation()
  if (!originalGet) throw new Error('Missing storage mock')
  let deferNextRead: 'initial' | 'pip' | undefined = 'initial'
  let releaseInitialRead: (() => void) | undefined
  let finishPipRead: (() => void) | undefined
  vi.spyOn(chrome.storage.sync, 'get').mockImplementation((keys, callback) => {
    if (!deferNextRead) return originalGet(keys, callback)
    const readRole = deferNextRead
    deferNextRead = undefined
    originalGet(keys, values => {
      const finishRead = () => callback?.(values)
      if (readRole === 'initial') releaseInitialRead = finishRead
      else finishPipRead = finishRead
    })
    return Promise.resolve({})
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
    document.body.appendChild(document.createElement('video'))
    window.dispatchEvent(new KeyboardEvent('keydown', {
      code: 'KeyP', key: 'P', shiftKey: true, bubbles: true, cancelable: true,
    }))
    await vi.waitFor(() => {
      expect(pipWindow.document.querySelector('[data-pip-control="subtitles-button"]')).not.toBeNull()
    })
    pipWindow.document.querySelector<HTMLButtonElement>('[data-pip-control="subtitles-button"]')?.click()
    pipWindow.document.querySelector<HTMLButtonElement>('[data-pip-subtitle-nav="background"]')?.click()
    const dark = pipWindow.document.querySelector<HTMLInputElement>('[data-pip-subtitle-background="dark"]')
    if (!dark) throw new Error('Missing dark background option')
    deferNextRead = 'pip'
    dark.click()
    await vi.waitFor(() => expect(finishPipRead).toBeTypeOf('function'))
    await initializeUiStyleDefault('update')
    expect((await getSettings()).uiStyle).toBe('classic')
    finishPipRead?.()
    finishPipRead = undefined
    await vi.waitFor(async () => expect((await getSettings()).pip.subtitleBackground).toBe('dark'))
    expect((await getSettings()).uiStyle).toBe('classic')
    releaseInitialRead?.()
    releaseInitialRead = undefined
    await vi.waitFor(async () => {
      expect(await getSettings()).toMatchObject({ uiStyle: 'classic', pip: { subtitleBackground: 'dark' } })
    })
  } finally {
    finishPipRead?.()
    releaseInitialRead?.()
    pipWindow.dispatchEvent(new Event('pagehide'))
    iframe.remove()
    Reflect.deleteProperty(window, 'documentPictureInPicture')
    vi.restoreAllMocks()
  }
})
