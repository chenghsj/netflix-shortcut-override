import { useId } from 'react'
import { Badge } from '@/components/app-ui/badge'
import { Button } from '@/components/app-ui/button'
import { useFeatureAnnouncement } from '@/popup/use-feature-announcement'
import type { FeatureAnnouncementCopy } from '@/popup/feature-announcement-copy'
import type { FeatureAnnouncement } from '@/shared/feature-announcement'

export function FeatureAnnouncementCard({ announcement, copy, onEnable }: {
  announcement: FeatureAnnouncement
  copy: FeatureAnnouncementCopy
  onEnable: () => void
}) {
  const titleId = useId()
  const state = useFeatureAnnouncement(announcement, true)
  if (!state.pending) return null

  return (
    <section className="rounded-[var(--ui-card-radius)] border-2 border-border bg-accent p-4 shadow-md" aria-labelledby={titleId}>
      <div className="flex items-center gap-2">
        {state.unread && <Badge className="shrink-0 bg-brand-accent px-1.5 text-[10px] text-brand-accent-foreground">NEW</Badge>}
        <h2 id={titleId} className="font-heading text-sm font-semibold">{copy.title}</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <Button disabled={state.busy} onClick={() => { void state.dismiss(); onEnable() }}>{copy.enable}</Button>
        <Button variant="ghost" disabled={state.busy} aria-busy={state.busy}
          onClick={() => { void state.dismiss() }}>{copy.dismiss}</Button>
      </div>
      {state.failed && <p role="alert" className="mt-2 text-sm text-destructive">{copy.error}</p>}
    </section>
  )
}
