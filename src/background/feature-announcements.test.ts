import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerFeatureAnnouncements as register } from '@/background/feature-announcements'
import { subtitleNavigationAnnouncement } from '@/shared/feature-announcements'
import { createFeatureAnnouncement } from '@/shared/feature-announcement'
import { DEFAULT_SETTINGS } from '@/shared/shortcut-settings'
import { saveSettings } from '@/shared/storage'

describe('feature announcement lifecycle', () => {
  const subscriptions: Array<() => void> = []
  const registerFeatureAnnouncements = (announcements?: Parameters<typeof register>[0]) => { subscriptions.push(register(announcements)) }
  const installed = (reason: string, previousVersion?: string) => {
    vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)?.[0](
      { reason, previousVersion } as chrome.runtime.InstalledDetails,
    )
  }
  const registerEligibleUpdate = () => {
    registerFeatureAnnouncements()
    installed('update', '0.6.2')
  }
  beforeEach(() => {
    vi.spyOn(chrome.runtime, 'getManifest').mockReturnValue({ version: '0.6.3' } as chrome.runtime.Manifest)
  })
  afterEach(() => {
    for (const unsubscribe of subscriptions.splice(0)) unsubscribe()
    vi.restoreAllMocks()
  })
  it.each(['0.6.1', '0.6.2', '0.6.2.0'])('shows subtitle NEW when upgrading from %s to 0.6.3', async previousVersion => {
    registerFeatureAnnouncements()
    installed('update', previousVersion)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    expect(await subtitleNavigationAnnouncement.getState()).toEqual({ pending: true, unread: true })
  })
  it('shows NEW on upgrade and worker restart without enabling or opening anything', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    subscriptions.pop()?.()
    vi.mocked(chrome.action.setBadgeText).mockClear()
    registerFeatureAnnouncements()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    expect(chrome.runtime.onInstalled.addListener).toHaveBeenCalled()
    expect(chrome.runtime.onStartup.addListener).toHaveBeenCalled()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(chrome.tabs.create).not.toHaveBeenCalled()
    expect(chrome.runtime.openOptionsPage).not.toHaveBeenCalled()
  })

  it('clears NEW after dismissal and keeps it cleared on subsequent updates', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    await subtitleNavigationAnnouncement.dismiss()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    const installed = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)?.[0]
    installed?.({ reason: chrome.runtime.OnInstalledReason?.UPDATE ?? 'update', previousVersion: '0.6.3' } as chrome.runtime.InstalledDetails)
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
  })

  it('clears NEW after viewing without enabling or dismissing, including worker restarts and later updates', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    await subtitleNavigationAnnouncement.markSeen()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
    expect((await subtitleNavigationAnnouncement.getState()).unread).toBe(false)
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
    expect(chrome.permissions.request).not.toHaveBeenCalled()
    subscriptions.pop()?.()
    vi.mocked(chrome.action.setBadgeText).mockClear()
    registerFeatureAnnouncements()
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: '0.6.4' } as chrome.runtime.Manifest)
    installed('update', '0.6.3')
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
  })

  it('remembers successful activation even after the feature is disabled', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    await saveSettings(settings)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    settings.subtitlePractice.enabled = false
    await saveSettings(settings)
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
  })

  it('does not announce to users who already enabled the feature', async () => {
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    await saveSettings(settings)
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
  })

  it('remembers activation when the user immediately switches it off again', async () => {
    registerEligibleUpdate()
    const settings = structuredClone(DEFAULT_SETTINGS)
    settings.subtitlePractice.enabled = true
    await saveSettings(settings)
    settings.subtitlePractice.enabled = false
    await saveSettings(settings)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
  })

  it('processes a dismissal during a slow initial settings read without restoring NEW', async () => {
    const original = vi.mocked(chrome.storage.sync.get).getMockImplementation()!
    let release!: () => void
    vi.mocked(chrome.storage.sync.get).mockImplementationOnce((keys, callback) => {
      release = () => original(keys, callback)
    })
    registerEligibleUpdate()
    await vi.waitFor(() => expect(release).toBeDefined())
    await subtitleNavigationAnnouncement.dismiss()
    release()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
  })

  it('keeps a fresh installation quiet, including later ordinary updates', async () => {
    registerFeatureAnnouncements()
    installed('install')
    await vi.waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { [subtitleNavigationAnnouncement.keys.eligible]: false }, expect.any(Function),
    ))
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    const refreshes = vi.mocked(chrome.action.setBadgeText).mock.calls.length
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: '0.6.4' } as chrome.runtime.Manifest)
    installed('update', '0.6.3')
    vi.mocked(chrome.runtime.onStartup.addListener).mock.calls.at(-1)?.[0]()
    await vi.waitFor(() => expect(vi.mocked(chrome.action.setBadgeText).mock.calls.length).toBeGreaterThan(refreshes))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
  })

  it.each([
    ['0.5.0', '0.6.10'],
    ['0.6.1', '0.6.3.0'],
  ])('announces a skipped upgrade from %s to %s', async (previousVersion, currentVersion) => {
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: currentVersion } as chrome.runtime.Manifest)
    registerFeatureAnnouncements()
    installed('update', previousVersion)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
  })

  it('keeps reinstallation quiet after uninstall clears a previous announcement', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    await subtitleNavigationAnnouncement.dismiss()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    subscriptions.pop()?.()
    // Model the cleared local storage and new worker after uninstall/reinstall.
    await new Promise<void>(resolve => chrome.storage.local.clear(resolve))
    vi.mocked(chrome.action.setBadgeText).mockClear()
    registerFeatureAnnouncements()
    installed('install')
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    const refreshes = vi.mocked(chrome.action.setBadgeText).mock.calls.length
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: '0.6.4' } as chrome.runtime.Manifest)
    installed('update', '0.6.3')
    await vi.waitFor(() => expect(vi.mocked(chrome.action.setBadgeText).mock.calls.length).toBeGreaterThan(refreshes))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
  })

  it.each([
    ['update', '0.6.3', '0.6.3'],
    ['update', '0.6.2', '0.6.2'],
    ['update', '0.6.1', '0.6.2'],
    ['update', '0.6.3.0', '0.6.4'],
    ['update', '0.6.3', '0.6.10'],
    ['update', '0.5.0', '0.6.1'],
    ['update', '0.6.4', '0.6.3'],
    ['update', undefined, '0.6.3'],
    ['update', 'invalid', '0.6.3'],
    ['chrome_update', '0.6.1', '0.6.3'],
  ])('keeps %s from %s to %s quiet without existing eligibility', async (reason, previousVersion, currentVersion) => {
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: currentVersion } as chrome.runtime.Manifest)
    registerFeatureAnnouncements()
    installed(reason, previousVersion)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
  })

  it('does not infer eligibility when a worker starts with empty storage', async () => {
    registerFeatureAnnouncements()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('preserves an unread announcement through subsequent updates', async () => {
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    vi.mocked(chrome.action.setBadgeText).mockClear()
    vi.mocked(chrome.runtime.getManifest).mockReturnValue({ version: '0.6.4' } as chrome.runtime.Manifest)
    installed('update', '0.6.3')
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(true)
  })

  it('preserves an existing acknowledgement on a qualifying update', async () => {
    await subtitleNavigationAnnouncement.dismiss()
    registerEligibleUpdate()
    await vi.waitFor(() => expect(chrome.storage.local.set).toHaveBeenCalledWith(
      { [subtitleNavigationAnnouncement.keys.eligible]: true }, expect.any(Function),
    ))
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect((await subtitleNavigationAnnouncement.getState()).pending).toBe(false)
    expect(chrome.storage.local.set).not.toHaveBeenCalledWith(
      { [subtitleNavigationAnnouncement.keys.dismissed]: false }, expect.any(Function),
    )
  })

  it('keeps NEW while any registered feature is unread and restores the aggregate after restart', async () => {
    const second = createFeatureAnnouncement({ id: 'another-feature', introducedIn: '0.6.3' })
    const features = [subtitleNavigationAnnouncement, second]
    registerFeatureAnnouncements(features)
    installed('update', '0.6.1')
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' }))
    const refreshes = vi.mocked(chrome.action.setBadgeText).mock.calls.length
    await subtitleNavigationAnnouncement.markSeen()
    await vi.waitFor(() => expect(vi.mocked(chrome.action.setBadgeText).mock.calls.length).toBeGreaterThan(refreshes))
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: 'NEW' })
    expect(await second.getState()).toEqual({ pending: true, unread: true })
    await second.dismiss()
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect(await subtitleNavigationAnnouncement.getState()).toEqual({ pending: true, unread: false })
    subscriptions.pop()?.()
    vi.mocked(chrome.action.setBadgeText).mockClear()
    registerFeatureAnnouncements(features)
    await vi.waitFor(() => expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ text: '' }))
    expect(chrome.action.setBadgeText).not.toHaveBeenCalledWith({ text: 'NEW' })
  })

  it('removes lifecycle subscriptions when disposed', () => {
    const stop = register()
    const onInstalled = vi.mocked(chrome.runtime.onInstalled.addListener).mock.calls.at(-1)?.[0]
    const onStartup = vi.mocked(chrome.runtime.onStartup.addListener).mock.calls.at(-1)?.[0]
    stop()
    expect(chrome.runtime.onInstalled.removeListener).toHaveBeenCalledWith(onInstalled)
    expect(chrome.runtime.onStartup.removeListener).toHaveBeenCalledWith(onStartup)
  })
})
