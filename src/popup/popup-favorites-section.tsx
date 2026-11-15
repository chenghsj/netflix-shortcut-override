import type { PopupFavoriteSection } from './popup-favorites'
import { PopupShortcutGroup } from './popup-shortcut-group'

export function PopupFavoritesSection({ section, open, onOpenChange, disabled }: {
  section: PopupFavoriteSection
  open: boolean
  onOpenChange: (open: boolean) => void
  disabled: boolean
}) {
  return <PopupShortcutGroup label={section.title} open={open} onOpenChange={onOpenChange} disabled={disabled}>
    {section.entries.length ? <ol>
      {section.entries.map(entry => <li key={entry.id}
        className="flex min-h-10 items-center border-b border-border/50 py-2 ps-8 pe-2 text-sm font-normal leading-relaxed last:border-b-0 hover:bg-accent">
        {entry.label}
      </li>)}
    </ol> : <p className="py-2 ps-8 pe-2 text-sm font-normal leading-relaxed text-muted-foreground">{section.emptyDescription}</p>}
  </PopupShortcutGroup>
}
