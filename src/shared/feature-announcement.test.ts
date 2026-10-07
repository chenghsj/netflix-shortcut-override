import { describe, expect, it, vi } from 'vitest'
import { createFeatureAnnouncement } from '@/shared/feature-announcement'

const upgrade = { reason: 'update', previousVersion: '0.6.1' } as chrome.runtime.InstalledDetails

describe('reusable feature announcements', () => {
  it('isolates eligibility, viewing, and dismissal for different feature IDs', async () => {
    const first = createFeatureAnnouncement({ id: 'first-feature', introducedIn: '0.6.2' })
    const second = createFeatureAnnouncement({ id: 'second-feature', introducedIn: '0.7.0' })
    await first.recordInstall(upgrade, '0.6.2')
    await second.recordInstall(upgrade, '0.6.2')
    expect(await first.getState()).toEqual({ pending: true, unread: true })
    expect(await second.getState()).toEqual({ pending: false, unread: false })
    await second.recordInstall(upgrade, '0.7.0')
    await first.markSeen()
    expect(await first.getState()).toEqual({ pending: true, unread: false })
    expect(await second.getState()).toEqual({ pending: true, unread: true })
    await first.dismiss()
    expect(await first.getState()).toEqual({ pending: false, unread: false })
    expect(await second.getState()).toEqual({ pending: true, unread: true })
    // Informational announcements do not read or change the opt-in settings.
    expect(chrome.storage.sync.get).not.toHaveBeenCalled()
    expect(chrome.storage.sync.set).not.toHaveBeenCalled()
  })

  it('notifies only subscribers for the changed feature', async () => {
    const first = createFeatureAnnouncement({ id: 'first-feature', introducedIn: '0.6.2' })
    const second = createFeatureAnnouncement({ id: 'second-feature', introducedIn: '0.6.2' })
    const changedFirst = vi.fn()
    const changedSecond = vi.fn()
    const stopFirst = first.subscribe(changedFirst)
    const stopSecond = second.subscribe(changedSecond)
    try {
      await first.markSeen()
      expect(changedFirst).toHaveBeenCalledOnce()
      expect(changedSecond).not.toHaveBeenCalled()
      stopFirst()
      await first.dismiss()
      expect(changedFirst).toHaveBeenCalledOnce()
    } finally {
      stopFirst()
      stopSecond()
    }
  })

  it('reuses existing subtitle announcement storage without a migration', async () => {
    await new Promise<void>(resolve => chrome.storage.local.set({
      'announcement:subtitle-navigation:eligible': true,
      'announcement:subtitle-navigation:seen': true,
    }, resolve))
    const feature = createFeatureAnnouncement({ id: 'subtitle-navigation', introducedIn: '0.6.2' })
    expect(await feature.getState()).toEqual({ pending: true, unread: false })
    await new Promise<void>(resolve => chrome.storage.local.set({ 'announcement:subtitle-navigation': true }, resolve))
    expect(await feature.getState()).toEqual({ pending: false, unread: false })
  })

  it.each(['', 'first-feature:seen', 'FirstFeature'])('rejects an ID that could collide with reserved storage keys: %s', id => {
    expect(() => createFeatureAnnouncement({ id, introducedIn: '0.6.2' })).toThrow('Invalid announcement ID')
  })
})
