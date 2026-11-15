import { ChevronDownIcon, GripVerticalIcon, PlusIcon, XIcon } from 'lucide-react'
import { useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'

import { Button } from '@/components/app-ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/app-ui/collapsible'
import { MultiChoiceCombobox } from '@/components/multi-choice-combobox'
import { DragHandle } from '@/components/drag-handle'
import { cn } from '@/lib/utils'
import { getCopy } from '@/shared/i18n'
import {
  normalizeSubtitleFavorites,
  type SubtitleFavorite,
} from '@/shared/subtitle-favorites'
import type { Locale } from '@/shared/shortcut-types'
import { useDragPreview } from '@/shared/use-drag-preview'
import { useDragReorder } from '@/shared/use-drag-reorder'
import { subtitleLanguageCatalog } from '@/shared/subtitle-language-catalog'

export type LanguageFavoritesCardProps<T extends SubtitleFavorite> = {
  favorites: readonly T[]
  locale: Locale
  onChange: (update: (current: T[]) => T[]) => void
  defaultOpen?: boolean
  collapsible?: boolean
  copy: ReturnType<typeof getCopy>['subtitleFavorites']
  id: string
  maxFavorites: number
  favoriteKey: (favorite: T) => string
  createFavorites: (language: string) => T[]
  formatLabel?: (favorite: T, languageLabel: string) => string
}

const englishNames = new Intl.DisplayNames('en', { type: 'language', fallback: 'none' })

export function LanguageFavoritesCard<T extends SubtitleFavorite>({
  favorites, locale, onChange, defaultOpen = true, collapsible = true, copy, id, maxFavorites,
  favoriteKey, createFavorites, formatLabel,
}: LanguageFavoritesCardProps<T>) {
  const sameFavorite = (left: T, right: T) => favoriteKey(left) === favoriteKey(right)
  const [selectedFavorites, setSelectedFavorites] = useState<T[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const { setDragPreview, removeDragPreview } = useDragPreview()
  const keyboardGrip = useRef<HTMLSpanElement | null>(null)
  useLayoutEffect(() => {
    keyboardGrip.current?.focus({ preventScroll: true })
    keyboardGrip.current = null
  }, [favorites])
  const names = useMemo(() => new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' }), [locale])
  const languages = useMemo(() => {
    const collator = new Intl.Collator(locale)
    return subtitleLanguageCatalog.map(({ value, keywords }) => ({
      value,
      label: names.of(value) ?? englishNames.of(value) ?? value,
      keywords,
    })).filter(option => option.label !== option.value).sort((left, right) => collator.compare(left.label, right.label))
  }, [locale, names])
  const atLimit = favorites.length >= maxFavorites
  const pendingFavorites = selectedFavorites
    .filter(selected => !favorites.some(favorite => sameFavorite(favorite, selected)))
    .slice(0, Math.max(0, maxFavorites - favorites.length))
  const selectionAtLimit = favorites.length + pendingFavorites.length >= maxFavorites

  const choice = (favorite: T, languageLabel: string, keywords: string[] = []) => ({
    value: favoriteKey(favorite),
    favorite,
    label: formatLabel ? formatLabel(favorite, languageLabel) : languageLabel,
    keywords,
    checked: favorites.some(item => sameFavorite(item, favorite)),
    disabled: favorites.some(item => sameFavorite(item, favorite)) ||
      (selectionAtLimit && !pendingFavorites.some(item => sameFavorite(item, favorite))),
  })

  const add = () => {
    if (!pendingFavorites.length) return
    onChange(current => {
      const additions = pendingFavorites.filter(selected => !current.some(favorite => sameFavorite(favorite, selected)))
        .slice(0, Math.max(0, maxFavorites - current.length))
      return additions.length ? [...current, ...additions] : current
    })
    setSelectedFavorites([])
    setPickerOpen(false)
  }

  const move = (
    favorite: T,
    destinationIndex: (current: T[], sourceIndex: number) => number,
  ) => {
    onChange(current => {
      const index = current.findIndex(item => sameFavorite(item, favorite))
      if (index < 0) return current
      const destination = destinationIndex(current, index)
      if (destination < 0 || destination >= current.length || destination === index) return current

      const next = [...current]
      next.splice(index, 1)
      next.splice(destination, 0, favorite)
      return next
    })
  }

  const sorting = useDragReorder({
    keys: favorites.map(favoriteKey),
    onReorder: (language, _from, to) => move(favorites.find(favorite => favoriteKey(favorite) === language)!, () => to),
    onFinish: removeDragPreview,
  })

  const startDrag = (event: DragEvent<HTMLSpanElement>, favorite: T) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
    const row = event.currentTarget.closest('li')
    if (row) setDragPreview(event, row)
    sorting.start(event, favoriteKey(favorite))
  }

  const moveWithKeyboard = (event: KeyboardEvent<HTMLSpanElement>, favorite: T, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

    event.preventDefault()
    const offset = event.key === 'ArrowUp' ? -1 : 1
    if (index + offset < 0 || index + offset >= favorites.length) return
    keyboardGrip.current = event.currentTarget
    move(favorite, (_, sourceIndex) => sourceIndex + offset)
  }

  return (
    <Collapsible defaultOpen={defaultOpen} open={collapsible ? undefined : true} asChild>
      <section className="group/language-favorites" role="group" aria-labelledby={`${id}-heading`}>
        <h3 id={`${id}-heading`} className={cn('app-shortcut-group-header border-border/20 text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ring group-data-[state=open]/language-favorites:border-b motion-reduce:transition-none', collapsible && 'hover:bg-accent has-focus-visible:bg-accent')}>
          {collapsible ? <CollapsibleTrigger aria-label={copy.title} className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left focus-visible:outline-none">
            <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 transition-transform group-data-[state=closed]/language-favorites:-rotate-90 motion-reduce:transition-none" />
            <span className="flex-1">{copy.title}</span>
          </CollapsibleTrigger> : <span className="flex min-h-11 items-center gap-2 px-3 py-2">
            <span className="flex-1">{copy.title}</span>
          </span>}
        </h3>
        <CollapsibleContent className="flex max-w-[calc(100cqw-4rem)] flex-col gap-3 p-3 data-[state=open]:overflow-visible data-[state=open]:animate-none data-[state=closed]:animate-none">
          <p className="text-sm text-muted-foreground">{favorites.length ? copy.description : copy.emptyDescription}</p>
          {favorites.length > 0 && (
            <ol {...sorting.listProps} className="divide-y divide-border border-y border-border">
              {favorites.map((favorite, index) => {
                const languageLabel = names.of(favorite.language) ?? englishNames.of(favorite.language) ?? favorite.language
                const label = formatLabel ? formatLabel(favorite, languageLabel) : languageLabel
                return (
                  <li key={favoriteKey(favorite)}
                    style={sorting.getRowStyle(favoriteKey(favorite))}
                    className="relative flex items-center gap-2 py-1 hover:bg-accent">
                    <DragHandle><span draggable tabIndex={0} role="group" aria-keyshortcuts="ArrowUp ArrowDown"
                      aria-label={copy.reorder.replace('{subtitle}', label)} title={copy.dragToReorder}
                      onDragStart={event => startDrag(event, favorite)}
                      onKeyDown={event => moveWithKeyboard(event, favorite, index)}>
                      <GripVerticalIcon aria-hidden="true" className="pointer-events-none size-4" />
                    </span></DragHandle>
                    <span className="min-w-0 flex-1 wrap-break-word text-sm">{label}</span>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground focus-visible:text-foreground"
                      aria-label={copy.remove.replace('{subtitle}', label)}
                      onClick={() => onChange(current => current.filter(item => !sameFavorite(item, favorite)))}>
                      <XIcon aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <MultiChoiceCombobox value={pendingFavorites.map(favoriteKey)}
              onChange={(_, option) => setSelectedFavorites(current => current.some(favorite => sameFavorite(favorite, option.favorite))
                ? current.filter(favorite => !sameFavorite(favorite, option.favorite)) : [...current, option.favorite])}
              label={copy.language}
              open={pickerOpen} onOpenChange={setPickerOpen}
              selectionLabel={copy.selectedCount.replace('{count}', String(pendingFavorites.length))}
              className="min-w-0 flex-1" options={languages.flatMap(option =>
                createFavorites(option.value).map(favorite => choice(favorite, `${option.label} (${option.value})`, option.keywords)))}
              placeholder={copy.chooseLanguage}
              search={{ placeholder: copy.search, empty: copy.noResults }} disabled={atLimit}
              createOptions={query => {
                const [normalized] = normalizeSubtitleFavorites([{ language: query }])
                return normalized ? createFavorites(normalized.language).map(favorite =>
                  choice(favorite, copy.useCode.replace('{code}', normalized.language))) : []
              }} />
            <Button type="button" variant="outline" className="w-32 tabular-nums" disabled={!pendingFavorites.length} onClick={add}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              {pendingFavorites.length ? copy.addCount.replace('{count}', String(pendingFavorites.length)) : copy.add}
            </Button>
          </div>
          {selectionAtLimit && (
            <p className="text-xs text-muted-foreground" role="status">
              {copy.limit.replace('{count}', String(maxFavorites))}
            </p>
          )}
        </CollapsibleContent>
      </section>
    </Collapsible>
  )
}
