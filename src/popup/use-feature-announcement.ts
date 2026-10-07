import { useEffect, useState } from 'react'
import type { FeatureAnnouncement } from '@/shared/feature-announcement'

export const useFeatureAnnouncement = (announcement: FeatureAnnouncement, visible: boolean) => {
  const [state, setState] = useState({ announcement, pending: false, unread: false })
  // A reused card must not mark a new feature seen using the old feature's state.
  const pending = state.announcement === announcement && state.pending
  const unread = state.announcement === announcement && state.unread
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    let request = 0
    const refresh = () => {
      const current = ++request
      void announcement.getState().then(value => {
        if (active && current === request) setState(previous => ({
          announcement,
          // Let users finish reading this visit, but never reopen a seen card.
          pending: value.pending && (value.unread || (previous.announcement === announcement && previous.pending)),
          unread: value.unread,
        }))
      }).catch(() => undefined)
    }
    const unsubscribe = announcement.subscribe(refresh)
    refresh()
    return () => { active = false; unsubscribe() }
  }, [announcement])

  useEffect(() => {
    // The card must have rendered, rather than only its storage read finishing.
    if (!visible || !pending || !unread) return
    let saving = false
    const markSeen = () => {
      if (saving || document.visibilityState === 'hidden') return
      saving = true
      void announcement.markSeen().catch(() => { saving = false })
    }
    markSeen()
    document.addEventListener('visibilitychange', markSeen)
    return () => document.removeEventListener('visibilitychange', markSeen)
  }, [announcement, visible, pending, unread])

  const dismiss = async () => {
    setBusy(true)
    setFailed(false)
    try {
      await announcement.dismiss()
      setState({ announcement, pending: false, unread: false })
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return { pending, unread, busy, failed, dismiss }
}
