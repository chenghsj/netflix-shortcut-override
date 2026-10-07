import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FeatureAnnouncementCard } from '@/popup/feature-announcement-card'
import { createFeatureAnnouncement } from '@/shared/feature-announcement'

const copy = (title: string) => ({
  title, description: 'Feature introduction', enable: 'Go to enable', dismiss: 'Dismiss', error: 'Please try again',
})
const upgrade = { reason: 'update', previousVersion: '0.6.1' } as chrome.runtime.InstalledDetails

describe('reusable announcement card', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('shows two independently labelled cards and dismisses only the selected feature', async () => {
    const first = createFeatureAnnouncement({ id: 'first-feature', introducedIn: '0.6.2' })
    const second = createFeatureAnnouncement({ id: 'second-feature', introducedIn: '0.6.2' })
    await first.recordInstall(upgrade, '0.6.2')
    await second.recordInstall(upgrade, '0.6.2')
    const enableSecond = vi.fn()
    render(<>
      <FeatureAnnouncementCard announcement={first} copy={copy('First feature')} onEnable={vi.fn()} />
      <FeatureAnnouncementCard announcement={second} copy={copy('Second feature')} onEnable={enableSecond} />
    </>)
    const firstCard = await screen.findByRole('region', { name: 'First feature' })
    const secondCard = await screen.findByRole('region', { name: 'Second feature' })
    expect(firstCard.getAttribute('aria-labelledby')).not.toBe(secondCard.getAttribute('aria-labelledby'))
    await waitFor(async () => {
      expect(await first.getState()).toEqual({ pending: true, unread: false })
      expect(await second.getState()).toEqual({ pending: true, unread: false })
    })
    fireEvent.click(within(firstCard).getByRole('button', { name: 'Dismiss' }))
    await waitFor(() => expect(firstCard).not.toBeInTheDocument())
    expect(secondCard).toBeInTheDocument()
    fireEvent.click(within(secondCard).getByRole('button', { name: 'Go to enable' }))
    expect(enableSecond).toHaveBeenCalledOnce()
    await waitFor(() => expect(secondCard).not.toBeInTheDocument())
    expect(await second.getState()).toEqual({ pending: false, unread: false })
  })

  it('does not mark an ineligible replacement feature seen using a previous card state', async () => {
    const first = createFeatureAnnouncement({ id: 'first-feature', introducedIn: '0.6.2' })
    const second = createFeatureAnnouncement({ id: 'second-feature', introducedIn: '0.7.0' })
    await first.recordInstall(upgrade, '0.6.2')
    const firstSeen = vi.spyOn(first, 'markSeen').mockRejectedValue(new Error('Storage unavailable'))
    const secondSeen = vi.spyOn(second, 'markSeen')
    const popup = render(<FeatureAnnouncementCard announcement={first} copy={copy('First feature')} onEnable={vi.fn()} />)
    await screen.findByRole('region', { name: 'First feature' })
    await waitFor(() => expect(firstSeen).toHaveBeenCalledOnce())
    popup.rerender(<FeatureAnnouncementCard announcement={second} copy={copy('Second feature')} onEnable={vi.fn()} />)
    await waitFor(() => expect(screen.queryByRole('region')).not.toBeInTheDocument())
    expect(secondSeen).not.toHaveBeenCalled()
    expect(await second.getState()).toEqual({ pending: false, unread: false })
  })
})
